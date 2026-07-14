"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { ensureCategory } from "@/app/actions/categories";
import { UNITS } from "@/lib/enums";

export type ProductFormState = {
  error?: string;
} | undefined;

const LevelSchema = z.object({
  warehouseId: z.string().min(1),
  minQuantity: z.coerce.number().min(0),
  optimalQuantity: z.coerce.number().min(0),
});

const ProductSchema = z.object({
  name: z.string().min(2, { error: "Zadej název položky." }).trim(),
  sku: z.string().min(1, { error: "Zadej interní kód (M-kód / SKU)." }).trim(),
  manufacturerCode: z.string().trim().optional(),
  distributorCode: z.string().trim().optional(),
  category: z.string().trim().optional(),
  description: z.string().trim().optional(),
  unit: z.enum(UNITS, { error: "Vyber měrnou jednotku." }),
  piecesPerPackage: z.coerce.number().positive({ error: "Počet kusů v balení musí být kladný." }),
  packageLabel: z.string().trim().optional(),
  defaultWarehouseId: z.string().trim().optional(),
  defaultSupplierId: z.string().trim().optional(),
  minQuantity: z.coerce.number().min(0),
  optimalQuantity: z.coerce.number().min(0),
  reorderQuantity: z.coerce.number().min(0),
  pricePurchase: z.coerce.number().min(0, { error: "Cena nesmí být záporná." }),
  vatRate: z.coerce.number().min(0).max(100),
  isMedicalDevice: z.boolean(),
  trackBatches: z.boolean(),
  trackLevels: z.boolean(),
  storageLocation: z.string().trim().optional(),
  active: z.boolean(),
  barcodes: z.array(z.string().trim().min(1)),
  levels: z.array(LevelSchema),
});

function parse(formData: FormData) {
  const bool = (k: string) =>
    formData.get(k) === "on" || formData.get(k) === "true";
  let barcodes: unknown = [];
  let levels: unknown = [];
  try {
    barcodes = JSON.parse(String(formData.get("barcodesJson") || "[]"));
  } catch {}
  try {
    levels = JSON.parse(String(formData.get("levelsJson") || "[]"));
  } catch {}

  return ProductSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    manufacturerCode: formData.get("manufacturerCode") || undefined,
    distributorCode: formData.get("distributorCode") || undefined,
    category: formData.get("category") || undefined,
    description: formData.get("description") || undefined,
    unit: formData.get("unit"),
    piecesPerPackage: formData.get("piecesPerPackage") ?? 1,
    packageLabel: formData.get("packageLabel") || undefined,
    defaultWarehouseId: formData.get("defaultWarehouseId") || undefined,
    defaultSupplierId: formData.get("defaultSupplierId") || undefined,
    minQuantity: formData.get("minQuantity") ?? 0,
    optimalQuantity: formData.get("optimalQuantity") ?? 0,
    reorderQuantity: formData.get("reorderQuantity") ?? 0,
    pricePurchase: formData.get("pricePurchase") ?? 0,
    vatRate: formData.get("vatRate") ?? 21,
    isMedicalDevice: bool("isMedicalDevice"),
    trackBatches: bool("trackBatches"),
    trackLevels: bool("trackLevels"),
    storageLocation: formData.get("storageLocation") || undefined,
    active: bool("active"),
    barcodes: Array.isArray(barcodes) ? barcodes : [],
    levels: Array.isArray(levels) ? levels : [],
  });
}

type Parsed = z.infer<typeof ProductSchema>;

function scalarData(d: Parsed) {
  return {
    name: d.name,
    sku: d.sku,
    manufacturerCode: d.manufacturerCode || null,
    distributorCode: d.distributorCode || null,
    category: d.category || null,
    description: d.description || null,
    unit: d.unit,
    piecesPerPackage: d.piecesPerPackage,
    packageLabel: d.packageLabel || null,
    defaultWarehouseId: d.defaultWarehouseId || null,
    defaultSupplierId: d.defaultSupplierId || null,
    minQuantity: d.minQuantity,
    optimalQuantity: d.optimalQuantity,
    reorderQuantity: d.reorderQuantity,
    pricePurchase: d.pricePurchase,
    vatRate: d.vatRate,
    isMedicalDevice: d.isMedicalDevice,
    trackBatches: d.trackBatches,
    trackLevels: d.trackLevels,
    storageLocation: d.storageLocation || null,
    active: d.active,
    // uložení plné karty = člověk ji prošel → už není „k doplnění"
    needsReview: false,
  };
}

