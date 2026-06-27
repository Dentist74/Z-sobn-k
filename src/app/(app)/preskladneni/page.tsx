import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { TransferForm } from "@/components/transfer-form";
import { toNumber } from "@/lib/format";

export const metadata = { title: "Přeskladnění – Zásobník" };

export default async function TransferPage() {
  await requireUser();

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
        id: true,
        name: true,
        sku: true,
        manufacturerCode: true,
        distributorCode: true,
        unit: true,
        piecesPerPackage: true,
        packageLabel: true,
        barcodes: { select: { code: true } },
        batches: {
          where: { quantity: { gt: 0 } },
          select: { warehouseId: true, quantity: true },
        },
      },
    }),
  ]);

  const data = products
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      piecesPerPackage: p.piecesPerPackage,
      packageLabel: p.packageLabel,
      codes: [
        ...p.barcodes.map((b) => b.code),
        p.manufacturerCode,
        p.distributorCode,
      ].filter((c): c is string => !!c),
      stock: p.batches.map((b) => ({
        warehouseId: b.warehouseId,
        quantity: toNumber(b.quantity),
      })),
    }))
    .filter((p) => p.stock.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Přeskladnění</h1>
        <p className="mt-1 text-slate-500">
          Převod zásob mezi sklady. Šarže a expirace se zachovají (FEFO ze
          zdroje).
        </p>
      </div>
      {warehouses.length < 2 ? (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Pro přeskladnění jsou potřeba alespoň dva sklady.
        </p>
      ) : (
        <TransferForm products={data} warehouses={warehouses} />
      )}
    </div>
  );
}
