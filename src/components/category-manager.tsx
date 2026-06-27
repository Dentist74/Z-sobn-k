"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory, deleteCategory } from "@/app/actions/categories";

type Cat = { id: string; name: string };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function add() {
    const n = name.trim();
    if (!n) return;
    start(async () => {
      const res = await createCategory(n);
      if (!res.ok) {
        toast.error(res.error ?? "Nepodařilo se přidat.");
        return;
      }
      setName("");
      toast.success("Kategorie přidána.");
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

      <div className="rounded-lg border bg-white">
        {categories.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">Zatím žádné kategorie.</p>
        ) : (
          <ul className="divide-y">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-2">
                <span>{c.name}</span>
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
    </div>
  );
}
