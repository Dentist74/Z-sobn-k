import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { MobileEan } from "@/components/mobile/mobile-ean";

export const metadata = { title: "Přidělení EAN – Zásobník" };

export default async function MobileEanPage() {
  await requireRole("MANAGER");

  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, sku: true, unit: true,
      manufacturerCode: true, distributorCode: true,
      barcodes: { select: { code: true } },
    },
  });

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    codes: [
      ...p.barcodes.map((b) => b.code),
      ...(p.manufacturerCode ? [p.manufacturerCode] : []),
      ...(p.distributorCode ? [p.distributorCode] : []),
    ],
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link href="/m" className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm">
          <ChevronLeft className="size-5 text-slate-600" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">🏷️ Přidělení EAN kódu</h1>
      </div>
      <MobileEan products={data} />
    </div>
  );
}
