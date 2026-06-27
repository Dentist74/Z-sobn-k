import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { barcodeForProduct } from "@/lib/barcode";
import { BulkLabels, type LabelItem } from "@/components/bulk-labels";

export const metadata = { title: "Tisk štítků – Zásobník" };

export default async function BulkLabelsPage() {
  await requireRole("MANAGER");
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { barcodes: { select: { code: true } } },
  });

  const items: LabelItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    spec: barcodeForProduct({ sku: p.sku, codes: p.barcodes.map((b) => b.code) }),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tisk štítků</h1>
        <p className="mt-1 text-slate-500">
          Vyber položky a vytiskni štítky s čárovým kódem hromadně.
        </p>
      </div>
      <BulkLabels products={items} />
    </div>
  );
}
