"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wrench, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setStockQuantity } from "@/app/actions/stock";

// Jen pro ADMIN: přímá oprava stavu skladu na přesné číslo (bez příjmu/výdeje).
// Nenápadné — jen malý odkaz, formulář se rozbalí až po kliknutí.
export function AdminStockCorrection({
  productId,
  currentQty,
  unitLabel,
}: {
  productId: string;
  currentQty: number;
  unitLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(currentQty));

  function save() {
    const target = Number(value);
    if (!Number.isFinite(target) || target < 0) {
      toast.error("Zadej platné množství (0 nebo víc).");
      return;
    }
    if (target === currentQty) {
      toast.info("Množství je stejné — nic k opravě.");
      return;
    }
    if (!confirm(
      `Opravit stav skladu z ${currentQty} na ${target} ${unitLabel}?\n` +
      `Rozdíl (${target - currentQty > 0 ? "+" : ""}${target - currentQty}) se zaznamená jako úprava skladu (dohledatelné v Historii).`,
    )) return;
    start(async () => {
      const res = await setStockQuantity(productId, target);
      if (!res.ok) { toast.error(res.error ?? "Oprava selhala."); return; }
      toast.success(`Stav opraven na ${target} ${unitLabel}.`);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setValue(String(currentQty)); setOpen(true); }}
        className="inline-flex items-center gap-1 self-start text-xs text-slate-400 underline-offset-2 hover:text-amber-700 hover:underline"
      >
        <Wrench className="size-3" /> Opravit stav skladu (správce)
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 self-start rounded-md border border-amber-200 bg-amber-50/60 px-2 py-1.5">
      <span className="text-xs text-amber-800">Skutečný stav:</span>
      <Input
        type="number" step="any" min="0" value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-24 bg-white text-sm"
      />
      <span className="text-xs text-slate-500">{unitLabel} (nyní {currentQty})</span>
      <Button onClick={save} disabled={pending} size="sm" className="h-7 px-2 text-xs">
        {pending ? "Ukládám…" : "Opravit"}
      </Button>
      <button type="button" onClick={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-600" aria-label="Zavřít">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
