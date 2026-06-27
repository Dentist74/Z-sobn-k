"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { toNumber } from "@/lib/format";
import { isSmtpConfigured, sendMail } from "@/lib/mailer";
import { UNIT_LABELS, type Unit } from "@/lib/enums";

export type OrderActionResult = { ok: boolean; error?: string; message?: string };

// Ruční vytvoření objednávek: řádky se seskupí podle dodavatele → 1 DRAFT na dodavatele.
export async function createManualOrders(
  lines: { productId: string; supplierId: string; quantity: number; unitPrice: number }[],
): Promise<OrderActionResult> {
  const user = await requireRole("MANAGER");
  const valid = lines.filter((l) => l.productId && l.supplierId && l.quantity > 0);
  if (valid.length === 0) {
    return { ok: false, error: "Přidej alespoň jednu položku s množstvím a dodavatelem." };
  }

  const bySupplier = new Map<string, typeof valid>();
  for (const l of valid) {
    const arr = bySupplier.get(l.supplierId) ?? [];
    arr.push(l);
    bySupplier.set(l.supplierId, arr);
  }

  let created = 0;
  for (const [supplierId, items] of bySupplier) {
    await db.purchaseOrder.create({
      data: {
        supplierId,
        status: "DRAFT",
        createdById: user.id,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice || null,
          })),
        },
      },
    });
    created++;
  }

  revalidatePath("/objednavky");
  return {
    ok: true,
    message:
      created === 1
        ? "Vytvořen návrh objednávky."
        : `Vytvořeno ${created} návrhů (rozděleno podle dodavatelů).`,
  };
}

// Odeslání objednávky e-mailem dodavateli (CSV příloha + text), pak označí jako odeslané.
export async function sendOrderEmail(
  orderId: string,
  note: string,
): Promise<OrderActionResult> {
  await requireRole("MANAGER");
  if (!isSmtpConfigured()) {
    return {
      ok: false,
      error: "Odesílání e-mailů není nakonfigurováno (doplň SMTP do .env).",
    };
  }
  const order = await db.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      supplier: { select: { name: true, orderEmail: true } },
      items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
    },
  });
  if (!order) return { ok: false, error: "Objednávka nenalezena." };
  if (order.status !== "DRAFT") return { ok: false, error: "Odeslat lze jen návrh." };
  if (order.items.length === 0) return { ok: false, error: "Objednávka nemá položky." };
  if (!order.supplier.orderEmail) {
    return { ok: false, error: "Dodavatel nemá nastavený objednávkový e-mail (v Nastavení → Dodavatelé)." };
  }

  // CSV příloha (oddělovač ; + BOM kvůli Excelu)
  const rows = [
    ["Položka", "M-kód", "Množství", "Jednotka", "Cena/ks bez DPH"],
    ...order.items.map((it) => [
      it.product.name,
      it.product.sku,
      String(toNumber(it.quantity)),
      UNIT_LABELS[it.product.unit as Unit] ?? it.product.unit,
      String(toNumber(it.unitPrice)),
    ]),
  ];
  const csv =
    "﻿" +
    rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");

  const textLines = [
    note.trim() || "Dobrý den,\n\nobjednáváme níže uvedené položky (viz příloha).",
    "",
    ...order.items.map(
      (it) =>
        `- ${it.product.name} (${it.product.sku}): ${toNumber(it.quantity)} ${UNIT_LABELS[it.product.unit as Unit] ?? it.product.unit}`,
    ),
    "",
    "Děkujeme.",
  ];

  try {
    await sendMail({
      to: order.supplier.orderEmail,
      subject: `Objednávka – ${order.supplier.name}`,
      text: textLines.join("\n"),
      attachments: [
        { filename: `objednavka-${orderId.slice(0, 8)}.csv`, content: csv, contentType: "text/csv; charset=utf-8" },
      ],
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Odeslání selhalo." };
  }

  await db.purchaseOrder.update({
    where: { id: orderId },
    data: { status: "SENT", sentAt: new Date() },
  });
  revalidatePath("/objednavky");
  revalidatePath(`/objednavky/${orderId}`);
  return { ok: true, message: `Objednávka odeslána na ${order.supplier.orderEmail}.` };
}

// Vygeneruje NÁVRHY objednávek (DRAFT) z docházejících položek, seskupené dle dodavatele.
export async function generateOrderProposals(): Promise<OrderActionResult> {
  const user = await requireRole("MANAGER");

  const products = await db.product.findMany({
    where: { active: true, defaultSupplierId: { not: null } },
    include: {
      levels: { select: { minQuantity: true } },
      batches: { where: { quantity: { gt: 0 } }, select: { quantity: true } },
    },
  });

  // skupina dodavatel → položky pod minimem
  const bySupplier = new Map<
    string,
    { productId: string; quantity: number; unitPrice: number }[]
  >();

  for (const p of products) {
    const total = p.batches.reduce((s, b) => s + toNumber(b.quantity), 0);
    const min =
      p.levels.length > 0
        ? p.levels.reduce((s, l) => s + toNumber(l.minQuantity), 0)
        : toNumber(p.minQuantity);
    if (min <= 0 || total >= min) continue;

    const reorder = toNumber(p.reorderQuantity);
    const optimal = toNumber(p.optimalQuantity);
    const qty =
      reorder > 0 ? reorder : optimal > total ? optimal - total : Math.max(min - total, 1);

    const sid = p.defaultSupplierId as string;
    const arr = bySupplier.get(sid) ?? [];
    arr.push({ productId: p.id, quantity: qty, unitPrice: toNumber(p.pricePurchase) });
    bySupplier.set(sid, arr);
  }

  if (bySupplier.size === 0) {
    return { ok: false, error: "Žádné docházející položky s přiřazeným dodavatelem." };
  }

  let created = 0;
  for (const [supplierId, items] of bySupplier) {
    await db.purchaseOrder.create({
      data: {
        supplierId,
        status: "DRAFT",
        createdById: user.id,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice || null,
          })),
        },
      },
    });
    created++;
  }

  revalidatePath("/objednavky");
  return { ok: true, message: `Vytvořeno ${created} návrhů objednávek.` };
}

