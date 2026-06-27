"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { toNumber } from "@/lib/format";

export type InventoryItem = { batchId: string; counted: number };

export type InventoryReportRow = {
  batchId: string;
  productName: string;
  lotNumber: string | null;
  systemQty: number;
  countedQty: number;
  diff: number;
};

export type InventoryResult = {
  ok: boolean;
  error?: string;
  adjustedCount?: number;
  report?: InventoryReportRow[];
};

// Inventura: porovná napočítané množství se systémem, vytvoří ADJUSTMENT pohyby na rozdíl.
export async function applyInventory(
  items: InventoryItem[],
): Promise<InventoryResult> {
  const user = await requireRole("MANAGER");

  if (!items.length) return { ok: false, error: "Žádné položky k inventuře." };

  const report: InventoryReportRow[] = []; // jen rozdíly (pro UI)
  const allRows: InventoryReportRow[] = []; // vše napočítané (pro protokol)

  try {
    await db.$transaction(async (tx) => {
      for (const item of items) {
        if (
          item.counted == null ||
          Number.isNaN(item.counted) ||
          item.counted < 0
        ) {
          continue;
        }
        const batch = await tx.stockBatch.findUnique({
          where: { id: item.batchId },
          include: { product: { select: { name: true } } },
        });
        if (!batch) continue;

        const systemQty = toNumber(batch.quantity);
        const diff = item.counted - systemQty;
        const row: InventoryReportRow = {
          batchId: batch.id,
          productName: batch.product.name,
          lotNumber: batch.lotNumber,
          systemQty,
          countedQty: item.counted,
          diff,
        };
        allRows.push(row);
        if (diff === 0) continue;

        await tx.stockBatch.update({
          where: { id: batch.id },
          data: { quantity: item.counted },
        });
        await tx.stockMovement.create({
          data: {
            batchId: batch.id,
            type: "ADJUSTMENT",
            quantity: diff, // + přebytek / − manko
            userId: user.id,
            reason: "Inventura",
          },
        });
        report.push(row);
      }
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Inventura selhala.",
    };
  }

  // ulož relaci inventury (dohledatelnost — protokol kdykoliv zpětně)
  if (allRows.length > 0) {
    await db.inventorySession.create({
      data: {
        userId: user.id,
        adjustedCount: report.length,
        itemCount: allRows.length,
        reportJson: JSON.stringify(allRows),
      },
    });
  }

  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  revalidatePath("/inventura/historie");
  return { ok: true, adjustedCount: report.length, report };
}
