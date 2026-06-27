"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateAutoLogout } from "@/app/actions/settings";

const selectClass =
  "border-input flex h-9 w-full max-w-xs rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

const LABELS: Record<number, string> = {
  0: "Nikdy",
  5: "Po 5 minutách",
  10: "Po 10 minutách",
  30: "Po 30 minutách",
  60: "Po 60 minutách",
};

export function SystemSettingsForm({ autoLogoutMinutes }: { autoLogoutMinutes: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(autoLogoutMinutes));
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updateAutoLogout(Number(value));
      if (!res.ok) {
        toast.error(res.error ?? "Uložení selhalo.");
        return;
      }
      toast.success(res.message ?? "Uloženo.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-5">
      <div className="space-y-1.5">
        <Label htmlFor="autologout">Automatické odhlášení při nečinnosti</Label>
        <select id="autologout" value={value} className={selectClass}
          onChange={(e) => setValue(e.target.value)}>
          {[0, 5, 10, 30, 60].map((m) => (
            <option key={m} value={m}>{LABELS[m]}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Po této době bez aktivity se uživatel automaticky odhlásí. Vhodné pro sdílený
          tablet u křesla.
        </p>
      </div>
      <Button onClick={save} disabled={pending} size="sm">
        <Check className="size-4" /> {pending ? "Ukládám…" : "Uložit"}
      </Button>
    </div>
  );
}
