import Link from "next/link";
import { History } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import {
  InventoryForm,
  type InventoryBatch,
} from "@/components/inventory-form";
import { formatDate, toNumber } from "@/lib/format";
import { UNIT_LABELS, type Unit } from "@/lib/enums";

export const metadata = { title: "Inventura – Zásobník" };

export default async function InventoryPage() {
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventura</h1>
          <p className="mt-1 text-slate-500">
            Projdi sklad (klidně čtečkou) a u každé šarže zadej napočítané
            množství. Systém vytvoří korekce na rozdíly.
          </p>
        </div>
        <Link href="/inventura/historie" className={buttonVariants({ variant: "outline" })}>
          <History className="size-4" /> Historie inventur
        </Link>
      </div>

      <InventoryForm batches={data} userName={user.name} />
    </div>
  );
}
