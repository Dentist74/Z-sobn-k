import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { LabelSheet } from "@/components/label-sheet";
import { specForCode, type BarcodeSpec } from "@/lib/barcode";

export const metadata = { title: "Tisk štítku – Zásobník" };

export default async function LabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { code } = await searchParams;

  const product = await db.product.findUnique({
    where: { id },
    include: { barcodes: { select: { code: true } } },
  });
  if (!product) notFound();

  // Všechny kódy karty + interní M-kód jako záloha — na štítek jde vybrat kterýkoliv.
  const specs: BarcodeSpec[] = [
    ...product.barcodes.map((b) => specForCode(b.code)),
    { text: product.sku, bcid: "code128" },
  ].filter((s, i, arr) => arr.findIndex((x) => x.text === s.text) === i);

  // ?code=… z obrazovky Přidělení EAN předvybere konkrétní kód
  const initialIdx = code ? specs.findIndex((s) => s.text === code) : 0;

  return (
    <main className="min-h-screen bg-slate-50 py-4">
      <LabelSheet
        name={product.name}
        sku={product.sku}
        specs={specs}
        initialIndex={initialIdx >= 0 ? initialIdx : 0}
        backHref={`/produkty/${product.id}`}
      />
    </main>
  );
}
