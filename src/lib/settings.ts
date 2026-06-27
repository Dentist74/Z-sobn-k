import "server-only";
import { db } from "@/lib/db";

export type SystemSettings = { autoLogoutMinutes: number };

// Načte systémová nastavení (bez zápisu — singleton se vytvoří až při uložení).
export async function getSystemSettings(): Promise<SystemSettings> {
  const s = await db.systemSetting.findUnique({ where: { id: "singleton" } });
  return { autoLogoutMinutes: s?.autoLogoutMinutes ?? 0 };
}

export const AUTO_LOGOUT_OPTIONS = [0, 5, 10, 30, 60] as const;
