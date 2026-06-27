"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { extractDeliveryNote, isAiConfigured } from "@/lib/ai-extract";
import { toNumber } from "@/lib/format";

export type ScannedItem = {
  name: string;
  code: string | null;
  quantity: number;
  unitPriceExclVat: number | null; // přepočteno bez DPH
  // párování
  productId: string | null;
  productName: string | null;
  productSku: string | null;
  storedPrice: number | null; // uložená nákupní cena bez DPH
  diffPct: number | null; // rozdíl proti uložené ceně v %
  matchedByAlias?: boolean; // napárováno přes naučený alias dodavatele
  packGuess: number | null; // AI návrh počtu ks v balení (z názvu)
  // u NEnapárovaných řádků: tip na podobnou existující kartu (jiný název)
  suggestion: { productId: string; productName: string; productSku: string } | null;
};

export type ScanResult = {
  ok: boolean;
  error?: string;
  supplierName?: string | null;
  pricesIncludeVat?: boolean;
  items?: ScannedItem[];
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function tokens(s: string | null | undefined): string[] {
  return norm(s)
    .split(/[^a-z0-9á-žěščřžýáíéúůóťď]+/i)
    .filter((t) => t.length >= 3);
}

function diffPctOf(unitExcl: number | null, stored: number | null): number | null {
  if (stored && stored > 0 && unitExcl != null) {
    return Math.round(((unitExcl - stored) / stored) * 1000) / 10;
  }
  return null;
}

// Najde dodavatele podle názvu z dokladu (volné porovnání). null pokud nejisté.
async function resolveSupplierId(supplierName: string | null | undefined): Promise<string | null> {
  const n = norm(supplierName);
  if (n.length < 3) return null;
  const suppliers = await db.supplier.findMany({ select: { id: true, name: true } });
  const hit = suppliers.find(
    (s) => norm(s.name).includes(n) || n.includes(norm(s.name)),
  );
  return hit?.id ?? null;
}

export async function scanDeliveryNote(payload: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}): Promise<ScanResult> {
  await requireUser();
  if (!isAiConfigured()) {
    return {
      ok: false,
      error:
        "AI sken není nakonfigurován. Doplň ANTHROPIC_API_KEY do .env (viz README).",
    };
  }

  let note;
  try {
    note = await extractDeliveryNote(payload.imageBase64, payload.mediaType);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sken selhal." };
  }

  // Katalog + naučené aliasy pro párování.
  const [products, refs] = await Promise.all([
    db.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        sku: true,
        manufacturerCode: true,
        distributorCode: true,
        pricePurchase: true,
        vatRate: true,
        barcodes: { select: { code: true } },
      },
    }),
    db.supplierProductRef.findMany({ select: { productId: true, code: true, name: true } }),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));

  function matchProduct(name: string, code: string | null) {
    const c = norm(code);
    const n = norm(name);

    // 1) naučený alias (nejsilnější signál — člověk to už jednou potvrdil)
    const aliasHit = refs.find(
      (r) => (c && norm(r.code) === c) || (n.length >= 3 && norm(r.name) === n),
    );
    if (aliasHit) {
      const p = productById.get(aliasHit.productId);
      if (p) return { product: p, byAlias: true };
    }

    // 2) shoda kódu na kartě
    if (c) {
      const byCode = products.find(
        (p) =>
          norm(p.sku) === c ||
          norm(p.manufacturerCode) === c ||
          norm(p.distributorCode) === c ||
          p.barcodes.some((b) => norm(b.code) === c),
      );
      if (byCode) return { product: byCode, byAlias: false };
    }

    // 3) volná shoda názvu
    if (n.length >= 4) {
      const byName = products.find(
        (p) => norm(p.name).includes(n) || n.includes(norm(p.name)),
      );
      if (byName) return { product: byName, byAlias: false };
    }
    return null;
  }

  // Tip na podobnou kartu (když se přesně nenapáruje) — podle překryvu slov názvu.
  function suggestProduct(name: string) {
    const ta = new Set(tokens(name));
    if (ta.size === 0) return null;
    let best: (typeof products)[number] | null = null;
    let bestScore = 0;
    for (const p of products) {
      const tb = tokens(p.name);
      if (tb.length === 0) continue;
      let hit = 0;
      let maxLen = 0;
      for (const t of tb) {
        if (ta.has(t)) {
          hit++;
          if (t.length > maxLen) maxLen = t.length;
        }
      }
      const sc = hit / tb.length; // jak velká část názvu karty se našla ve faktuře
      if (hit > 0 && maxLen >= 4 && sc > bestScore) {
        bestScore = sc;
        best = p;
      }
    }
    return bestScore >= 0.5 ? best : null;
  }

  const items: ScannedItem[] = note.items.map((it) => {
    const m = matchProduct(it.name, it.code);
    const matched = m?.product ?? null;
    const sug = matched ? null : suggestProduct(it.name);
    const vat = matched ? toNumber(matched.vatRate) : 21;

    let unitExcl: number | null = it.unitPrice;
    if (unitExcl != null && note.pricesIncludeVat) {
      unitExcl = unitExcl / (1 + vat / 100);
    }
    unitExcl = unitExcl != null ? Math.round(unitExcl * 100) / 100 : null;

    const stored = matched ? toNumber(matched.pricePurchase) : null;

    return {
      name: it.name,
      code: it.code,
      quantity: it.quantity,
      unitPriceExclVat: unitExcl,
      productId: matched?.id ?? null,
      productName: matched?.name ?? null,
      productSku: matched?.sku ?? null,
      storedPrice: stored,
      diffPct: diffPctOf(unitExcl, stored),
      matchedByAlias: m?.byAlias ?? false,
      packGuess: it.packGuess && it.packGuess > 1 ? it.packGuess : null,
      suggestion: sug
        ? { productId: sug.id, productName: sug.name, productSku: sug.sku }
        : null,
    };
  });

  return {
    ok: true,
    supplierName: note.supplierName,
    pricesIncludeVat: note.pricesIncludeVat,
    items,
  };
}

