import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { LabelSheet } from "@/components/label-sheet";
import { barcodeForProduct } from "@/lib/barcode";

export const metadata = { title: "Tisk štítku – Zásobník" };

export default async function LabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    include: { barcodes: { select: { code: true } } },
  });
  if (!product) notFound();

  const spec = barcodeForProduct({
    sku: product.sku,
    codes: product.barcodes.map((b) => b.code),
  });

  return (
    <main className="min-h-screen bg-slate-50 py-4">
      <LabelSheet
        name={product.name}
        sku={product.sku}
        spec={spec}
        backHref={`/produkty/${product.id}`}
      />
    </main>
  );
}
