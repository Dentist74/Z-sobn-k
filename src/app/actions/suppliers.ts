"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export type SupplierFormState = { error?: string } | undefined;

const ContactSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  isPrimary: z.boolean().optional(),
});

const SupplierSchema = z.object({
  name: z.string().min(2, { error: "Zadej název dodavatele." }).trim(),
  ico: z.string().trim().optional(),
  dic: z.string().trim().optional(),
  orderEmail: z.string().trim().optional(),
  orderUrl: z.string().trim().optional(),
  note: z.string().trim().optional(),
  active: z.boolean(),
  contacts: z.array(ContactSchema),
});

function parse(formData: FormData) {
  let contacts: unknown = [];
  try {
    contacts = JSON.parse(String(formData.get("contactsJson") || "[]"));
  } catch {}
  return SupplierSchema.safeParse({
    name: formData.get("name"),
    ico: formData.get("ico") || undefined,
    dic: formData.get("dic") || undefined,
    orderEmail: formData.get("orderEmail") || undefined,
    orderUrl: formData.get("orderUrl") || undefined,
    note: formData.get("note") || undefined,
    active: formData.get("active") === "on" || formData.get("active") === "true",
    contacts: Array.isArray(contacts) ? contacts : [],
  });
}

type Parsed = z.infer<typeof SupplierSchema>;

function scalar(d: Parsed) {
  return {
    name: d.name,
    ico: d.ico || null,
    dic: d.dic || null,
    orderEmail: d.orderEmail || null,
    orderUrl: d.orderUrl || null,
    note: d.note || null,
    active: d.active,
  };
}

export async function createSupplier(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const d = parsed.data;
  await db.supplier.create({
    data: {
      ...scalar(d),
      contacts: {
        create: d.contacts.map((c) => ({
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          isPrimary: c.isPrimary ?? false,
        })),
      },
    },
  });
  revalidatePath("/dodavatele");
  redirect("/dodavatele");
}

export async function updateSupplier(
  id: string,
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const d = parsed.data;
  await db.$transaction(async (tx) => {
    await tx.supplier.update({ where: { id }, data: scalar(d) });
    await tx.supplierContact.deleteMany({ where: { supplierId: id } });
    if (d.contacts.length) {
      await tx.supplierContact.createMany({
        data: d.contacts.map((c) => ({
          supplierId: id,
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          isPrimary: c.isPrimary ?? false,
        })),
      });
    }
  });
  revalidatePath("/dodavatele");
  revalidatePath(`/dodavatele/${id}`);
  redirect("/dodavatele");
}
