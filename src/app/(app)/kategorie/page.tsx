import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { CategoryManager } from "@/components/category-manager";

export const metadata = { title: "Kategorie – Zásobník" };

export default async function CategoriesPage() {
  await requireRole("MANAGER");
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Kategorie</h1>
        <p className="mt-1 text-slate-500">
          Číselník kategorií pro skladové karty.
        </p>
      </div>
      <CategoryManager categories={categories} />
    </div>
  );
}
