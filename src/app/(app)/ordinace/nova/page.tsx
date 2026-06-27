import { requireRole } from "@/lib/dal";
import { createOrdinace } from "@/app/actions/ordinace";
import { OrdinaceForm } from "@/components/ordinace-form";

export const metadata = { title: "Nová ordinace – Zásobník" };

export default async function NewOrdinacePage() {
  await requireRole("MANAGER");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Nová ordinace</h1>
      <OrdinaceForm action={createOrdinace} submitLabel="Vytvořit ordinaci" />
    </div>
  );
}