export async function setOrderItemQuantity(
  itemId: string,
  quantity: number,
): Promise<OrderActionResult> {
  await requireRole("MANAGER");
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { ok: false, error: "Neplatné množství." };
  }
  const item = await db.purchaseOrderItem.findUnique({
    where: { id: itemId },
    include: { order: true },
  });
  if (!item) return { ok: false, error: "Položka nenalezena." };
  if (item.order.status !== "DRAFT") {
    return { ok: false, error: "Upravovat lze jen návrh (DRAFT)." };
  }
  if (quantity === 0) {
    await db.purchaseOrderItem.delete({ where: { id: itemId } });
  } else {
    await db.purchaseOrderItem.update({ where: { id: itemId }, data: { quantity } });
  }
  revalidatePath(`/objednavky/${item.orderId}`);
  return { ok: true };
}

export async function removeOrderItem(itemId: string): Promise<OrderActionResult> {
  await requireRole("MANAGER");
  const item = await db.purchaseOrderItem.findUnique({
    where: { id: itemId },
    include: { order: true },
  });
  if (!item) return { ok: false, error: "Položka nenalezena." };
  if (item.order.status !== "DRAFT") {
    return { ok: false, error: "Upravovat lze jen návrh (DRAFT)." };
  }
  await db.purchaseOrderItem.delete({ where: { id: itemId } });
  revalidatePath(`/objednavky/${item.orderId}`);
  return { ok: true };
}

// Označí objednávku jako odeslanou (člověk potvrdil). NEODESÍLÁ e-mail automaticky.
export async function markOrderSent(orderId: string): Promise<OrderActionResult> {
  await requireRole("MANAGER");
  const order = await db.purchaseOrder.findUnique({
    where: { id: orderId },
    include: { _count: { select: { items: true } } },
  });
  if (!order) return { ok: false, error: "Objednávka nenalezena." };
  if (order.status !== "DRAFT") {
    return { ok: false, error: "Odeslat lze jen návrh." };
  }
  if (order._count.items === 0) {
    return { ok: false, error: "Objednávka nemá žádné položky." };
  }
  await db.purchaseOrder.update({
    where: { id: orderId },
    data: { status: "SENT", sentAt: new Date() },
  });
  revalidatePath("/objednavky");
  revalidatePath(`/objednavky/${orderId}`);
  return { ok: true, message: "Objednávka označena jako odeslaná." };
}

export async function setOrderStatus(
  orderId: string,
  status: "CONFIRMED" | "RECEIVED" | "CANCELLED",
): Promise<OrderActionResult> {
  await requireRole("MANAGER");
  await db.purchaseOrder.update({ where: { id: orderId }, data: { status } });
  revalidatePath("/objednavky");
  revalidatePath(`/objednavky/${orderId}`);
  return { ok: true };
}

export async function deleteOrder(orderId: string): Promise<OrderActionResult> {
  await requireRole("MANAGER");
  const order = await db.purchaseOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Objednávka nenalezena." };
  if (order.status !== "DRAFT" && order.status !== "CANCELLED") {
    return { ok: false, error: "Smazat lze jen návrh nebo zrušenou objednávku." };
  }
  await db.purchaseOrder.delete({ where: { id: orderId } });
  revalidatePath("/objednavky");
  redirect("/objednavky");
}
