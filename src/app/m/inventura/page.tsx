import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { InventoryForm, type InventoryBatch } from "@/components/inventory-form";
import { formatDate, toNumber } from "@/lib/format";
import { UNIT_LABELS, type Unit } from "@/lib/enums";

export const metadata = { title: "Inventura – Zásobník" };

// Inventura přímo v pracovním módu (stejná logika jako ve správním UI).
export default async function MobileInventoryPage() {
  const user = await requireRole("MANAGER");

  const batches = await db.stockBatch.findMany({
    where: { quantity: { gt: 0 } },
    orderBy: [{ product: { name: "asc" } }, { expiryDate: "asc" }],
    include: {
      product: {
        select: {
          name: true,
          unit: true,
          sku: true,
          manufacturerCode: true,
          distributorCode: true,
          barcodes: { select: { code: true } },
        },
      },
      warehouse: { select: { name: true } },
    },
  });

  const data: InventoryBatch[] = batches.map((b) => ({
    id: b.id,
    productName: b.product.name,
    lotNumber: b.lotNumber,
    expiryLabel: b.expiryDate ? formatDate(b.expiryDate) : "bez expirace",
    warehouseName: b.warehouse.name,
    systemQty: toNumber(b.quantity),
    unitLabel: UNIT_LABELS[b.product.unit as Unit] ?? b.product.unit,
    codes: [
      b.product.sku,
      b.product.manufacturerCode,
      b.product.distributorCode,
      ...b.product.barcodes.map((x) => x.code),
    ].filter((c): c is string => !!c),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link href="/m" className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm">
          <ChevronLeft className="size-5 text-slate-600" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">📋 Inventura</h1>
      </div>
      <InventoryForm batches={data} userName={user.name} />
    </div>
  );
}
