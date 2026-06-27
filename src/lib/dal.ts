import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/session";
import type { Role } from "@/lib/enums";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

// Ověří session proti DB. cache() = jeden dotaz na render pass.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) {
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  };
});

// Vyžaduje přihlášeného uživatele, jinak přesměruje na /login.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Vyžaduje konkrétní roli (ADMIN má vždy přístup).
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;
  if (!roles.includes(user.role)) redirect("/dashboard?forbidden=1");
  return user;
}

// Pomocná kontrola práv bez přesměrování (pro UI / server actions).
export function can(user: CurrentUser, ...roles: Role[]): boolean {
  return user.role === "ADMIN" || roles.includes(user.role);
}
