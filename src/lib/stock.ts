import "server-only";
import { db } from "@/lib/db";
import { toNumber, daysUntil } from "@/lib/format";
import { EXPIRY_WARN_DAYS } from "@/lib/config";

export type ProductStockRow = {
  id: string;
  name: string;
  sku: string;
  codes: string[];
  category: string | null;
  unit: string;
  minQuantity: number;
  optimalQuantity: number;
  reorderQuantity: number;
  pricePurchase: number;
  vatRate: number;
  trackBatches: boolean;
  isMedicalDevice: boolean;
  active: boolean;
  defaultWarehouseName: string | null;
  defaultSupplierName: string | null;
  totalQty: number;
  value: number; // totalQty × cena
  belowMin: boolean;
  nearestExpiry: Date | null;
  expiringSoon: boolean; // některá šarže expiruje do EXPIRY_WARN_DAYS
  expired: boolean; // některá šarže už po expiraci (a má množství)
  // rozpad po skladech (pro filtr skladu v seznamu)
  stockByWh: { warehouseId: string; qty: number; value: number }[];
  levelsByWh: { warehouseId: string; min: number; opt: number }[];
};

// Načte produkty včetně spočítané celkové zásoby a stavových příznaků.
export async function getProductsWithStock(opts?: {
  activeOnly?: boolean;
}): Promise<ProductStockRow[]> {
  const products = await db.product.findMany({
    where: opts?.activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
    include: {
      defaultWarehouse: { select: { name: true } },
      defaultSupplier: { select: { name: true } },
      barcodes: { select: { code: true } },
      levels: { select: { warehouseId: true, minQuantity: true, optimalQuantity: true } },
      batches: {
        select: { quantity: true, expiryDate: true, pricePurchase: true, warehouseId: true },
      },
    },
  });

  return products.map((p) => {
    let totalQty = 0;
    let value = 0;
    let nearestExpiry: Date | null = null;
    let expiringSoon = false;
    let expired = false;
    const whMap = new Map<string, { qty: number; value: number }>();

    for (const b of p.batches) {
      const qty = toNumber(b.quantity);
      if (qty <= 0) continue;
      totalQty += qty;
      // hodnota: cena šarže, jinak nákupní cena produktu
      const unitPrice =
        b.pricePurchase != null ? toNumber(b.pricePurchase) : toNumber(p.pricePurchase);
      value += qty * unitPrice;

      const cur = whMap.get(b.warehouseId) ?? { qty: 0, value: 0 };
      cur.qty += qty;
      cur.value += qty * unitPrice;
      whMap.set(b.warehouseId, cur);

      if (b.expiryDate) {
        if (!nearestExpiry || b.expiryDate < nearestExpiry) {
          nearestExpiry = b.expiryDate;
        }
        const d = daysUntil(b.expiryDate);
        if (d != null) {
          if (d < 0) expired = true;
          else if (d <= EXPIRY_WARN_DAYS) expiringSoon = true;
        }
      }
    }

    // Efektivní hladiny: součet per-sklad hladin, jinak globální default.
    const minQuantity =
      p.levels.length > 0
        ? p.levels.reduce((s, l) => s + toNumber(l.minQuantity), 0)
        : toNumber(p.minQuantity);
    const optimalQuantity =
      p.levels.length > 0
        ? p.levels.reduce((s, l) => s + toNumber(l.optimalQuantity), 0)
        : toNumber(p.optimalQuantity);

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      codes: [
        ...p.barcodes.map((b) => b.code),
        p.manufacturerCode,
        p.distributorCode,
      ].filter((c): c is string => !!c),
      category: p.category,
      unit: p.unit,
      minQuantity,
      optimalQuantity,
      reorderQuantity: toNumber(p.reorderQuantity),
      pricePurchase: toNumber(p.pricePurchase),
      vatRate: toNumber(p.vatRate),
      trackBatches: p.trackBatches,
      isMedicalDevice: p.isMedicalDevice,
      active: p.active,
      defaultWarehouseName: p.defaultWarehouse?.name ?? null,
      defaultSupplierName: p.defaultSupplier?.name ?? null,
      totalQty,
      value,
      belowMin: totalQty < minQuantity,
      nearestExpiry,
      expiringSoon,
      expired,
      stockByWh: [...whMap.entries()].map(([warehouseId, v]) => ({
        warehouseId,
        qty: v.qty,
        value: v.value,
      })),
      levelsByWh: p.levels.map((l) => ({
        warehouseId: l.warehouseId,
        min: toNumber(l.minQuantity),
        opt: toNumber(l.optimalQuantity),
      })),
    };
  });
}

