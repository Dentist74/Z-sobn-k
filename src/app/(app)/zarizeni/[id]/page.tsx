import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { updateEquipment } from "@/app/actions/equipment";
import { EquipmentForm } from "@/components/equipment-form";

export const metadata = { title: "Úprava zařízení – Zásobník" };

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER");
  const { id } = await params;
  const e = await db.equipment.findUnique({ where: { id } });
  if (!e) notFound();

  const action = updateEquipment.bind(null, e.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Úprava: {e.name}</h1>
      <EquipmentForm
        action={action}
        submitLabel="Uložit změny"
        defaultValues={{
          name: e.name,
          serialNumber: e.serialNumber,
          category: e.category,
          location: e.location,
          purchaseDate: iso(e.purchaseDate),
          lastServiceDate: iso(e.lastServiceDate),
          nextServiceDate: iso(e.nextServiceDate),
          note: e.note,
          active: e.active,
        }}
      />
    </div>
  );
}
