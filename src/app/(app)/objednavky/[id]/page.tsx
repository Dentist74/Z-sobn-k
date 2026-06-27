import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { OrderDetail, type OrderVM } from "@/components/order-detail";
import { isSmtpConfigured } from "@/lib/mailer";
import { toNumber } from "@/lib/format";
import type { OrderStatus } from "@/lib/enums";

export const metadata = { title: "Objednávka – Zásobník" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER");
  const { id } = await params;

  const order = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true, orderEmail: true, orderUrl: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { product: { select: { name: true, sku: true, unit: true } } },
      },
    },
  });
  if (!order) notFound();

  const vm: OrderVM = {
    id: order.id,
    status: order.status as OrderStatus,
    supplierName: order.supplier.name,
    supplierEmail: order.supplier.orderEmail,
    supplierUrl: order.supplier.orderUrl,
    items: order.items.map((it) => ({
      id: it.id,
      productName: it.product.name,
      sku: it.product.sku,
      unit: it.product.unit,
      quantity: toNumber(it.quantity),
      unitPrice: toNumber(it.unitPrice),
    })),
  };

  return <OrderDetail order={vm} mailReady={isSmtpConfigured()} />;
}