function isUniqueError(e: unknown) {
  const s = String(e);
  return s.includes("Unique") || s.includes("sku");
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const d = parsed.data;
  try {
    await db.product.create({
      data: {
        ...scalarData(d),
        barcodes: { create: d.barcodes.map((code) => ({ code })) },
        levels: {
          create: d.levels.map((l) => ({
            warehouseId: l.warehouseId,
            minQuantity: l.minQuantity,
            optimalQuantity: l.optimalQuantity,
          })),
        },
      },
    });
  } catch (e) {
    if (isUniqueError(e)) return { error: "Položka s tímto M-kódem už existuje." };
    throw e;
  }
  await ensureCategory(d.category);
  revalidatePath("/produkty");
  redirect("/produkty");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const d = parsed.data;
  try {
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: scalarData(d) });
      // EANy: smaž a vytvoř znovu (jednoduché a spolehlivé)
      await tx.productBarcode.deleteMany({ where: { productId: id } });
      if (d.barcodes.length) {
        await tx.productBarcode.createMany({
          data: d.barcodes.map((code) => ({ productId: id, code })),
        });
      }
      // Hladiny per sklad: smaž a vytvoř znovu
      await tx.productWarehouseLevel.deleteMany({ where: { productId: id } });
      if (d.levels.length) {
        await tx.productWarehouseLevel.createMany({
          data: d.levels.map((l) => ({
            productId: id,
            warehouseId: l.warehouseId,
            minQuantity: l.minQuantity,
            optimalQuantity: l.optimalQuantity,
          })),
        });
      }
    });
  } catch (e) {
    if (isUniqueError(e)) return { error: "Položka s tímto M-kódem už existuje." };
    throw e;
  }
  await ensureCategory(d.category);
  revalidatePath("/produkty");
  revalidatePath(`/produkty/${id}`);
  redirect(`/produkty/${id}`);
}

export type ProductActionResult = { ok: boolean; error?: string; deactivated?: boolean; message?: string };

// Hromadná úprava vybraných položek — nastaví jen vyplněná pole.
export async function bulkUpdateProducts(
  ids: string[],
  patch: {
    category?: string;
    defaultSupplierId?: string;
    minQuantity?: number;
    optimalQuantity?: number;
    pricePurchase?: number;
    trackLevels?: boolean;
  },
): Promise<ProductActionResult> {
  await requireRole("MANAGER");
  if (!ids.length) return { ok: false, error: "Nic nevybráno." };

  const data: {
    category?: string | null;
    defaultSupplierId?: string | null;
    minQuantity?: number;
    optimalQuantity?: number;
    pricePurchase?: number;
    trackLevels?: boolean;
  } = {};
  if (patch.category !== undefined) data.category = patch.category || null;
  if (patch.defaultSupplierId !== undefined) data.defaultSupplierId = patch.defaultSupplierId || null;
  if (patch.minQuantity !== undefined && patch.minQuantity >= 0) data.minQuantity = patch.minQuantity;
  if (patch.optimalQuantity !== undefined && patch.optimalQuantity >= 0) data.optimalQuantity = patch.optimalQuantity;
  if (patch.pricePurchase !== undefined && patch.pricePurchase >= 0) data.pricePurchase = patch.pricePurchase;
  if (patch.trackLevels !== undefined) data.trackLevels = patch.trackLevels;

  if (Object.keys(data).length === 0) return { ok: false, error: "Vyber, co se má změnit." };

  await db.product.updateMany({ where: { id: { in: ids } }, data });
  if (data.category) await ensureCategory(data.category);
  revalidatePath("/produkty");
  return { ok: true, message: `Upraveno ${ids.length} položek.` };
}

