import { requireRole } from "@/lib/dal";
import { createSupplier } from "@/app/actions/suppliers";
import { SupplierForm } from "@/components/supplier-form";

export const metadata = { title: "Nový dodavatel – Zásobník" };

export default async function NewSupplierPage() {
  await requireRole("MANAGER");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Nový dodavatel</h1>
      <SupplierForm action={createSupplier} submitLabel="Vytvořit dodavatele" />
    </div>
  );
}
