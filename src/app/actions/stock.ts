"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/dal";
import { sortFEFO } from "@/lib/movements";
import { toNumber } from "@/lib/format";

export type StockActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

// ---------- PŘÍJEM (vícepoložková příjemka) ----------

const ReceiveItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  lotNumber: z.string().trim().optional().nullable(),
  expiryDate: z.string().trim().optional().nullable(),
  supplierId: z.string().trim().optional().nullable(),
  pricePurchase: z.coerce.number().min(0).optional().nullable(),
  positionRow: z.string().trim().optional().nullable(),
  positionShelf: z.string().trim().optional().nullable(),
  positionRack: z.string().trim().optional().nullable(),
});

const ReceiveDocSchema = z.object({
  warehouseId: z.string().min(1, { error: "Vyber sklad." }),
  note: z.string().trim().optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  additionalCost: z.coerce.number().min(0).optional().nullable(),
  items: z.array(ReceiveItemSchema).min(1, { error: "Přidej alespoň jednu položku." }),
  attachment: z
    .object({
      base64: z.string().min(1),
      name: z.string().trim().optional(),
      mediaType: z.string().trim().optional(),
    })
    .optional()
    .nullable(),
});

export async function receiveDocument(
  payload: unknown,
): Promise<StockActionResult> {
  const user = await requireUser();
  const parsed = ReceiveDocSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatná data." };
  }
  const d = parsed.data;

  // Rozpočítání vedlejších nákladů do cen (proporčně dle hodnoty řádku).
  const addCost = toNumber(d.additionalCost ?? 0);
  const lineValues = d.items.map(
    (it) => toNumber(it.pricePurchase ?? 0) * it.quantity,
  );
  const totalValue = lineValues.reduce((s, v) => s + v, 0);

  let docId: string | null = null;
  try {
    await db.$transaction(async (tx) => {
      const doc = await tx.stockDocument.create({
        data: {
          type: "RECEIPT",
          warehouseId: d.warehouseId,
          userId: user.id,
          note: d.note ?? null,
          reference: d.reference ?? null,
          additionalCost: addCost || null,
        },
      });
      docId = doc.id;

      for (let i = 0; i < d.items.length; i++) {
        const it = d.items[i];
        let unitPrice = it.pricePurchase != null ? toNumber(it.pricePurchase) : null;
        // přidej poměrnou část vedlejších nákladů na kus
        if (addCost > 0 && unitPrice != null) {
          const share =
            totalValue > 0
              ? (lineValues[i] / totalValue) * addCost
              : addCost / d.items.length;
          unitPrice = unitPrice + share / it.quantity;
        }

        const batch = await tx.stockBatch.create({
          data: {
            productId: it.productId,
            warehouseId: d.warehouseId,
            supplierId: it.supplierId || null,
            lotNumber: it.lotNumber || null,
            expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
            quantity: it.quantity,
            pricePurchase: unitPrice,
            positionRow: it.positionRow || null,
            positionShelf: it.positionShelf || null,
            positionRack: it.positionRack || null,
          },
        });
        await tx.stockMovement.create({
          data: {
            batchId: batch.id,
            documentId: doc.id,
            type: "RECEIPT",
            quantity: it.quantity,
            userId: user.id,
            reference: d.reference || null,
          },
        });
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Naskladnění selhalo." };
  }

  // uložení přiloženého dokladu (fotka faktury) na disk + odkaz na doklad
  if (d.attachment && docId) {
    try {
      await saveDocumentAttachment(docId, d.attachment);
    } catch {
      // selhání přílohy nesmí shodit už proběhlé naskladnění
    }
  }

  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  revalidatePath("/doklady");
  return { ok: true, message: `Naskladněno ${d.items.length} položek.` };
}

// Uloží přílohu dokladu (fotka/sken faktury) do ./data/uploads a doplní cestu k dokladu.
async function saveDocumentAttachment(
  docId: string,
  att: { base64: string; name?: string; mediaType?: string },
): Promise<void> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const ext =
    att.mediaType?.includes("png") ? "png" :
    att.mediaType?.includes("webp") ? "webp" : "jpg";
  const dir = join(process.cwd(), "data", "uploads");
  await mkdir(dir, { recursive: true });
  const rel = join("data", "uploads", `${docId}.${ext}`);
  await writeFile(join(process.cwd(), rel), Buffer.from(att.base64, "base64"));
  await db.stockDocument.update({
    where: { id: docId },
    data: { attachmentPath: rel, attachmentName: att.name || `faktura.${ext}` },
  });
}

// ---------- VÝDEJ (vícepoložková výdejka, FEFO) ----------

const IssueItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
});

const IssueDocSchema = z.object({
  ordinaceId: z.string().trim().optional().nullable(),
  warehouseId: z.string().trim().optional().nullable(),
  type: z.enum(["ISSUE", "WRITE_OFF"]).optional(),
  note: z.string().trim().optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  reason: z.string().trim().optional().nullable(),
  items: z.array(IssueItemSchema).min(1, { error: "Přidej alespoň jednu položku." }),
});

