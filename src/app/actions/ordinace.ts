"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export type OrdinaceFormState = { error?: string } | undefined;

const Schema = z.object({
  name: z.string().min(1, { error: "Zadej název ordinace." }).trim(),
  note: z.string().trim().optional(),
  active: z.boolean(),
});

function parse(formData: FormData) {
  return Schema.safeParse({
    name: formData.get("name"),
    note: formData.get("note") || undefined,
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}

export async function createOrdinace(
  _prev: OrdinaceFormState,
  formData: FormData,
): Promise<OrdinaceFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  await db.ordinace.create({
    data: {
      name: parsed.data.name,
      note: parsed.data.note ?? null,
      active: parsed.data.active,
    },
  });
  revalidatePath("/ordinace");
  redirect("/ordinace");
}

export async function updateOrdinace(
  id: string,
  _prev: OrdinaceFormState,
  formData: FormData,
): Promise<OrdinaceFormState> {
  await requireRole("MANAGER");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  await db.ordinace.update({
    where: { id },
    data: {
      name: parsed.data.name,
      note: parsed.data.note ?? null,
      active: parsed.data.active,
    },
  });
  revalidatePath("/ordinace");
  redirect("/ordinace");
}
