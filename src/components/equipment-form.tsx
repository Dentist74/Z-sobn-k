"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import type { EquipmentFormState } from "@/app/actions/equipment";

type Action = (
  prev: EquipmentFormState,
  formData: FormData,
) => Promise<EquipmentFormState>;

export type EquipmentDefaults = {
  name?: string;
  serialNumber?: string | null;
  category?: string | null;
  location?: string | null;
  purchaseDate?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  note?: string | null;
  active?: boolean;
};

export function EquipmentForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: Action;
  defaultValues?: EquipmentDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<EquipmentFormState, FormData>(
    action,
    undefined,
  );
  const dv = defaultValues ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-lg border bg-white p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Název zařízení</Label>
          <Input id="name" name="name" defaultValue={dv.name} required placeholder="Autokláv MELAG" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="serialNumber">Sériové číslo</Label>
          <Input id="serialNumber" name="serialNumber" defaultValue={dv.serialNumber ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Kategorie</Label>
          <Input id="category" name="category" defaultValue={dv.category ?? ""} placeholder="Sterilizace" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Umístění / ordinace</Label>
          <Input id="location" name="location" defaultValue={dv.location ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchaseDate">Datum pořízení</Label>
          <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={dv.purchaseDate ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastServiceDate">Poslední revize</Label>
          <Input id="lastServiceDate" name="lastServiceDate" type="date" defaultValue={dv.lastServiceDate ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nextServiceDate">Příští revize</Label>
          <Input id="nextServiceDate" name="nextServiceDate" type="date" defaultValue={dv.nextServiceDate ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="note">Poznámka</Label>
          <Input id="note" name="note" defaultValue={dv.note ?? ""} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input id="active" name="active" type="checkbox" defaultChecked={dv.active ?? true}
          className="size-4 rounded border-slate-300" />
        <Label htmlFor="active" className="font-normal">V provozu</Label>
      </div>
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Ukládám…" : submitLabel}</Button>
        <Link href="/zarizeni" className={buttonVariants({ variant: "outline" })}>Zrušit</Link>
      </div>
    </form>
  );
}
