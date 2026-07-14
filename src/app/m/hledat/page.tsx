import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { MobileSearch } from "@/components/mobile/mobile-search";

export const metadata = { title: "Vyhledávání – Zásobník" };

export default async function MobileSearchPage() {
  await requireUser();

  const [warehouses, products] = await Promise.all([
    db.warehouse.findMany({ select: { id: true, name: true } }),
    db.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, sku: true, unit: true,
        manufacturerCode: true, distributorCode: true, storageLocation: true,
        minQuantity: true, optimalQuantity: true,
        barcodes: { select: { code: true } },
        batches: { where: { quantity: { gt: 0 } }, select: { quantity: true, warehouseId: true } },
      },
    }),
  ]);

  const whNames = Object.fromEntries(warehouses.map((w) => [w.id, w.name]));

  const data = products.map((p) => {
    const byWh: Record<string, number> = {};
    let total = 0;
    for (const b of p.batches) {
      const q = toNumber(b.quantity);
      byWh[b.warehouseId] = (byWh[b.warehouseId] ?? 0) + q;
      total += q;
    }
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      codes: [
        ...p.barcodes.map((b) => b.code),
        ...(p.manufacturerCode ? [p.manufacturerCode] : []),
        ...(p.distributorCode ? [p.distributorCode] : []),
      ],
      totalQty: total,
      byWh,
      whNames,
      storageLocation: p.storageLocation,
      minQuantity: toNumber(p.minQuantity),
      optimalQuantity: toNumber(p.optimalQuantity),
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link href="/m" className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm">
          <ChevronLeft className="size-5 text-slate-600" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">🔍 Vyhledávání</h1>
      </div>
      <MobileSearch products={data} />
    </div>
  );
}