export async function issueDocument(
  payload: unknown,
): Promise<StockActionResult> {
  const user = await requireUser();
  const parsed = IssueDocSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatná data." };
  }
  const d = parsed.data;
  const type = d.type ?? "ISSUE";

  try {
    await db.$transaction(async (tx) => {
      const doc = await tx.stockDocument.create({
        data: {
          type,
          warehouseId: d.warehouseId || null,
          ordinaceId: d.ordinaceId || null,
          userId: user.id,
          note: d.note ?? null,
          reference: d.reference ?? null,
        },
      });

      for (const it of d.items) {
        const batches = await tx.stockBatch.findMany({
          where: {
            productId: it.productId,
            quantity: { gt: 0 },
            ...(d.warehouseId ? { warehouseId: d.warehouseId } : {}),
          },
        });
        const sorted = sortFEFO(batches);
        const total = sorted.reduce((s, b) => s + toNumber(b.quantity), 0);
        if (total < it.quantity) {
          throw new Error(
            `Nedostatek zásoby pro jednu z položek (skladem ${total}, požadováno ${it.quantity}).`,
          );
        }
        let remaining = it.quantity;
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
              documentId: doc.id,
              type,
              quantity: -taken,
              userId: user.id,
              ordinaceId: d.ordinaceId || null,
              reason: d.reason || null,
              reference: d.reference || null,
            },
          });
          remaining -= taken;
        }
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Výdej selhal." };
  }

  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  revalidatePath("/spotreba");
  return {
    ok: true,
    message:
      type === "WRITE_OFF"
        ? `Odepsáno ${d.items.length} položek.`
        : `Vydáno ${d.items.length} položek metodou FEFO.`,
  };
}

// ---------- PŘESKLADNĚNÍ (převod mezi sklady) ----------

const TransferDocSchema = z.object({
  sourceWarehouseId: z.string().min(1, { error: "Vyber zdrojový sklad." }),
  targetWarehouseId: z.string().min(1, { error: "Vyber cílový sklad." }),
  note: z.string().trim().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().positive(),
  })).min(1, { error: "Přidej alespoň jednu položku." }),
});

export async function transferDocument(payload: unknown): Promise<StockActionResult> {
  const user = await requireUser();
  const parsed = TransferDocSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatná data." };
  }
  const d = parsed.data;
  if (d.sourceWarehouseId === d.targetWarehouseId) {
    return { ok: false, error: "Zdrojový a cílový sklad musí být různé." };
  }

  try {
    await db.$transaction(async (tx) => {
      const doc = await tx.stockDocument.create({
        data: {
          type: "TRANSFER",
          warehouseId: d.sourceWarehouseId,
          userId: user.id,
          note: d.note ?? null,
        },
      });

      for (const it of d.items) {
        const batches = await tx.stockBatch.findMany({
          where: { productId: it.productId, warehouseId: d.sourceWarehouseId, quantity: { gt: 0 } },
        });
        const sorted = sortFEFO(batches);
        const total = sorted.reduce((s, b) => s + toNumber(b.quantity), 0);
        if (total < it.quantity) {
          throw new Error(
            `Nedostatek na zdrojovém skladu (skladem ${total}, požadováno ${it.quantity}).`,
          );
        }
        let remaining = it.quantity;
        for (const b of sorted) {
          if (remaining <= 0) break;
          const avail = toNumber(b.quantity);
          const take = Math.min(avail, remaining);
          if (take <= 0) continue;

          // odebrání ze zdroje
          await tx.stockBatch.update({
            where: { id: b.id },
            data: { quantity: avail - take },
          });
          await tx.stockMovement.create({
            data: { batchId: b.id, documentId: doc.id, type: "TRANSFER", quantity: -take, userId: user.id, reason: "Přeskladnění" },
          });

          // příjem do cíle se zachováním šarže/expirace
          const target = await tx.stockBatch.create({
            data: {
              productId: it.productId,
              warehouseId: d.targetWarehouseId,
              lotNumber: b.lotNumber,
              expiryDate: b.expiryDate,
              supplierId: b.supplierId,
              pricePurchase: b.pricePurchase,
              quantity: take,
            },
          });
          await tx.stockMovement.create({
            data: { batchId: target.id, documentId: doc.id, type: "TRANSFER", quantity: take, userId: user.id, reason: "Přeskladnění" },
          });

          remaining -= take;
        }
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Přeskladnění selhalo." };
  }

  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  return { ok: true, message: `Přeskladněno ${d.items.length} položek.` };
}

// ---------- RYCHLÁ ÚPRAVA ZÁSOBY (+/- ze seznamu) ----------

export async function quickAdjustStock(
  productId: string,
  delta: number,
): Promise<StockActionResult> {
  const user = await requireUser();
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: "Neplatná změna." };
  }

  try {
    await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { batches: true },
      });
      if (!product) throw new Error("Položka nenalezena.");

      if (delta > 0) {
        // Přidání: zvýší existující šarži bez šarže/expirace, jinak vytvoří novou.
        let warehouseId: string | null =
          product.defaultWarehouseId ??
          product.batches[0]?.warehouseId ??
          null;
        if (!warehouseId) {
          const wh = await tx.warehouse.findFirst({ where: { active: true } });
          warehouseId = wh?.id ?? null;
        }
        if (!warehouseId) throw new Error("Není dostupný žádný sklad.");

        const plain = product.batches.find(
          (b) =>
            b.warehouseId === warehouseId &&
            !b.lotNumber &&
            !b.expiryDate &&
            toNumber(b.quantity) >= 0,
        );
        let batchId: string;
        if (plain) {
          await tx.stockBatch.update({
            where: { id: plain.id },
            data: { quantity: toNumber(plain.quantity) + delta },
          });
          batchId = plain.id;
        } else {
          const created = await tx.stockBatch.create({
            data: {
              productId: product.id,
              warehouseId,
              quantity: delta,
              pricePurchase: toNumber(product.pricePurchase) || null,
            },
          });
          batchId = created.id;
        }
        await tx.stockMovement.create({
          data: {
            batchId,
            type: "ADJUSTMENT",
            quantity: delta,
            userId: user.id,
            reason: "Rychlá úprava",
          },
        });
      } else {
        // Ubrání: FEFO odečet (nezáporné výsledné množství).
        let toRemove = -delta;
        const sorted = sortFEFO(product.batches.filter((b) => toNumber(b.quantity) > 0));
        const total = sorted.reduce((s, b) => s + toNumber(b.quantity), 0);
        if (total <= 0) throw new Error("Skladem není žádné množství.");
        if (toRemove > total) toRemove = total; // ořež na dostupné

        for (const b of sorted) {
          if (toRemove <= 0) break;
          const avail = toNumber(b.quantity);
          const take = Math.min(avail, toRemove);
          await tx.stockBatch.update({
            where: { id: b.id },
            data: { quantity: avail - take },
          });
          await tx.stockMovement.create({
            data: {
              batchId: b.id,
              type: "ADJUSTMENT",
              quantity: -take,
              userId: user.id,
              reason: "Rychlá úprava",
            },
          });
          toRemove -= take;
        }
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Úprava selhala." };
  }

  revalidatePath("/produkty");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ADMIN oprava: nastaví přesný stav skladu na targetQty (rozdíl zaúčtuje jako ADJUSTMENT).
