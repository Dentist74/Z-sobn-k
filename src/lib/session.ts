import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const COOKIE_NAME = "sklad_session";
const SESSION_DAYS = 7;

function expiryDate() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

// Vytvoří DB session a uloží náhodný token do httpOnly cookie.
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = expiryDate();

  await db.session.create({
    data: { id: token, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

// Smaže session z DB i cookie (odhlášení).
export async function deleteSession() {
  const token = await getSessionToken();
  if (token) {
    await db.session.deleteMany({ where: { id: token } });
  }
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
