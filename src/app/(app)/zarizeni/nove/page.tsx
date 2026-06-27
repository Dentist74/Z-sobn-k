import { requireRole } from "@/lib/dal";
import { createEquipment } from "@/app/actions/equipment";
import { EquipmentForm } from "@/components/equipment-form";

export const metadata = { title: "Nové zařízení – Zásobník" };

export default async function NewEquipmentPage() {
  await requireRole("MANAGER");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Nové zařízení</h1>
      <EquipmentForm action={createEquipment} submitLabel="Vytvořit zařízení" />
    </div>
  );
}
