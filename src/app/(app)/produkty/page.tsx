import Link from "next/link";
import { Plus, Download, Tag } from "lucide-react";
import { requireUser, can } from "@/lib/dal";
import { db } from "@/lib/db";
import { getProductsWithStock } from "@/lib/stock";
import { buttonVariants } from "@/components/ui/button";
import {
  ProductsTable,
  type ProductRowVM,
} from "@/components/products-table";
import { formatCZK, formatQty, formatDate } from "@/lib/format";

export const metadata = { title: "Skladové karty – Zásobník" };

export default async function ProductsPage() {
  const user = await requireUser();
  const showPrices = can(user, "MANAGER");
  const canEdit = can(user, "MANAGER");

  const [products, warehouses, suppliers, categories] = await Promise.all([
    getProductsWithStock(),
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
    db.category.findMany({ select: { name: true, color: true } }),
  ]);

  // barva kategorie → barevný proužek na řádku
  const colorByCategory = new Map(categories.map((c) => [c.name, c.color]));

  const rows: ProductRowVM[] = products.map((p) => {
    // rozpad po skladech: sklady, kde má položka zásobu NEBO nastavenou hladinu
    const whIds = new Set<string>([
      ...p.stockByWh.map((s) => s.warehouseId),
      ...p.levelsByWh.map((l) => l.warehouseId),
    ]);
    const byWh: ProductRowVM["byWh"] = {};
    for (const id of whIds) {
      const s = p.stockByWh.find((x) => x.warehouseId === id);
      const lvl = p.levelsByWh.find((x) => x.warehouseId === id);
      const qty = s?.qty ?? 0;
      const min = lvl?.min ?? 0;
      byWh[id] = {
        qtyLabel: formatQty(qty, p.unit),
        minQtyLabel: min ? formatQty(min, p.unit) : "—",
        optQtyLabel: lvl?.opt ? formatQty(lvl.opt, p.unit) : "—",
        valueLabel: formatCZK(s?.value ?? 0),
        belowMin: min > 0 && qty < min,
        isZero: qty <= 0,
      };
    }
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      codes: p.codes,
      category: p.category,
      categoryColor: (p.category ? colorByCategory.get(p.category) : null) ?? null,
      totalQtyLabel: formatQty(p.totalQty, p.unit),
      minQtyLabel: p.minQuantity ? formatQty(p.minQuantity, p.unit) : "—",
      optQtyLabel: p.optimalQuantity ? formatQty(p.optimalQuantity, p.unit) : "—",
      valueLabel: formatCZK(p.value),
      belowMin: p.belowMin,
      isZero: p.totalQty <= 0,
      expiringSoon: p.expiringSoon,
      expired: p.expired,
      nearestExpiryLabel: formatDate(p.nearestExpiry),
      active: p.active,
      byWh,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Skladové karty
          </h1>
          <p className="mt-1 text-slate-500">
            {products.length} položek. Vyhledávej i čtečkou čárových kódů.
          </p>
        </div>
        <div className="flex gap-2">
          {showPrices && (
            <a
              href="/api/export/produkty"
              className={buttonVariants({ variant: "outline" })}
            >
              <Download className="size-4" />
              Export CSV
            </a>
          )}
          {canEdit && (
            <Link href="/stitky" className={buttonVariants({ variant: "outline" })}>
              <Tag className="size-4" />
              Tisk štítků
            </Link>
          )}
          {canEdit && (
            <Link href="/produkty/novy" className={buttonVariants()}>
              <Plus className="size-4" />
              Nová položka
            </Link>
          )}
        </div>
      </div>

      <ProductsTable rows={rows} warehouses={warehouses} suppliers={suppliers}
        categoryOptions={categories.map((c) => c.name)}
        showPrices={showPrices} canManage={canEdit} />
    </div>
  );
}