export type ExpiringBatchRow = {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  lotNumber: string | null;
  expiryDate: Date;
  quantity: number;
  warehouseName: string;
  daysLeft: number; // záporné = po expiraci
};

// Šarže s množstvím > 0, které expirují do `withinDays` dní nebo už propadly.
export async function getExpiringBatches(
  withinDays: number,
): Promise<ExpiringBatchRow[]> {
  const limit = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  const batches = await db.stockBatch.findMany({
    where: {
      quantity: { gt: 0 },
      expiryDate: { not: null, lte: limit },
    },
    orderBy: { expiryDate: "asc" },
    include: {
      product: { select: { name: true, unit: true } },
      warehouse: { select: { name: true } },
    },
  });
  return batches.map((b) => ({
    id: b.id,
    productId: b.productId,
    productName: b.product.name,
    unit: b.product.unit,
    lotNumber: b.lotNumber,
    expiryDate: b.expiryDate as Date,
    quantity: toNumber(b.quantity),
    warehouseName: b.warehouse.name,
    daysLeft: daysUntil(b.expiryDate) ?? 0,
  }));
}

export type StockAlert = {
  productId: string;
  productName: string;
  unit: string;
  warehouseName: string | null; // null = celkově (globální min)
  currentQty: number;
  minQty: number;
  optimalQty: number;
  reorderQuantity: number;
  supplierName: string | null;
};

// Upozornění na podlimitní zásobu — respektuje per-sklad hladiny, jinak globální min.
export async function getStockAlerts(): Promise<StockAlert[]> {
  const products = await db.product.findMany({
    where: { active: true },
    include: {
      defaultSupplier: { select: { name: true } },
      levels: { include: { warehouse: { select: { name: true } } } },
      batches: { where: { quantity: { gt: 0 } }, select: { warehouseId: true, quantity: true } },
    },
  });

  const alerts: StockAlert[] = [];
  for (const p of products) {
    const byWh = new Map<string, number>();
    let total = 0;
    for (const b of p.batches) {
      const q = toNumber(b.quantity);
      total += q;
      byWh.set(b.warehouseId, (byWh.get(b.warehouseId) ?? 0) + q);
    }

    const activeLevels = p.levels.filter((l) => toNumber(l.minQuantity) > 0);
    if (activeLevels.length > 0) {
      for (const l of activeLevels) {
        const qty = byWh.get(l.warehouseId) ?? 0;
        const min = toNumber(l.minQuantity);
        if (qty < min) {
          alerts.push({
            productId: p.id,
            productName: p.name,
            unit: p.unit,
            warehouseName: l.warehouse.name,
            currentQty: qty,
            minQty: min,
            optimalQty: toNumber(l.optimalQuantity),
            reorderQuantity: toNumber(p.reorderQuantity),
            supplierName: p.defaultSupplier?.name ?? null,
          });
        }
      }
    } else if (toNumber(p.minQuantity) > 0 && total < toNumber(p.minQuantity)) {
      alerts.push({
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        warehouseName: null,
        currentQty: total,
        minQty: toNumber(p.minQuantity),
        optimalQty: toNumber(p.optimalQuantity),
        reorderQuantity: toNumber(p.reorderQuantity),
        supplierName: p.defaultSupplier?.name ?? null,
      });
    }
  }
  return alerts;
}

export type ConsumptionFilter = {
  from?: Date;
  to?: Date;
  ordinaceId?: string;
};

export type ConsumptionResult = {
  totalValue: number;
  totalQtyLines: number;
  byProduct: { productId: string; name: string; unit: string; qty: number; value: number }[];
  byOrdinace: { ordinaceId: string | null; name: string; value: number }[];
};

