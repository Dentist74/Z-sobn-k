"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProductQuick } from "@/app/actions/products";

const selectClass =
  "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

export function QuickProductSettings({
  productId,
  unitLabel,
  defaults,
}: {
  productId: string;
  unitLabel: string;
  defaults: {
    minQuantity: number;
    optimalQuantity: number;
    pricePurchase: number; // za kus, bez DPH
    piecesPerPackage: number;
    packageLabel: string | null;
    trackLevels?: boolean;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [min, setMin] = useState(String(defaults.minQuantity));
  const [opt, setOpt] = useState(String(defaults.optimalQuantity));
  const [trackLevels, setTrackLevels] = useState(defaults.trackLevels ?? true);
  const [packaged, setPackaged] = useState(defaults.piecesPerPackage > 1);
  const [ppp, setPpp] = useState(String(defaults.piecesPerPackage || 1));
  const [pkgLabel, setPkgLabel] = useState(defaults.packageLabel ?? "balení");
  const [priceMode, setPriceMode] = useState<"piece" | "package">("piece");
  const [price, setPrice] = useState(String(defaults.pricePurchase));

  const pp = packaged && Number(ppp) > 0 ? Number(ppp) : 1;
  const perPiece = priceMode === "package" ? (Number(price) || 0) / pp : Number(price) || 0;

  function save() {
    start(async () => {
      const res = await updateProductQuick(productId, {
        minQuantity: Number(min) || 0,
        optimalQuantity: Number(opt) || 0,
        pricePurchase: Math.round(perPiece * 100) / 100,
        piecesPerPackage: pp,
        packageLabel: packaged ? pkgLabel : null,
        trackLevels,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Uložení selhalo.");
        return;
      }
      toast.success("Uloženo.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Rychlé nastavení</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Min. ({unitLabel})</Label>
          <Input type="number" step="any" min="0" value={min} disabled={!trackLevels}
            onChange={(e) => setMin(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Opt. ({unitLabel})</Label>
          <Input type="number" step="any" min="0" value={opt} disabled={!trackLevels}
            onChange={(e) => setOpt(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nákupní cena bez DPH</Label>
          <div className="flex gap-1">
            <Input type="number" step="any" min="0" value={price}
              onChange={(e) => setPrice(e.target.value)} />
            <select value={priceMode} className={selectClass + " w-24"}
              onChange={(e) => setPriceMode(e.target.value as "piece" | "package")}>
              <option value="piece">/ks</option>
              <option value="package">/bal.</option>
            </select>
          </div>
          {priceMode === "package" && pp > 1 && (
            <p className="text-xs text-slate-400">
              = {perPiece.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč/{unitLabel}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Balení</Label>
          <label className="flex h-9 items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={packaged}
              onChange={(e) => setPackaged(e.target.checked)} />
            po baleních
          </label>
        </div>
        {packaged && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Kusů v balení</Label>
              <Input type="number" step="any" min="1" value={ppp}
                onChange={(e) => setPpp(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Název balení</Label>
              <Input value={pkgLabel} onChange={(e) => setPkgLabel(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" className="size-4" checked={!trackLevels}
          onChange={(e) => setTrackLevels(!e.target.checked)} />
        Hladiny min./opt. nesleduji (nepřipomínat doplnění)
      </label>
      <Button onClick={save} disabled={pending} size="sm" className="mt-3">
        <Check className="size-4" /> {pending ? "Ukládám…" : "Uložit"}
      </Button>
    </div>
  );
}
