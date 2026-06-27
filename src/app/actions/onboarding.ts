"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { createSession } from "@/lib/session";
import { isSmtpConfigured, sendMail } from "@/lib/mailer";
import { ROLES } from "@/lib/enums";

export type FormState = { error?: string } | undefined;
export type InviteResult = { ok: boolean; error?: string; token?: string };

const INVITE_DAYS = 14;

// Registrace majitele je možná jen dokud neexistuje žádný administrátor.
export async function isSetupOpen(): Promise<boolean> {
  const admins = await db.user.count({ where: { role: "ADMIN" } });
  return admins === 0;
}

const RegisterSchema = z.object({
  name: z.string().min(2, { error: "Zadej jméno." }).trim(),
  email: z.email({ error: "Zadej platný e-mail." }).trim(),
  password: z.string().min(6, { error: "Heslo musí mít aspoň 6 znaků." }),
  pin: z.string().trim().regex(/^\d{4}$/, { error: "Zadej PIN (4 číslice)." }),
});

// První admin (majitel kliniky). Po vytvoření se registrace uzavře.
export async function registerOwner(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isSetupOpen())) {
    return { error: "Registrace je uzavřená. Požádej správce o pozvánku." };
  }
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    pin: formData.get("pin") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  const d = parsed.data;

  const exists = await db.user.findUnique({ where: { email: d.email.toLowerCase() } });
  if (exists) return { error: "Uživatel s tímto e-mailem už existuje." };

  const user = await db.user.create({
    data: {
      name: d.name,
      email: d.email.toLowerCase(),
      passwordHash: await bcrypt.hash(d.password, 10),
      pinHash: await bcrypt.hash(d.pin, 10),
      role: "ADMIN",
    },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

// Vytvoří pozvánku (odkaz). MANAGER smí zvát jen běžné uživatele.
export async function createInvite(role: string, email?: string): Promise<InviteResult> {
  const actor = await requireRole("MANAGER");
  let finalRole = (ROLES as readonly string[]).includes(role) && role !== "ADMIN" ? role : "STAFF";
  if (actor.role !== "ADMIN") finalRole = "STAFF";

  const token = randomBytes(24).toString("hex");
  await db.invitation.create({
    data: {
      token,
      email: email?.trim().toLowerCase() || null,
      role: finalRole,
      createdById: actor.id,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  revalidatePath("/nastaveni/uzivatele");
  return { ok: true, token };
}

// Pošle pozvánku e-mailem (link sestaví klient z aktuální adresy).
export async function sendInviteEmail(token: string, link: string): Promise<InviteResult> {
  await requireRole("MANAGER");
  if (!isSmtpConfigured()) return { ok: false, error: "Odesílání e-mailů není nakonfigurováno (SMTP)." };
  const inv = await db.invitation.findUnique({ where: { token } });
  if (!inv || inv.acceptedAt) return { ok: false, error: "Pozvánka neplatná." };
  if (!inv.email) return { ok: false, error: "Pozvánka nemá e-mail." };
  try {
    await sendMail({
      to: inv.email,
      subject: "Pozvánka do skladového systému Zásobník",
      text: `Dobrý den,\n\nbyl/a jste pozván/a do skladového systému Zásobník (Svět úsměvů).\nÚčet si založíte zde:\n\n${link}\n\nOdkaz platí 14 dní.`,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Odeslání selhalo." };
  }
  return { ok: true };
}

export async function revokeInvite(id: string): Promise<InviteResult> {
  await requireRole("MANAGER");
  await db.invitation.delete({ where: { id } });
  revalidatePath("/nastaveni/uzivatele");
  return { ok: true };
}

const AcceptSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2, { error: "Zadej jméno." }).trim(),
  email: z.email({ error: "Zadej platný e-mail." }).trim(),
  password: z.string().min(6, { error: "Heslo musí mít aspoň 6 znaků." }),
  pin: z.string().trim().regex(/^\d{4}$/, { error: "Zadej PIN (4 číslice)." }),
});

// Přijetí pozvánky → vytvoří účet s rolí z pozvánky a přihlásí.
export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = AcceptSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    pin: formData.get("pin") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  const d = parsed.data;

  const inv = await db.invitation.findUnique({ where: { token: d.token } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) {
    return { error: "Pozvánka je neplatná nebo vypršela." };
  }
  const email = (inv.email || d.email).toLowerCase();
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { error: "Uživatel s tímto e-mailem už existuje." };

  const user = await db.user.create({
    data: {
      name: d.name,
      email,
      passwordHash: await bcrypt.hash(d.password, 10),
      pinHash: await bcrypt.hash(d.pin, 10),
      role: inv.role,
    },
  });
  await db.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  await createSession(user.id);
  redirect("/dashboard");
}
