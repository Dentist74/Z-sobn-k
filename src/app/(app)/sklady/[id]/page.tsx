import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { updateWarehouse } from "@/app/actions/warehouses";
import { WarehouseForm } from "@/components/warehouse-form";

export const metadata = { title: "Úprava skladu – Zásobník" };

export default async function EditWarehousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER");
  const { id } = await params;

  const warehouse = await db.warehouse.findUnique({ where: { id } });
  if (!warehouse) notFound();

  const action = updateWarehouse.bind(null, warehouse.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Úprava skladu</h1>
      <WarehouseForm
        action={action}
        submitLabel="Uložit změny"
        defaultValues={{
          name: warehouse.name,
          type: warehouse.type,
          locationLabel: warehouse.locationLabel,
          active: warehouse.active,
        }}
      />
    </div>
  );
}
