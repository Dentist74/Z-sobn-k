import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { ImportProducts } from "@/components/import-products";
import { LevelsImport } from "@/components/levels-import";

export const metadata = { title: "Import produktů – Zásobník" };

export default async function ImportPage() {
  await requireRole("MANAGER");
  const warehouses = await db.warehouse.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Import produktů</h1>
        <p className="mt-1 text-slate-500">
          Naimportuj skladové karty z exportu Evidentistu (.xlsx / .csv). Před importem
          si můžeš odškrtat položky, které nechceš. Párování probíhá podle M-kódu, u položek
          bez M-kódu podle názvu — existující se aktualizují, nové se založí. Volitelně se
          naimportují i počty ks skladem.
        </p>
      </div>
      <ImportProducts warehouses={warehouses} />
      <LevelsImport />
    </div>
  );
}
