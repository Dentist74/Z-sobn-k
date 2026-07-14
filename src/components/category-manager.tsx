"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory, deleteCategory, setCategoryColor } from "@/app/actions/categories";

type Cat = { id: string; name: string; color: string | null };

// Přednastavená paleta — dost odlišných barev pro rychlé rozlišení v seznamu.
const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b",
];

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    const n = name.trim();
    if (!n) return;
    start(async () => {
      const res = await createCategory(n, color);
      if (!res.ok) {
        toast.error(res.error ?? "Nepodařilo se přidat.");
        return;
      }
      setName("");
      setColor(null);
      toast.success("Kategorie přidána.");
      router.refresh();
    });
  }

  function changeColor(id: string, c: string | null) {
    start(async () => {
      const res = await setCategoryColor(id, c);
      if (!res.ok) { toast.error(res.error ?? "Změna barvy selhala."); return; }
      router.refresh();
    });
  }

  function remove(id: string, n: string) {
    if (!confirm(`Smazat kategorii „${n}"? Produkty si název ponechají.`)) return;
    start(async () => {
      const res = await deleteCategory(id);
      if (!res.ok) {
        toast.error(res.error ?? "Nepodařilo se smazat.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="space-y-2 rounded-lg border bg-white p-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="Název nové kategorie"
          />
          <Button type="button" onClick={add} disabled={pending}>
            <Plus className="size-4" /> Přidat
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-slate-500">Barva:</span>
          {PALETTE.map((c) => (
            <button key={c} type="button" aria-label={`Barva ${c}`}
              onClick={() => setColor(color === c ? null : c)}
              className={
                "size-6 rounded-full border-2 transition " +
                (color === c ? "scale-110 border-slate-800" : "border-transparent hover:scale-110")
              }
              style={{ backgroundColor: c }}
            />
          ))}
          <button type="button" onClick={() => setColor(null)}
            aria-label="Bez barvy"
            className={
              "flex size-6 items-center justify-center rounded-full border-2 bg-white text-slate-400 " +
              (color === null ? "border-slate-800" : "border-slate-200")
            }>
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        {categories.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">Zatím žádné kategorie.</p>
        ) : (
          <ul className="divide-y">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2">
                <span
                  className="size-4 shrink-0 rounded-full border border-slate-200"
                  style={{ backgroundColor: c.color ?? "#ffffff" }}
                />
                <span className="flex-1">{c.name}</span>
                {/* Změna barvy: nativní výběr barvy (kapátko) */}
                <label className="relative cursor-pointer text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">
                  barva
                  <input
                    type="color"
                    value={c.color ?? "#e2e8f0"}
                    onChange={(e) => changeColor(c.id, e.target.value)}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                </label>
                {c.color && (
                  <button type="button" onClick={() => changeColor(c.id, null)}
                    className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">
                    zrušit barvu
                  </button>
                )}
                <button type="button" aria-label="Smazat" disabled={pending}
                  onClick={() => remove(c.id, c.name)}
                  className="text-slate-400 hover:text-red-600 disabled:opacity-50">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Barva se zobrazí jako proužek na začátku řádku v seznamu skladových karet.
      </p>
    </div>
  );
}
