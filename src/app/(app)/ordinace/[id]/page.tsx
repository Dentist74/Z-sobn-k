import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { updateOrdinace } from "@/app/actions/ordinace";
import { OrdinaceForm } from "@/components/ordinace-form";

export const metadata = { title: "Úprava ordinace – Zásobník" };

export default async function EditOrdinacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER");
  const { id } = await params;
  const ordinace = await db.ordinace.findUnique({ where: { id } });
  if (!ordinace) notFound();

  const action = updateOrdinace.bind(null, ordinace.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Úprava ordinace</h1>
      <OrdinaceForm
        action={action}
        submitLabel="Uložit změny"
        defaultValues={{
          name: ordinace.name,
          note: ordinace.note,
          active: ordinace.active,
        }}
      />
    </div>
  );
}
