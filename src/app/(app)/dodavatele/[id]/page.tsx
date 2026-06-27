import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { updateSupplier } from "@/app/actions/suppliers";
import { SupplierForm } from "@/components/supplier-form";

export const metadata = { title: "Úprava dodavatele – Zásobník" };

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER");
  const { id } = await params;
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: { contacts: { orderBy: { isPrimary: "desc" } } },
  });
  if (!supplier) notFound();

  const action = updateSupplier.bind(null, supplier.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        Úprava: {supplier.name}
      </h1>
      <SupplierForm
        action={action}
        submitLabel="Uložit změny"
        defaultValues={{
          name: supplier.name,
          ico: supplier.ico,
          dic: supplier.dic,
          orderEmail: supplier.orderEmail,
          orderUrl: supplier.orderUrl,
          note: supplier.note,
          active: supplier.active,
          contacts: supplier.contacts.map((c) => ({
            name: c.name,
            email: c.email ?? "",
            phone: c.phone ?? "",
            isPrimary: c.isPrimary,
          })),
        }}
      />
    </div>
  );
}
