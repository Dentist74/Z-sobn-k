import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { NewOrderForm, type OrderProduct } from "@/components/new-order-form";

export const metadata = { title: "Nová objednávka – Zásobník" };

export default async function NewOrderPage() {
  await requireRole("MANAGER");

  const [suppliers, products] = await Promise.all([
    db.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        levels: { select: { minQuantity: true, optimalQuantity: true } },
        batches: { where: { quantity: { gt: 0 } }, select: { quantity: true } },
      },
    }),
  ]);

  const rows: OrderProduct[] = products.map((p) => {
    const total = p.batches.reduce((s, b) => s + toNumber(b.quantity), 0);
    const min =
      p.levels.length > 0
        ? p.levels.reduce((s, l) => s + toNumber(l.minQuantity), 0)
        : toNumber(p.minQuantity);
    const optimal =
      p.levels.length > 0
        ? p.levels.reduce((s, l) => s + toNumber(l.optimalQuantity), 0)
        : toNumber(p.optimalQuantity);
    const reorder = toNumber(p.reorderQuantity);
    const suggest =
      reorder > 0 ? reorder : optimal > total ? optimal - total : Math.max(min - total, 1);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      price: toNumber(p.pricePurchase),
      defaultSupplierId: p.defaultSupplierId,
      totalQty: total,
      min,
      belowMin: min > 0 && total < min,
      suggestQty: Math.round(suggest),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nová objednávka</h1>
        <p className="mt-1 text-slate-500">
          Vyber z docházejících položek nebo vyhledej konkrétní. Položky se rozdělí
          podle dodavatele.
        </p>
      </div>
      <NewOrderForm suppliers={suppliers} products={rows} />
    </div>
  );
}
