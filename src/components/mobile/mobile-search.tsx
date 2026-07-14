"use client";

import { useState } from "react";
import { MapPin, Package, RotateCcw } from "lucide-react";
import { MobileItemSearch, type MobileProduct } from "@/components/mobile/mobile-ui";

export type SearchProduct = MobileProduct & {
  storageLocation: string | null;
  minQuantity: number;
  optimalQuantity: number;
  whNames: Record<string, string>;
};

// Jednoduché vyhledání položky: název/kód/sken → přehled stavu skladem.
export function MobileSearch({ products }: { products: SearchProduct[] }) {
  const [selected, setSelected] = useState<SearchProduct | null>(null);

  if (selected) {
    const total = selected.totalQty ?? 0;
    const below = selected.minQuantity > 0 && total < selected.minQuantity;
    return (
      <div className="space-y-3">
        <div className="space-y-3 rounded-2xl border bg-white p-4">
          <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>

          <div className={"flex items-center gap-3 rounded-xl p-3 " + (total <= 0 ? "bg-red-50" : below ? "bg-amber-50" : "bg-green-50")}>
            <Package className={"size-7 " + (total <= 0 ? "text-red-600" : below ? "text-amber-600" : "text-green-700")} />
            <div>
              <p className={"text-2xl font-extrabold tabular-nums " + (total <= 0 ? "text-red-700" : below ? "text-amber-700" : "text-green-800")}>
                {total} ks
              </p>
              <p className="text-xs text-slate-500">
                {total <= 0 ? "Není skladem!" : below ? `Pod minimem (min. ${selected.minQuantity} ks)` : "Skladem"}
                {selected.optimalQuantity > 0 && ` · optimum ${selected.optimalQuantity} ks`}
              </p>
            </div>
          </div>

          {selected.byWh && Object.keys(selected.byWh).length > 0 && (
            <div className="space-y-1">
              {Object.entries(selected.byWh).map(([whId, qty]) => (
                <div key={whId} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-600">{selected.whNames[whId] ?? "Sklad"}</span>
                  <span className="font-semibold tabular-nums">{qty} ks</span>
                </div>
              ))}
            </div>
          )}

          {selected.storageLocation && (
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin className="size-4 text-slate-400" /> Umístění: <b>{selected.storageLocation}</b>
            </p>
          )}
        </div>

        <button type="button" onClick={() => setSelected(null)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#103D63] text-base font-semibold text-white active:scale-[0.98]">
          <RotateCcw className="size-5" /> Hledat další
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-3">
      <MobileItemSearch products={products} onPick={(p) => setSelected(p as SearchProduct)} />
    </div>
  );
}