// Spotřeba materiálu (pohyby ISSUE) za období, volitelně po ordinaci.
export async function getConsumption(
  filter: ConsumptionFilter,
): Promise<ConsumptionResult> {
  const movements = await db.stockMovement.findMany({
    where: {
      type: "ISSUE",
      ...(filter.ordinaceId ? { ordinaceId: filter.ordinaceId } : {}),
      createdAt: {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      },
    },
    include: {
      ordinace: { select: { name: true } },
      batch: {
        select: {
          pricePurchase: true,
          product: { select: { id: true, name: true, unit: true, pricePurchase: true } },
        },
      },
    },
  });

  const byProduct = new Map<string, { name: string; unit: string; qty: number; value: number }>();
  const byOrdinace = new Map<string, { name: string; value: number }>();
  let totalValue = 0;

  for (const m of movements) {
    const qty = Math.abs(toNumber(m.quantity));
    const unitPrice =
      m.batch.pricePurchase != null
        ? toNumber(m.batch.pricePurchase)
        : toNumber(m.batch.product.pricePurchase);
    const value = qty * unitPrice;
    totalValue += value;

    const pid = m.batch.product.id;
    const pcur = byProduct.get(pid) ?? {
      name: m.batch.product.name,
      unit: m.batch.product.unit,
      qty: 0,
      value: 0,
    };
    pcur.qty += qty;
    pcur.value += value;
    byProduct.set(pid, pcur);

    const oid = m.ordinaceId ?? "—";
    const ocur = byOrdinace.get(oid) ?? {
      name: m.ordinace?.name ?? "Nezadáno",
      value: 0,
    };
    ocur.value += value;
    byOrdinace.set(oid, ocur);
  }

  return {
    totalValue,
    totalQtyLines: movements.length,
    byProduct: [...byProduct.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.value - a.value),
    byOrdinace: [...byOrdinace.entries()]
      .map(([ordinaceId, v]) => ({
        ordinaceId: ordinaceId === "—" ? null : ordinaceId,
        ...v,
      }))
      .sort((a, b) => b.value - a.value),
  };
}

// Celková hodnota skladu (volitelně po skladech).
export async function getInventoryValue(): Promise<number> {
  const batches = await db.stockBatch.findMany({
    where: { quantity: { gt: 0 } },
    select: { quantity: true, pricePurchase: true, product: { select: { pricePurchase: true } } },
  });
  return batches.reduce((sum, b) => {
    const price =
      b.pricePurchase != null ? toNumber(b.pricePurchase) : toNumber(b.product.pricePurchase);
    return sum + toNumber(b.quantity) * price;
  }, 0);
}

// ---------- Karty k doplnění (nekompletní nastavení) ----------

export type IncompleteProduct = {
  id: string;
  name: string;
  missing: string[]; // co chybí doplnit
  fromScan: boolean; // karta vznikla ze skenu dokladu
};

// Projde aktivní karty a vrátí ty, kterým chybí důležité údaje.
// Hladiny min/opt se kontrolují jen když je trackLevels = true.
export async function getIncompleteProducts(): Promise<IncompleteProduct[]> {
  const products = await db.product.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      pricePurchase: true,
      minQuantity: true,
      optimalQuantity: true,
      trackLevels: true,
      defaultSupplierId: true,
      needsReview: true,
      barcodes: { select: { id: true } },
      levels: { select: { minQuantity: true, optimalQuantity: true } },
    },
  });

  const out: IncompleteProduct[] = [];
  for (const p of products) {
    const missing: string[] = [];
    if (p.barcodes.length === 0) missing.push("čárový kód");
    if (p.trackLevels) {
      const min =
        p.levels.length > 0
          ? p.levels.reduce((s, l) => s + toNumber(l.minQuantity), 0)
          : toNumber(p.minQuantity);
      const opt =
        p.levels.length > 0
          ? p.levels.reduce((s, l) => s + toNumber(l.optimalQuantity), 0)
          : toNumber(p.optimalQuantity);
      if (min <= 0 || opt <= 0) missing.push("min./opt.");
    }
    if (toNumber(p.pricePurchase) <= 0) missing.push("cena");
    if (!p.defaultSupplierId) missing.push("dodavatel");

    if (missing.length > 0 || p.needsReview) {
      out.push({ id: p.id, name: p.name, missing, fromScan: p.needsReview });
    }
  }
  return out;
}
