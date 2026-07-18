"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CameraScanButton } from "@/components/camera-scan-button";
import { UNIT_LABELS, type Unit } from "@/lib/enums";

export type PickerProduct = {
  id: string;
  name: string;
  sku: string;
  codes: string[]; // EANy + kód výrobce + DL-kód (pro hledání/skenování)
  unit: string;
};

export function ProductPicker({
  products,
  value,
  onChange,
}: {
  products: PickerProduct[];
  value: PickerProduct | null;
  onChange: (p: PickerProduct | null) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.sku.toLowerCase().includes(needle) ||
          p.codes.some((c) => c.toLowerCase().includes(needle)),
      )
      .slice(0, 8);
  }, [q, products]);

  function select(p: PickerProduct) {
    onChange(p);
    setQ("");
  }

  // Čtečka: po Enteru zkus přesnou shodu (kód/SKU), jinak jediný výsledek.
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const needle = q.trim().toLowerCase();
    if (!needle) return;
    const exact = products.find(
      (p) =>
        p.sku.toLowerCase() === needle ||
        p.codes.some((c) => c.toLowerCase() === needle),
    );
    if (exact) return select(exact);
    if (filtered.length === 1) return select(filtered[0]);
  }

  // Sken fotoaparátem: přesná shoda → vyber, jinak nech vyhledat ručně.
  function onCameraScan(code: string) {
    const needle = code.trim().toLowerCase();
    const exact = products.find(
      (p) =>
        p.sku.toLowerCase() === needle ||
        p.codes.some((c) => c.toLowerCase() === needle),
    );
    if (exact) select(exact);
    else setQ(code);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Check className="size-4 text-green-600" />
          <div>
            <p className="font-medium">{value.name}</p>
            <p className="font-mono text-xs text-slate-500">
              {value.sku}
              {value.codes[0] ? ` · ${value.codes[0]}` : ""} ·{" "}
              {UNIT_LABELS[value.unit as Unit] ?? value.unit}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Změnit položku"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Hledat položku nebo naskenovat čárový kód…"
          className="pl-9 pr-9"
        />
        {q && (
          <button
            type="button"
            aria-label="Smazat hledání"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700"
          >
            <X className="size-3.5" />
          </button>
        )}
        {filtered.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-md">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => select(p)}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-100"
              >
                <span className="font-medium">{p.name}</span>
                <span className="font-mono text-xs text-slate-500">
                  {p.sku}
                  {p.codes[0] ? ` · ${p.codes[0]}` : ""}
                </span>
              </button>
            </li>
            ))}
          </ul>
        )}
      </div>
      <CameraScanButton onScan={onCameraScan} />
    </div>
  );
}
