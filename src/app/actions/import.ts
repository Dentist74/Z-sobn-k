"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { parseEvidentistFile, type ImportRecord } from "@/lib/import-evidentist";
import { parseLevelsFile, type LevelRecord } from "@/lib/import-levels";

export type ImportParseResult = {
  ok: boolean;
  error?: string;
  records?: ImportRecord[];
  summary?: { total: number; existing: number; created: number };
};

export type ImportRunResult = {
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
  stockSet?: number;
  skippedStock?: number;
};

// 1) Načti a naparsuj soubor, vrať náhled + kolik je nových / existujících (dle M-kódu).
export async function parseImport(base64: string): Promise<ImportParseResult> {
  await requireRole("MANAGER");
  let records: ImportRecord[];
  try {
    const buffer = Buffer.from(base64, "base64");
    records = await parseEvidentistFile(buffer);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Soubor se nepodařilo načíst." };
  }
  if (records.length === 0) {
    return { ok: false, error: "V souboru nejsou žádné položky (zkontroluj formát exportu)." };
  }

  // Kolik už existuje: podle M-kódu, u položek bez M-kódu podle názvu.
  const skus = records.map((r) => r.sku).filter(Boolean);
  const [skuRows, nameRows] = await Promise.all([
    db.product.findMany({ where: { sku: { in: skus } }, select: { sku: true } }),
    db.product.findMany({ select: { name: true } }),
  ]);
  const norm = (x: string) => x.trim().toLowerCase().replace(/\s+/g, " ");
  const skuSet = new Set(skuRows.map((r) => r.sku));
  const nameSet = new Set(nameRows.map((r) => norm(r.name)));
  let existing = 0;
  for (const r of records) {
    if (r.sku ? skuSet.has(r.sku) : nameSet.has(norm(r.name))) existing++;
  }

  return {
    ok: true,
    records,
    summary: { total: records.length, existing, created: records.length - existing },
  };
}

// 2) Proveď import dle zvolených voleb.
export async function runImport(
  records: ImportRecord[],
  options: {
    importStock: boolean;
    importPrice: boolean;
    importVat: boolean;
    warehouseId: string;
  },
): Promise<ImportRunResult> {
  const user = await requireRole("MANAGER");
  if (!Array.isArray(records) || records.length === 0) {
    return { ok: false, error: "Není co importovat." };
  }
  if (options.importStock && !options.warehouseId) {
    return { ok: false, error: "Pro import zásob vyber sklad." };
  }

  // dodavatelé: cache názvů → id (vytvoř chybějící)
  const suppliers = await db.supplier.findMany({ select: { id: true, name: true } });
  const supplierByName = new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s.id]));
  async function resolveSupplier(name: string | null): Promise<string | null> {
    const key = (name ?? "").trim().toLowerCase();
    if (!key) return null;
    const hit = supplierByName.get(key);
    if (hit) return hit;
    const created = await db.supplier.create({ data: { name: name!.trim() } });
    supplierByName.set(key, created.id);
    return created.id;
  }

  // existující čárové kódy (ať nevytvoříme duplicitu / nespadneme na unique)
  const existingCodes = new Set(
    (await db.productBarcode.findMany({ select: { code: true } })).map((b) => b.code),
  );

  // mapy pro párování (M-kód / název) + generování unikátního M-kódu u položek bez něj
  const allProducts = await db.product.findMany({ select: { id: true, sku: true, name: true } });
  const norm = (x: string) => x.trim().toLowerCase().replace(/\s+/g, " ");
  const bySku = new Map<string, string>();
  const nameCount = new Map<string, number>();
  const nameId = new Map<string, string>();
  const usedSkus = new Set<string>();
  for (const p of allProducts) {
    if (p.sku) { bySku.set(p.sku.trim().toLowerCase(), p.id); usedSkus.add(p.sku); }
    const k = norm(p.name);
    nameCount.set(k, (nameCount.get(k) ?? 0) + 1);
    nameId.set(k, p.id);
  }
  const slug = (x: string) =>
    x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  function genSku(name: string): string {
    const base = ("EV-" + slug(name).slice(0, 22)).replace(/-+$/, "") || "EV-polozka";
    let sku = base;
    let i = 2;
    while (usedSkus.has(sku)) { sku = `${base}-${i}`; i++; }
    usedSkus.add(sku);
    return sku;
  }

  let created = 0;
  let updated = 0;
  let stockSet = 0;
  let skippedStock = 0;

  for (const rec of records) {
    const supplierId = await resolveSupplier(rec.supplierName);

    // spáruj: podle M-kódu; u položek bez M-kódu podle jednoznačného názvu
    const skuKey = rec.sku ? rec.sku.trim().toLowerCase() : "";
    let matchedId = skuKey ? bySku.get(skuKey) : undefined;
    if (!matchedId && !rec.sku) {
      const k = norm(rec.name);
      if (nameCount.get(k) === 1) matchedId = nameId.get(k);
    }
    const existing = matchedId
      ? await db.product.findUnique({
          where: { id: matchedId },
          select: { id: true, _count: { select: { batches: true } } },
        })
      : null;

    let productId: string;
    if (existing) {
      await db.product.update({
        where: { id: existing.id },
        data: {
          name: rec.name,
          manufacturerCode: rec.manufacturerCode,
          distributorCode: rec.distributorCode,
          defaultSupplierId: supplierId,
          piecesPerPackage: rec.piecesPerPackage,
          packageLabel: rec.packaged ? "balení" : null,
          ...(options.importPrice ? { pricePurchase: rec.priceExclVat } : {}),
          ...(options.importVat ? { vatRate: rec.vatRate } : {}),
        },
      });
      productId = existing.id;
      updated++;
    } else {
      const newSku = rec.sku || genSku(rec.name);
      const p = await db.product.create({
        data: {
          name: rec.name,
          sku: newSku,
          manufacturerCode: rec.manufacturerCode,
          distributorCode: rec.distributorCode,
          defaultSupplierId: supplierId,
          unit: "PCS",
          piecesPerPackage: rec.piecesPerPackage,
          packageLabel: rec.packaged ? "balení" : null,
          pricePurchase: options.importPrice ? rec.priceExclVat : 0,
          vatRate: options.importVat ? rec.vatRate : 21,
        },
        select: { id: true },
      });
      productId = p.id;
      // ať se případný další stejný název v téže dávce spáruje na tenhle nový záznam
      const k = norm(rec.name);
      nameCount.set(k, (nameCount.get(k) ?? 0) + 1);
      nameId.set(k, productId);
      bySku.set(newSku.trim().toLowerCase(), productId);
      created++;
    }

    // čárové kódy — přidej jen ty, co ještě nikde nejsou
    for (const code of rec.barcodes) {
      if (existingCodes.has(code)) continue;
      existingCodes.add(code);
      await db.productBarcode.create({ data: { productId, code } });
    }

    // počáteční stav zásob (jen když je volba zapnutá a karta ještě zásobu nemá)
    if (options.importStock && rec.stockQty > 0) {
      if (existing && existing._count.batches > 0) {
        skippedStock++;
      } else {
        const batch = await db.stockBatch.create({
          data: {
            productId,
            warehouseId: options.warehouseId,
            supplierId,
            quantity: rec.stockQty,
            pricePurchase: options.importPrice ? rec.priceExclVat : null,
          },
        });
        await db.stockMovement.create({
          data: {
            batchId: batch.id,
            type: "ADJUSTMENT",
            quantity: rec.stockQty,
            userId: user.id,
            reason: "Počáteční stav (import z Evidentistu)",
          },
        });
        stockSet++;
      }
    }
  }

  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  return { ok: true, created, updated, stockSet, skippedStock };
}

