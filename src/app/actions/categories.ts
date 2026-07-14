"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export type CategoryActionResult = { ok: boolean; error?: string };

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export async function createCategory(
  name: string,
  color?: string | null,
): Promise<CategoryActionResult> {
  await requireRole("MANAGER");
  const n = name.trim();
  if (n.length < 1) return { ok: false, error: "Zadej název kategorie." };
  const c = color && COLOR_RE.test(color) ? color : null;
  try {
    await db.category.create({ data: { name: n, color: c } });
  } catch {
    return { ok: false, error: "Taková kategorie už existuje." };
  }
  revalidatePath("/kategorie");
  revalidatePath("/produkty/novy");
  revalidatePath("/produkty");
  return { ok: true };
}

// Změní barvu existující kategorie (null = bez barvy).
export async function setCategoryColor(
  id: string,
  color: string | null,
): Promise<CategoryActionResult> {
  await requireRole("MANAGER");
  const c = color && COLOR_RE.test(color) ? color : null;
  await db.category.update({ where: { id }, data: { color: c } });
  revalidatePath("/kategorie");
  revalidatePath("/produkty");
  return { ok: true };
}

// Smaže kategorii z číselníku. Produkty, které ji mají, si název ponechají.
export async function deleteCategory(id: string): Promise<CategoryActionResult> {
  await requireRole("MANAGER");
  await db.category.delete({ where: { id } });
  revalidatePath("/kategorie");
  return { ok: true };
}

// Zajistí, že kategorie existuje v číselníku (voláno při ukládání produktu).
export async function ensureCategory(name: string | null | undefined): Promise<void> {
  const n = (name ?? "").trim();
  if (!n) return;
  await db.category.upsert({
    where: { name: n },
    update: {},
    create: { name: n },
  });
}
