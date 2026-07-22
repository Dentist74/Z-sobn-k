import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser, can } from "@/lib/dal";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { MobileReceive } from "@/components/mobile/mobile-receive";

export const metadata = { title: "Příjem – Zásobník" };

export default async function MobileReceivePage() {
  const user = await requireUser();

  const [warehouses, products] = await Promise.all([
    db.warehouse.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, sku: true, unit: true,
        manufacturerCode: true, distributorCode: true,
        piecesPerPackage: true, packageLabel: true,
        barcodes: { select: { code: true } },
        batches: { where: { quantity: { gt: 0 } }, select: { quantity: true } },
      },
    }),
  ]);

  const defaultWarehouseId =
    warehouses.find((w) => w.name.toLowerCase().includes("hlavní"))?.id ?? warehouses[0]?.id ?? "";

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    piecesPerPackage: toNumber(p.piecesPerPackage),
    packageLabel: p.packageLabel,
    codes: [
      ...p.barcodes.map((b) => b.code),
      ...(p.manufacturerCode ? [p.manufacturerCode] : []),
      ...(p.distributorCode ? [p.distributorCode] : []),
    ],
    totalQty: p.batches.reduce((s, b) => s + toNumber(b.quantity), 0),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link href="/m" className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm">
          <ChevronLeft className="size-5 text-slate-600" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">📥 Příjem</h1>
      </div>
      <MobileReceive
        products={data}
        warehouses={warehouses}
        defaultWarehouseId={defaultWarehouseId}
        canManage={can(user, "MANAGER")}
      />
    </div>
  );
}
