"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { ROLES } from "@/lib/enums";

export type UserActionResult = { ok: boolean; error?: string; message?: string };

const CreateSchema = z.object({
  name: z.string().min(2, { error: "Zadej jméno." }).trim(),
  email: z.email({ error: "Zadej platný e-mail." }).trim(),
  password: z.string().min(6, { error: "Heslo musí mít aspoň 6 znaků." }),
  role: z.enum(ROLES),
  pin: z.string().trim().regex(/^\d{4}$/, { error: "Zadej PIN (4 číslice)." }),
});

export async function createUser(
  _prev: UserActionResult | undefined,
  formData: FormData,
): Promise<UserActionResult> {
  const actor = await requireRole("MANAGER");
  const parsed = CreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    pin: formData.get("pin") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const d = parsed.data;
  // Hlavní sestra (MANAGER) smí zakládat jen běžné uživatele.
  const role = actor.role === "ADMIN" ? d.role : "STAFF";

  const exists = await db.user.findUnique({ where: { email: d.email.toLowerCase() } });
  if (exists) return { ok: false, error: "Uživatel s tímto e-mailem už existuje." };

  await db.user.create({
    data: {
      name: d.name,
      email: d.email.toLowerCase(),
      passwordHash: await bcrypt.hash(d.password, 10),
      pinHash: await bcrypt.hash(d.pin, 10),
      role,
    },
  });
  revalidatePath("/nastaveni/uzivatele");
  return { ok: true, message: "Uživatel vytvořen." };
}

// Společná kontrola: MANAGER nesmí zasahovat do ADMIN účtů.
async function guardTarget(actorRole: string, userId: string) {
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true, name: true },
  });
  if (!target) return { error: "Uživatel nenalezen." as const };
  if (actorRole !== "ADMIN" && target.role === "ADMIN") {
    return { error: "Na tento účet nemáš oprávnění." as const };
  }
  return { target };
}

export async function setUserPin(userId: string, pin: string): Promise<UserActionResult> {
  const actor = await requireRole("MANAGER");
  if (pin && !/^\d{4}$/.test(pin)) return { ok: false, error: "PIN musí mít 4 číslice." };
  const g = await guardTarget(actor.role, userId);
  if (g.error) return { ok: false, error: g.error };
  await db.user.update({
    where: { id: userId },
    data: { pinHash: pin ? await bcrypt.hash(pin, 10) : null },
  });
  revalidatePath("/nastaveni/uzivatele");
  return { ok: true, message: pin ? "PIN nastaven." : "PIN zrušen." };
}

export async function setUserPassword(userId: string, password: string): Promise<UserActionResult> {
  const actor = await requireRole("MANAGER");
  if (!password || password.length < 6) return { ok: false, error: "Heslo musí mít aspoň 6 znaků." };
  const g = await guardTarget(actor.role, userId);
  if (g.error) return { ok: false, error: g.error };
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  return { ok: true, message: "Heslo změněno." };
}

export async function toggleUserActive(userId: string): Promise<UserActionResult> {
  const actor = await requireRole("MANAGER");
  if (userId === actor.id) return { ok: false, error: "Nemůžeš deaktivovat sám sebe." };
  const g = await guardTarget(actor.role, userId);
  if (g.error || !g.target) return { ok: false, error: g.error };
  await db.user.update({ where: { id: userId }, data: { active: !g.target.active } });
  revalidatePath("/nastaveni/uzivatele");
  return { ok: true };
}

// Změnu role smí dělat jen ADMIN.
export async function setUserRole(userId: string, role: string): Promise<UserActionResult> {
  const actor = await requireRole("ADMIN");
  if (!(ROLES as readonly string[]).includes(role)) return { ok: false, error: "Neplatná role." };
  if (userId === actor.id) return { ok: false, error: "Vlastní roli neměň." };
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/nastaveni/uzivatele");
  return { ok: true, message: "Role změněna." };
}
