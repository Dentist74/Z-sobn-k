import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { createProduct } from "@/app/actions/products";
import { ProductForm } from "@/components/product-form";

export const metadata = { title: "Nová položka – Zásobník" };

export default async function NewProductPage() {
  await requireRole("MANAGER");

  const [warehouses, suppliers, categories] = await Promise.all([
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
    db.category.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Nová položka</h1>
      <ProductForm
        action={createProduct}
        warehouses={warehouses}
        suppliers={suppliers}
        categories={categories.map((c) => c.name)}
        submitLabel="Vytvořit položku"
        cancelHref="/produkty"
      />
    </div>
  );
}
