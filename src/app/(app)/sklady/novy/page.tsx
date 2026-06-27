import { requireRole } from "@/lib/dal";
import { createWarehouse } from "@/app/actions/warehouses";
import { WarehouseForm } from "@/components/warehouse-form";

export const metadata = { title: "Nový sklad – Zásobník" };

export default async function NewWarehousePage() {
  await requireRole("MANAGER");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Nový sklad</h1>
      <WarehouseForm action={createWarehouse} submitLabel="Vytvořit sklad" />
    </div>
  );
}
