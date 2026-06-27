"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  email: z.email({ error: "Zadej platný e-mail." }).trim(),
  password: z.string().min(1, { error: "Zadej heslo." }),
});

export type LoginState = { error?: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Stejná hláška pro neexistujícího uživatele i špatné heslo (bezpečnost).
  const invalid = { error: "Nesprávný e-mail nebo heslo." };

  if (!user || !user.active) return invalid;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return invalid;

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

// ---------- PIN přihlášení (rychlé přepínání u sdíleného tabletu) ----------

export type PinUser = { id: string; name: string; role: string };

// Aktivní uživatelé, kteří mají nastavený PIN (pro výběrovou obrazovku).
export async function listPinUsers(): Promise<PinUser[]> {
  const users = await db.user.findMany({
    where: { active: true, pinHash: { not: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
  return users;
}

export async function loginWithPin(
  userId: string,
  pin: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "PIN má 4 číslice." };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.active || !user.pinHash) {
    return { ok: false, error: "Nesprávný PIN." };
  }
  const ok = await bcrypt.compare(pin, user.pinHash);
  if (!ok) return { ok: false, error: "Nesprávný PIN." };
  await createSession(user.id);
  return { ok: true };
}
