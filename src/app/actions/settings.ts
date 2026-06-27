"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { AUTO_LOGOUT_OPTIONS } from "@/lib/settings";

export type SettingsResult = { ok: boolean; error?: string; message?: string };

export async function updateAutoLogout(minutes: number): Promise<SettingsResult> {
  await requireRole("MANAGER");
  if (!(AUTO_LOGOUT_OPTIONS as readonly number[]).includes(minutes)) {
    return { ok: false, error: "Neplatná hodnota." };
  }
  await db.systemSetting.upsert({
    where: { id: "singleton" },
    update: { autoLogoutMinutes: minutes },
    create: { id: "singleton", autoLogoutMinutes: minutes },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Uloženo." };
}
