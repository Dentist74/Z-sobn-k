"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export type EquipmentFormState = { error?: string } | undefined;

const Schema = z.object({
  name: z.string().min(2, { error: "Zadej název zařízení." }).trim(),
  serialNumber: z.string().trim().optional(),
  category: z.string().trim().optional(),
  location: z.string().trim().optional(),
  purchaseDate: z.string().trim().optional(),
  lastServiceDate: z.string().trim().optional(),
  nextServiceDate: z.string().trim().optional(),
  note: z.string().trim().optional(),
  active: z.boolean(),
});

function parse(formData: FormData) {
  return Schema.safeParse({
    name: formData.get("name"),
    serialNumber: formData.get("serialNumber") || undefined,
    category: formData.get("category") || undefined,
    location: formData.get("location") || undefined,
    purchaseDate: formData.get("purchaseDate") || undefined,
    lastServiceDate: formData.get("lastServiceDate") || undefined,
    nextServiceDate: formData.get("nextServiceDate") || undefined,
    note: formData.get("note") || undefined,
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}

function data(d: z.infer<typeof Schema>) {
  const date = (s?: string) => (s ? new Date(s) : null);
  return {
    name: d.name,
    serialNumber: d.serialNumber || null,
    category: d.category || null,
    location: d.location || null,
    purchaseDate: date(d.purchaseDate),
    lastServiceDate: date(d.lastServiceDate),
    nextServiceDate: date(d.nextServiceDate),
    note: d.note || null,
    active: d.active,
  };
}

export async function createEquipment(
  _prev: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  await db.equipment.create({ data: data(parsed.data) });
  revalidatePath("/zarizeni");
  redirect("/zarizeni");
}

export async function updateEquipment(
  id: string,
  _prev: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  await db.equipment.update({ where: { id }, data: data(parsed.data) });
  revalidatePath("/zarizeni");
  redirect("/zarizeni");
}
