import "server-only";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/format";

export type ReceiveInput = {
  productId: string;
  warehouseId: string;
  binId?: string | null;
  lotNumber?: string | null;
  expiryDate?: Date | null;
  quantity: number;
  pricePurchase?: number | null;
  userId: string;
  reference?: string | null;
};

// Naskladnění: vytvoří novou šarži + pohyb RECEIPT (v transakci).
export async function receiveStock(input: ReceiveInput) {
  if (input.quantity <= 0) {
    throw new Error("Množství musí být kladné.");
  }
  return db.$transaction(async (tx) => {
    const batch = await tx.stockBatch.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        binId: input.binId ?? null,
        lotNumber: input.lotNumber ?? null,
        expiryDate: input.expiryDate ?? null,
        quantity: input.quantity,
        pricePurchase: input.pricePurchase ?? null,
      },
    });
    await tx.stockMovement.create({
      data: {
        batchId: batch.id,
        type: "RECEIPT",
        quantity: input.quantity,
        userId: input.userId,
        reference: input.reference ?? null,
      },
    });
    return batch;
  });
}

export type IssueInput = {
  productId: string;
  warehouseId?: string | null; // omezení na konkrétní sklad
  quantity: number;
  userId: string;
  type?: "ISSUE" | "WRITE_OFF"; // výdej nebo odpis
  reason?: string | null;
  reference?: string | null;
};

export type IssueAllocation = {
  batchId: string;
  lotNumber: string | null;
  expiryDate: Date | null;
  taken: number;
};

// Seřadí šarže metodou FEFO: nejdřív ty s expirací (vzestupně), pak bez expirace.
export function sortFEFO<
  T extends { expiryDate: Date | null; receivedAt: Date },
>(batches: T[]): T[] {
  return [...batches].sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      return a.expiryDate.getTime() - b.expiryDate.getTime();
    }
    if (a.expiryDate && !b.expiryDate) return -1;
    if (!a.expiryDate && b.expiryDate) return 1;
    return a.receivedAt.getTime() - b.receivedAt.getTime();
  });
}

// Náhled FEFO výdeje (bez zápisu) — pro zobrazení uživateli před potvrzením.
export async function previewIssueFEFO(
  productId: string,
  quantity: number,
  warehouseId?: string | null,
): Promise<{ allocations: IssueAllocation[]; shortage: number }> {
  const batches = await db.stockBatch.findMany({
    where: {
      productId,
      quantity: { gt: 0 },
      ...(warehouseId ? { warehouseId } : {}),
    },
  });
  const sorted = sortFEFO(batches);

  let remaining = quantity;
  const allocations: IssueAllocation[] = [];
  for (const b of sorted) {
    if (remaining <= 0) break;
    const available = toNumber(b.quantity);
    const taken = Math.min(available, remaining);
    if (taken > 0) {
      allocations.push({
        batchId: b.id,
        lotNumber: b.lotNumber,
        expiryDate: b.expiryDate,
        taken,
      });
      remaining -= taken;
    }
  }
  return { allocations, shortage: Math.max(0, remaining) };
}

// Výdej metodou FEFO: odečte z nejbližších expirací, vytvoří ISSUE pohyby (transakce).
export async function issueStockFEFO(input: IssueInput): Promise<IssueAllocation[]> {
  if (input.quantity <= 0) {
    throw new Error("Množství musí být kladné.");
  }
  return db.$transaction(async (tx) => {
    const batches = await tx.stockBatch.findMany({
      where: {
        productId: input.productId,
        quantity: { gt: 0 },
        ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
      },
    });
    const sorted = sortFEFO(batches);

    const total = sorted.reduce((s, b) => s + toNumber(b.quantity), 0);
    if (total < input.quantity) {
      throw new Error(
        `Nedostatek zásoby. Skladem ${total}, požadováno ${input.quantity}.`,
      );
    }

    let remaining = input.quantity;
    const allocations: IssueAllocation[] = [];
    for (const b of sorted) {
      if (remaining <= 0) break;
      const available = toNumber(b.quantity);
      const taken = Math.min(available, remaining);
      if (taken <= 0) continue;

      await tx.stockBatch.update({
        where: { id: b.id },
        data: { quantity: available - taken },
      });
      await tx.stockMovement.create({
        data: {
          batchId: b.id,
          type: input.type ?? "ISSUE",
          quantity: -taken,
          userId: input.userId,
          reason: input.reason ?? null,
          reference: input.reference ?? null,
        },
      });
      allocations.push({
        batchId: b.id,
        lotNumber: b.lotNumber,
        expiryDate: b.expiryDate,
        taken,
      });
      remaining -= taken;
    }
    return allocations;
  });
}
