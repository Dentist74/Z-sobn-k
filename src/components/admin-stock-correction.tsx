"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { setStockQuantity } from "@/app/actions/stock";

// Jen pro ADMIN: přímá oprava stavu skladu na přesné číslo (bez příjmu/výdeje).
// Rozdíl se zaúčtuje jako pohyb ADJUSTMENT „Oprava stavu (admin)" → v Historii dohledatelné.
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
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-800">
        <Wrench className="size-4" /> Oprava stavu skladu (jen správce)
      </h3>
      <p className="mb-3 text-xs text-amber-700">
        Přepiš stav na správné číslo bez naskladnění/výdeje. Rozdíl se zaznamená jako úprava
        skladu a je dohledatelný v Historii akcí.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Skutečný stav ({unitLabel})</Label>
          <Input type="number" step="any" min="0" value={value} className="w-32"
            onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button onClick={save} disabled={pending} size="sm">
          {pending ? "Ukládám…" : "Opravit stav"}
        </Button>
        <span className="text-xs text-slate-500">nyní: {currentQty} {unitLabel}</span>
      </div>
    </div>
  );
}