// Hromadný přepočet ceny „za balení → za kus" u vybraných balených položek (piecesPerPackage>1).
// Vydělí referenční cenu produktu i ceny jednotlivých šarží počtem ks v balení.
// POZOR: spouštět jen jednou (opětovné spuštění by cenu vydělilo znovu).
export async function recalcPackagePrices(
  ids: string[],
): Promise<{ ok: boolean; fixed?: number; skipped?: number; error?: string }> {
  await requireRole("MANAGER");
  const clean = [...new Set(ids.filter(Boolean))];
  if (clean.length === 0) return { ok: false, error: "Nic nevybráno." };

  const round2 = (x: number) => Math.round(x * 100) / 100;
  const prods = await db.product.findMany({
    where: { id: { in: clean } },
    select: { id: true, piecesPerPackage: true, pricePurchase: true },
  });

  let fixed = 0;
  let skipped = 0;
  for (const p of prods) {
    const ppp = p.piecesPerPackage;
    if (!(ppp > 1)) { skipped++; continue; } // nebalené necháme být
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: p.id },
        data: { pricePurchase: round2(Number(p.pricePurchase) / ppp) },
      });
      const batches = await tx.stockBatch.findMany({
        where: { productId: p.id, pricePurchase: { not: null } },
        select: { id: true, pricePurchase: true },
      });
      for (const b of batches) {
        await tx.stockBatch.update({
          where: { id: b.id },
          data: { pricePurchase: round2(Number(b.pricePurchase) / ppp) },
        });
      }
    });
    fixed++;
  }

  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  return { ok: true, fixed, skipped };
}

// Bezpečné odvození velikosti balení z názvu — jen z jednoznačných značek „ks".
// Záměrně NEbere rozměry (40 x 19 x 15) ani „4x300g" apod. Vrátí 0, když nic jistého.
const PACK_PATTERNS = [
  /(\d+)\s*ks\s*\/\s*bal/i, // "5ks/bal"
  /blistr\s*(\d+)\s*ks/i, // "blistr 6ks"
  /\/\s*bal\.?\s*(\d+)\s*ks/i, // "/bal. 5ks"
  /\((\d+)\s*ks\)/i, // "(36ks)", "(100 ks)"
  /(\d+)\s*ks\s*\)/i, // "…5ks)"
];
function detectPackFromName(name: string): number {
  for (const re of PACK_PATTERNS) {
    const m = name.match(re);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 1) return n;
    }
  }
  return 0;
}

// Hromadně: u vybraných NEbalených položek (ppp=1) odvodí balení z názvu, nastaví ho
// a přepočítá cenu (za balení → za kus), včetně cen šarží. Idempotentní: balené přeskočí.
export async function fixPackagingFromName(
  ids: string[],
): Promise<{ ok: boolean; fixed?: number; skipped?: number; samples?: string[]; error?: string }> {
  await requireRole("MANAGER");
  const clean = [...new Set(ids.filter(Boolean))];
  if (clean.length === 0) return { ok: false, error: "Nic nevybráno." };

  const round2 = (x: number) => Math.round(x * 100) / 100;
  const prods = await db.product.findMany({
    where: { id: { in: clean } },
    select: { id: true, name: true, piecesPerPackage: true, pricePurchase: true },
  });

  let fixed = 0;
  let skipped = 0;
  const samples: string[] = [];
  for (const p of prods) {
    if (p.piecesPerPackage > 1) { skipped++; continue; } // už balené — nesaháme (necháme cenu být)
    const pack = detectPackFromName(p.name);
    if (pack <= 1) { skipped++; continue; }
    const oldPrice = Number(p.pricePurchase);
    const newPrice = round2(oldPrice / pack);
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: p.id },
        data: { piecesPerPackage: pack, packageLabel: "balení", pricePurchase: newPrice },
      });
      const batches = await tx.stockBatch.findMany({
        where: { productId: p.id, pricePurchase: { not: null } },
        select: { id: true, pricePurchase: true },
      });
      for (const b of batches) {
        await tx.stockBatch.update({
          where: { id: b.id },
          data: { pricePurchase: round2(Number(b.pricePurchase) / pack) },
        });
      }
    });
    if (samples.length < 6) samples.push(`${p.name.slice(0, 34)} → ${pack} ks/bal, ${oldPrice}→${newPrice} Kč/ks`);
    fixed++;
  }

  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  return { ok: true, fixed, skipped, samples };
}

