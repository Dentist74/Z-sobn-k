"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import type { OrdinaceFormState } from "@/app/actions/ordinace";

type Action = (
  prev: OrdinaceFormState,
  formData: FormData,
) => Promise<OrdinaceFormState>;

export function OrdinaceForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: Action;
  defaultValues?: { name?: string; note?: string | null; active?: boolean };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    OrdinaceFormState,
    FormData
  >(action, undefined);
  const dv = defaultValues ?? {};

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Název ordinace</Label>
        <Input id="name" name="name" defaultValue={dv.name} required placeholder="Ordinace 1" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Poznámka</Label>
        <Input id="note" name="note" defaultValue={dv.note ?? ""} placeholder="např. patro / lékař" />
      </div>
      <div className="flex items-center gap-2">
        <input id="active" name="active" type="checkbox" defaultChecked={dv.active ?? true}
          className="size-4 rounded border-slate-300" />
        <Label htmlFor="active" className="font-normal">Aktivní</Label>
      </div>
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : submitLabel}
        </Button>
        <Link href="/ordinace" className={buttonVariants({ variant: "outline" })}>
          Zrušit
        </Link>
      </div>
    </form>
  );
}
