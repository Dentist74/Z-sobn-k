"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NAV_ITEMS, SETTINGS_ITEMS, REPORT_ITEMS } from "@/lib/nav";
import { useNavGuard } from "@/components/nav-guard";

// Kořeny sekcí (hlavní menu) — tam tlačítko Zpět nedává smysl.
const SECTION_ROOTS = NAV_ITEMS.map((i) => i.href);
// Položky pod Nastavením — vždy zpět na rozcestník Nastavení.
const SETTINGS_CHILDREN = SETTINGS_ITEMS.map((i) => i.href);
// Položky pod Reporty (Spotřeba, Doklady, Historie…) — zpět na rozcestník Reporty.
const REPORT_CHILDREN = REPORT_ITEMS.map((i) => i.href);

// Vrátí logického rodiče v rámci stejné kategorie (ne podle historie prohlížeče).
function parentOf(path: string): string | null {
  if (SECTION_ROOTS.includes(path)) return null; // kořen sekce → bez Zpět
  if (SETTINGS_CHILDREN.includes(path)) return "/nastaveni";
  if (REPORT_CHILDREN.includes(path)) return "/reporty";
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return null;
  return path.slice(0, idx) || null;
}

export function BackButton() {
  const pathname = usePathname();
  const { confirmLeave } = useNavGuard();
  const parent = parentOf(pathname);
  if (!parent) return null;

  return (
    <Link
      href={parent}
      onClick={(e) => {
        if (!confirmLeave()) e.preventDefault();
      }}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
    >
      <ArrowLeft className="size-4" /> Zpět
    </Link>
  );
}