// Auditní stopa zůstává (pohyby se nemažou). Jen pro ADMIN.
export async function setStockQuantity(
  productId: string,
  targetQty: number,
): Promise<StockActionResult> {
  const user = await requireRole("ADMIN");
  if (!Number.isFinite(targetQty) || targetQty < 0) {
    return { ok: false, error: "Zadej platné množství (0 nebo víc)." };
  }
  try {
    await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { batches: true },
      });
      if (!product) throw new Error("Položka nenalezena.");
      const current = product.batches.reduce((s, b) => s + toNumber(b.quantity), 0);
      const delta = Math.round((targetQty - current) * 1000) / 1000;
      if (delta === 0) return;
      const reason = "Oprava stavu (admin)";

      if (delta > 0) {
        let warehouseId: string | null =
          product.defaultWarehouseId ?? product.batches[0]?.warehouseId ?? null;
        if (!warehouseId) {
          const wh = await tx.warehouse.findFirst({ where: { active: true } });
          warehouseId = wh?.id ?? null;
        }
        if (!warehouseId) throw new Error("Není dostupný žádný sklad.");
        const plain = product.batches.find(
          (b) => b.warehouseId === warehouseId && !b.lotNumber && !b.expiryDate && toNumber(b.quantity) >= 0,
        );
        let batchId: string;
        if (plain) {
          await tx.stockBatch.update({
            where: { id: plain.id },
            data: { quantity: toNumber(plain.quantity) + delta },
          });
          batchId = plain.id;
        } else {
          const created = await tx.stockBatch.create({
            data: {
              productId: product.id,
              warehouseId,
              quantity: delta,
              pricePurchase: toNumber(product.pricePurchase) || null,
            },
          });
          batchId = created.id;
        }
        await tx.stockMovement.create({
          data: { batchId, type: "ADJUSTMENT", quantity: delta, userId: user.id, reason },
        });
      } else {
        let toRemove = -delta;
        const sorted = sortFEFO(product.batches.filter((b) => toNumber(b.quantity) > 0));
        const total = sorted.reduce((s, b) => s + toNumber(b.quantity), 0);
        if (total <= 0) throw new Error("Skladem není žádné množství k odebrání.");
        if (toRemove > total) toRemove = total;
        for (const b of sorted) {
          if (toRemove <= 0) break;
          const avail = toNumber(b.quantity);
          const take = Math.min(avail, toRemove);
          await tx.stockBatch.update({ where: { id: b.id }, data: { quantity: avail - take } });
          await tx.stockMovement.create({
            data: { batchId: b.id, type: "ADJUSTMENT", quantity: -take, userId: user.id, reason },
          });
          toRemove -= take;
        }
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Oprava selhala." };
  }
  revalidatePath("/produkty");
  revalidatePath(`/produkty/${productId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