// Rychlá úprava základních polí přímo z detailu karty.
export async function updateProductQuick(
  id: string,
  data: {
    minQuantity: number;
    optimalQuantity: number;
    pricePurchase: number; // cena za kus (bez DPH)
    piecesPerPackage: number;
    packageLabel: string | null;
    trackLevels?: boolean;
    // Přepíše novou cenou za kus i ceny naskladněných šarží (oprava špatně
    // importovaných cen — hodnota skladu se jinak dál počítá ze staré ceny šarže).
    applyPriceToBatches?: boolean;
  },
): Promise<ProductActionResult> {
  await requireRole("MANAGER");
  const num = (v: number) => (Number.isFinite(v) && v >= 0 ? v : 0);
  const unitPrice = num(data.pricePurchase);
  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        minQuantity: num(data.minQuantity),
        optimalQuantity: num(data.optimalQuantity),
        pricePurchase: unitPrice,
        piecesPerPackage: data.piecesPerPackage > 0 ? data.piecesPerPackage : 1,
        packageLabel: data.piecesPerPackage > 1 ? (data.packageLabel || "balení") : null,
        ...(data.trackLevels !== undefined ? { trackLevels: data.trackLevels } : {}),
        needsReview: false,
      },
    });
    if (data.applyPriceToBatches) {
      await tx.stockBatch.updateMany({
        where: { productId: id },
        data: { pricePurchase: unitPrice },
      });
    }
  });
  revalidatePath("/produkty");
  revalidatePath(`/produkty/${id}`);
  return { ok: true };
}

// Zapne/vypne aktivitu produktu (měkké „smazání").
export async function toggleProductActive(id: string): Promise<ProductActionResult> {
  await requireRole("MANAGER");
  const p = await db.product.findUnique({ where: { id }, select: { active: true } });
  if (!p) return { ok: false, error: "Položka nenalezena." };
  await db.product.update({ where: { id }, data: { active: !p.active } });
  revalidatePath("/produkty");
  revalidatePath(`/produkty/${id}`);
  return { ok: true };
}

// Tvrdé smazání — jen pokud položka nemá žádné šarže ani pohyby (jinak nabídni deaktivaci).
export async function deleteProduct(id: string): Promise<ProductActionResult> {
  await requireRole("MANAGER");
  const [batches, movements] = await Promise.all([
    db.stockBatch.count({ where: { productId: id } }),
    db.stockMovement.count({ where: { batch: { productId: id } } }),
  ]);
  if (batches > 0 || movements > 0) {
    // Má historii → nemažeme (audit), jen deaktivujeme.
    await db.product.update({ where: { id }, data: { active: false } });
    revalidatePath("/produkty");
    return {
      ok: true,
      deactivated: true,
      error:
        "Položka má skladovou historii, proto byla jen deaktivována (kvůli dohledatelnosti se nemaže).",
    };
  }
  await db.$transaction(async (tx) => {
    await tx.productBarcode.deleteMany({ where: { productId: id } });
    await tx.productWarehouseLevel.deleteMany({ where: { productId: id } });
    await tx.supplierProductRef.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });
  revalidatePath("/produkty");
  return { ok: true };
}

// Tvrdé smazání položek VČETNĚ skladové historie (pohyby, šarže, kódy, hladiny, položky objednávek).
// Určeno pro úklid před ostrým spuštěním / čistou re-migraci z Evidentistu. Nevratné.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function purgeProducts(ids: string[]): Promise<void> {
  for (const part of chunk(ids, 200)) {
    await db.$transaction([
      db.stockMovement.deleteMany({ where: { batch: { productId: { in: part } } } }),
      db.stockBatch.deleteMany({ where: { productId: { in: part } } }),
      db.purchaseOrderItem.deleteMany({ where: { productId: { in: part } } }),
      db.supplierProductRef.deleteMany({ where: { productId: { in: part } } }),
      db.productWarehouseLevel.deleteMany({ where: { productId: { in: part } } }),
      db.productBarcode.deleteMany({ where: { productId: { in: part } } }),
      db.product.deleteMany({ where: { id: { in: part } } }),
    ]);
  }
}

export async function bulkDeleteProducts(
  ids: string[],
): Promise<{ ok: boolean; deleted?: number; error?: string }> {
  await requireRole("MANAGER");
  const clean = [...new Set(ids.filter(Boolean))];
  if (clean.length === 0) return { ok: false, error: "Nic nevybráno." };
  await purgeProducts(clean);
  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  return { ok: true, deleted: clean.length };
}

export async function deleteAllProducts(): Promise<{ ok: boolean; deleted?: number; error?: string }> {
  await requireRole("MANAGER");
  const all = await db.product.findMany({ select: { id: true } });
  await purgeProducts(all.map((p) => p.id));
  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  return { ok: true, deleted: all.length };
}
