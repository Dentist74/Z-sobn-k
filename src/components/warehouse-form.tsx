"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { WAREHOUSE_TYPES, WAREHOUSE_TYPE_LABELS } from "@/lib/enums";
import type { WarehouseFormState } from "@/app/actions/warehouses";

type Action = (
  prev: WarehouseFormState,
  formData: FormData,
) => Promise<WarehouseFormState>;

export function WarehouseForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: Action;
  defaultValues?: {
    name?: string;
    type?: string;
    locationLabel?: string | null;
    active?: boolean;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    WarehouseFormState,
    FormData
  >(action, undefined);

  const dv = defaultValues ?? {};

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Název skladu</Label>
        <Input
          id="name"
          name="name"
          defaultValue={dv.name}
          required
          placeholder="Spotřební materiál – Praha"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="type">Typ</Label>
        <select
          id="type"
          name="type"
          defaultValue={dv.type ?? "CONSUMABLE"}
          className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
        >
          {WAREHOUSE_TYPES.map((t) => (
            <option key={t} value={t}>
              {WAREHOUSE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="locationLabel">Umístění (budova/patro)</Label>
        <Input
          id="locationLabel"
          name="locationLabel"
          defaultValue={dv.locationLabel ?? ""}
          placeholder="Budova A / přízemí"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={dv.active ?? true}
          className="size-4 rounded border-slate-300"
        />
        <Label htmlFor="active" className="font-normal">
          Aktivní
        </Label>
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : submitLabel}
        </Button>
        <Link href="/sklady" className={buttonVariants({ variant: "outline" })}>
          Zrušit
        </Link>
      </div>
    </form>
  );
}
