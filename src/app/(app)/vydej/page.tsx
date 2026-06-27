import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { IssueForm } from "@/components/issue-form";
import { ScannerStatus } from "@/components/scanner-status";
import { toNumber } from "@/lib/format";

export const metadata = { title: "Výdej – Zásobník" };

export default async function IssuePage() {
  await requireUser();

  const ordinace = await db.ordinace.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const products = await db.product.findMany({
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
        select: { lotNumber: true, expiryDate: true, quantity: true },
      },
    },
  });

  const data = products
    .map((p) => {
      const batches = p.batches.map((b) => ({
        lotNumber: b.lotNumber,
        expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
        quantity: toNumber(b.quantity),
      }));
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        codes: [
          ...p.barcodes.map((b) => b.code),
          p.manufacturerCode,
          p.distributorCode,
        ].filter((c): c is string => !!c),
        unit: p.unit,
        piecesPerPackage: p.piecesPerPackage,
        packageLabel: p.packageLabel,
        totalQty: batches.reduce((s, b) => s + b.quantity, 0),
        batches,
      };
    })
    .filter((p) => p.totalQty > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Výdej</h1>
        <p className="mt-1 text-slate-500">
          Výdej probíhá metodou FEFO – systém odebere z šarže s nejbližší
          expirací.
        </p>
      </div>

      <ScannerStatus />

      <IssueForm products={data} ordinace={ordinace} />
    </div>
  );
}