// ---------- Import hladin min/opt (podle M-kódu) ----------

export type LevelsParseResult = {
  ok: boolean;
  error?: string;
  records?: LevelRecord[];
};

export async function parseLevels(base64: string): Promise<LevelsParseResult> {
  await requireRole("MANAGER");
  try {
    const records = await parseLevelsFile(Buffer.from(base64, "base64"));
    if (records.length === 0) {
      return { ok: false, error: "V souboru nejsou řádky (zkontroluj sloupce Název / M-kód / Minimum / Optimum)." };
    }
    return { ok: true, records };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Soubor se nepodařilo načíst." };
  }
}

// Doplní hladiny: nejdřív spáruje podle M-kódu (sku), zbytek podle přesného názvu.
export async function runLevelsImport(
  records: LevelRecord[],
): Promise<{ ok: boolean; updated?: number; notFound?: number; ambiguous?: number; error?: string }> {
  await requireRole("MANAGER");
  if (!Array.isArray(records) || records.length === 0) return { ok: false, error: "Není co importovat." };

  const products = await db.product.findMany({ select: { id: true, sku: true, name: true } });
  const norm = (x: string) => x.trim().toLowerCase().replace(/\s+/g, " ");
  const bySku = new Map<string, string>();
  const byName = new Map<string, string[]>();
  for (const p of products) {
    if (p.sku) bySku.set(p.sku.trim().toLowerCase(), p.id);
    const k = norm(p.name);
    byName.set(k, [...(byName.get(k) ?? []), p.id]);
  }

  const done = new Set<string>();
  let updated = 0;
  let notFound = 0;
  let ambiguous = 0;

  const apply = async (id: string, r: LevelRecord) => {
    await db.product.update({
      where: { id },
      data: { minQuantity: Math.max(0, r.min), optimalQuantity: Math.max(0, r.opt), trackLevels: true },
    });
    done.add(id);
    updated++;
  };

  // 1) párování podle M-kódu
  const rest: LevelRecord[] = [];
  for (const r of records) {
    const sku = r.sku ? r.sku.trim().toLowerCase() : "";
    const id = sku ? bySku.get(sku) : undefined;
    if (id) {
      if (!done.has(id)) await apply(id, r);
    } else {
      rest.push(r);
    }
  }

  // 2) zbytek podle přesného názvu (jen když je shoda jednoznačná)
  for (const r of rest) {
    const nm = r.name ? norm(r.name) : "";
    const fresh = (nm ? byName.get(nm) ?? [] : []).filter((id) => !done.has(id));
    if (fresh.length === 1) await apply(fresh[0], r);
    else if (fresh.length > 1) ambiguous++;
    else notFound++;
  }

  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  return { ok: true, updated, notFound, ambiguous };
}