// ---------- Naučené párování: ulož, jak dodavatel pojmenoval naši kartu ----------

export type MatchResult = {
  ok: boolean;
  error?: string;
  productId?: string;
  productName?: string;
  productSku?: string;
  storedPrice?: number | null;
};

export async function matchScanLine(input: {
  productId: string;
  code: string | null;
  name: string;
  supplierName?: string | null;
  renameTo?: string | null; // volitelně přepiš název karty na fakturní
}): Promise<MatchResult> {
  await requireUser();
  const product = await db.product.findUnique({
    where: { id: input.productId },
    select: { id: true, name: true, sku: true, pricePurchase: true },
  });
  if (!product) return { ok: false, error: "Karta nenalezena." };

  const supplierId = await resolveSupplierId(input.supplierName);
  // ulož alias (ať příště páruje automaticky)
  await db.supplierProductRef.create({
    data: {
      productId: product.id,
      supplierId,
      code: input.code || null,
      name: input.name || null,
    },
  });

  // volitelné přejmenování karty (člověk to musí potvrdit v UI)
  let finalName = product.name;
  if (input.renameTo && input.renameTo.trim().length >= 2) {
    finalName = input.renameTo.trim();
    await db.product.update({ where: { id: product.id }, data: { name: finalName } });
    revalidatePath("/produkty");
    revalidatePath(`/produkty/${product.id}`);
  }

  return {
    ok: true,
    productId: product.id,
    productName: finalName,
    productSku: product.sku,
    storedPrice: toNumber(product.pricePurchase),
  };
}

// ---------- Založení nové karty z řádku dokladu ----------

function slugifySku(base: string): string {
  const s = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return s || "ITEM";
}

export async function createProductFromScan(input: {
  name: string;
  code: string | null;
  unitPriceExclVat: number | null;
  supplierName?: string | null;
  packGuess?: number | null;
}): Promise<MatchResult> {
  await requireRole("MANAGER");
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Název je příliš krátký." };

  // jedinečné SKU: z kódu, jinak ze jména; při kolizi přidej příponu
  let baseSku = input.code?.trim() ? slugifySku(input.code) : slugifySku(name);
  let sku = baseSku;
  for (let i = 2; i < 50; i++) {
    const exists = await db.product.findUnique({ where: { sku } });
    if (!exists) break;
    sku = `${baseSku}-${i}`;
  }

  const supplierId = await resolveSupplierId(input.supplierName);
  const price = input.unitPriceExclVat != null ? input.unitPriceExclVat : 0;
  const ppp = input.packGuess && input.packGuess > 1 ? input.packGuess : 1;

  const product = await db.product.create({
    data: {
      name,
      sku,
      manufacturerCode: input.code || null,
      pricePurchase: price,
      vatRate: 21,
      defaultSupplierId: supplierId,
      unit: "PCS",
      piecesPerPackage: ppp,
      packageLabel: ppp > 1 ? "balení" : null,
      needsReview: true, // karta vznikla ze skenu — připomenout doplnění
      // rovnou ulož alias dodavatele
      supplierRefs: {
        create: [{ supplierId, code: input.code || null, name }],
      },
    },
  });

  revalidatePath("/produkty");
  return {
    ok: true,
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    storedPrice: price,
  };
}

// ---------- Přepis referenční (výchozí) ceny na kartě ----------

export async function updateReferencePrice(
  productId: string,
  newPriceExclVat: number,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("MANAGER");
  if (!Number.isFinite(newPriceExclVat) || newPriceExclVat < 0) {
    return { ok: false, error: "Neplatná cena." };
  }
  await db.product.update({
    where: { id: productId },
    data: { pricePurchase: newPriceExclVat },
  });
  revalidatePath("/produkty");
  revalidatePath(`/produkty/${productId}`);
  return { ok: true };
}
