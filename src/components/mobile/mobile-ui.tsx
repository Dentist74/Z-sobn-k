"use client";

import { useMemo, useRef, useState } from "react";
import { Search, Minus, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CameraScanButton } from "@/components/camera-scan-button";

// Produkt pro mobilní obrazovky (hledání/sken + volitelný stav skladem).
export type MobileProduct = {
  id: string;
  name: string;
  sku: string;
  codes: string[];
  unit: string;
  totalQty?: number;
  byWh?: Record<string, number>; // stav po skladech (pro přeskladnění)
};

// Velké vyhledávací pole + modré tlačítko Naskenovat + našeptávač.
export function MobileItemSearch({
  products,
  onPick,
  placeholder = "Napiš název nebo kód…",
}: {
  products: MobileProduct[];
  onPick: (p: MobileProduct) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.sku.toLowerCase().includes(needle) ||
          p.codes.some((c) => c.toLowerCase().includes(needle)),
      )
      .slice(0, 8);
  }, [q, products]);

  function pick(p: MobileProduct) {
    setQ("");
    onPick(p);
    // Kurzor zpět do hledání — další kód jde načíst čtečkou hned bez ťukání.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // Sken: přesná shoda kódu/SKU → rovnou vybrat, jinak předvyplnit hledání.
  function onScan(code: string) {
    const needle = code.trim().toLowerCase();
    const hit = products.find(
      (p) => p.sku.toLowerCase() === needle || p.codes.some((c) => c.toLowerCase() === needle),
    );
    if (hit) pick(hit);
    else setQ(code);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-12 pl-10 pr-11 text-base"
        />
        {q && (
          <button
            type="button"
            aria-label="Smazat hledání"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-200 text-slate-600 active:scale-90"
          >
            <X className="size-4.5" />
          </button>
        )}
      </div>
      <CameraScanButton
        onScan={onScan}
        label="Naskenovat"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#103D63] text-base font-semibold text-white active:scale-[0.98]"
      />
      {results.length > 0 && (
        <div className="divide-y overflow-hidden rounded-xl border bg-white shadow-sm">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left active:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-800">{p.name}</span>
              {p.totalQty !== undefined && (
                <span className="shrink-0 text-sm tabular-nums text-slate-500">
                  {p.totalQty} ks
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && results.length === 0 && (
        <p className="px-1 text-sm text-slate-500">Nic nenalezeno.</p>
      )}
    </div>
  );
}

// Množství: červené „−" / číslo / zelené „+" (po 1 ks), ruční zadání funguje dál.
export function QtyStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Ubrat 1 ks"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white active:scale-90"
      >
        <Minus className="size-5" />
      </button>
      <Input
        type="number"
        step="any"
        min={min}
        value={String(value)}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
        className="h-9 w-16 text-center text-base tabular-nums"
      />
      <button
        type="button"
        aria-label="Přidat 1 ks"
        onClick={() => onChange(value + 1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white active:scale-90"
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
