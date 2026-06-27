import { requireUser, can } from "@/lib/dal";
import { db } from "@/lib/db";
import { ReceiveForm } from "@/components/receive-form";
import { ScannerStatus } from "@/components/scanner-status";

export const metadata = { title: "Naskladnění – Zásobník" };

export default async function ReceivePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const user = await requireUser();
  const canManage = can(user, "MANAGER");
  const { product } = await searchParams;

  const [products, warehouses, suppliers] = await Promise.all([
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
        defaultWarehouseId: true,
        barcodes: { select: { code: true } },
      },
    }),
    db.warehouse.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const productOpts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    piecesPerPackage: p.piecesPerPackage,
    packageLabel: p.packageLabel,
    defaultWarehouseId: p.defaultWarehouseId,
    codes: [
      ...p.barcodes.map((b) => b.code),
      p.manufacturerCode,
      p.distributorCode,
    ].filter((c): c is string => !!c),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Naskladnění</h1>
        <p className="mt-1 text-slate-500">
          Příjem zboží na sklad. Naskenuj čárový kód nebo vyhledej položku.
        </p>
      </div>

      <ScannerStatus />

      {warehouses.length === 0 ? (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nejdřív vytvoř alespoň jeden sklad v sekci Sklady.
        </p>
      ) : (
        <ReceiveForm
          products={productOpts}
          warehouses={warehouses}
          suppliers={suppliers}
          preselectedId={product}
          canManage={canManage}
        />
      )}
    </div>
  );
}
