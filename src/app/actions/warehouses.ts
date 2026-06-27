"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { WAREHOUSE_TYPES } from "@/lib/enums";

export type WarehouseFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

const WarehouseSchema = z.object({
  name: z.string().min(2, { error: "Zadej název skladu." }).trim(),
  type: z.enum(WAREHOUSE_TYPES, { error: "Vyber typ skladu." }),
  locationLabel: z.string().trim().optional(),
  active: z.boolean(),
});

function parse(formData: FormData) {
  return WarehouseSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    locationLabel: formData.get("locationLabel") || undefined,
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}

export async function createWarehouse(
  _prev: WarehouseFormState,
  formData: FormData,
): Promise<WarehouseFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  await db.warehouse.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      locationLabel: parsed.data.locationLabel ?? null,
      active: parsed.data.active,
    },
  });
  revalidatePath("/sklady");
  redirect("/sklady");
}

export async function updateWarehouse(
  id: string,
  _prev: WarehouseFormState,
  formData: FormData,
): Promise<WarehouseFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  await db.warehouse.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      locationLabel: parsed.data.locationLabel ?? null,
      active: parsed.data.active,
    },
  });
  revalidatePath("/sklady");
  redirect("/sklady");
}
