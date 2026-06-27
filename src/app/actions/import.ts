"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { parseEvidentistFile, type ImportRecord } from "@/lib/import-evidentist";

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

  const skus = records.map((r) => r.sku);
  const existingRows = await db.product.findMany({
    where: { sku: { in: skus } },
    select: { sku: true },
  });
  const existing = existingRows.length;

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

  let created = 0;
  let updated = 0;
  let stockSet = 0;
  let skippedStock = 0;

  for (const rec of records) {
    const supplierId = await resolveSupplier(rec.supplierName);

    const existing = await db.product.findUnique({
      where: { sku: rec.sku },
      select: { id: true, _count: { select: { batches: true } } },
    });

    let productId: string;
    if (existing) {
      await db.product.update({
        where: { id: existing.id },
        data: {
          name: rec.name,
          manufacturerCode: rec.manufacturerCode,
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
      const p = await db.product.create({
        data: {
          name: rec.name,
          sku: rec.sku,
          manufacturerCode: rec.manufacturerCode,
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
