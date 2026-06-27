"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import type { SupplierFormState } from "@/app/actions/suppliers";

type Action = (
  prev: SupplierFormState,
  formData: FormData,
) => Promise<SupplierFormState>;

export type Contact = {
  name: string;
  email: string;
  phone: string;
  isPrimary: boolean;
};

export type SupplierDefaults = {
  name?: string;
  ico?: string | null;
  dic?: string | null;
  orderEmail?: string | null;
  orderUrl?: string | null;
  note?: string | null;
  active?: boolean;
  contacts?: Contact[];
};

export function SupplierForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: Action;
  defaultValues?: SupplierDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    SupplierFormState,
    FormData
  >(action, undefined);
  const dv = defaultValues ?? {};
  const [contacts, setContacts] = useState<Contact[]>(dv.contacts ?? []);

  function addContact() {
    setContacts([...contacts, { name: "", email: "", phone: "", isPrimary: contacts.length === 0 }]);
  }
  function setContact(i: number, patch: Partial<Contact>) {
    setContacts(contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  const validContacts = contacts.filter((c) => c.name.trim());

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <input type="hidden" name="contactsJson" value={JSON.stringify(validContacts)} />

      <section className="space-y-5 rounded-lg border bg-white p-5">
        <h2 className="font-semibold text-slate-900">Dodavatel</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Název</Label>
            <Input id="name" name="name" defaultValue={dv.name} required placeholder="DentalMarket s.r.o." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ico">IČO</Label>
            <Input id="ico" name="ico" defaultValue={dv.ico ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dic">DIČ</Label>
            <Input id="dic" name="dic" defaultValue={dv.dic ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orderEmail">E-mail pro objednávky</Label>
            <Input id="orderEmail" name="orderEmail" type="email"
              defaultValue={dv.orderEmail ?? ""} placeholder="objednavky@dodavatel.cz" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orderUrl">Odkaz na e-shop</Label>
            <Input id="orderUrl" name="orderUrl" defaultValue={dv.orderUrl ?? ""}
              placeholder="https://…" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="note">Poznámka</Label>
            <Input id="note" name="note" defaultValue={dv.note ?? ""} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input id="active" name="active" type="checkbox" defaultChecked={dv.active ?? true}
            className="size-4 rounded border-slate-300" />
          <Label htmlFor="active" className="font-normal">Aktivní</Label>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Kontakty (obchodní zástupci)</h2>
          <Button type="button" variant="outline" size="sm" onClick={addContact}>
            <Plus className="size-4" /> Přidat kontakt
          </Button>
        </div>
        {contacts.length === 0 && (
          <p className="text-sm text-slate-400">Žádné kontakty.</p>
        )}
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <Input placeholder="Jméno" value={c.name}
                onChange={(e) => setContact(i, { name: e.target.value })} />
              <Input placeholder="E-mail" value={c.email}
                onChange={(e) => setContact(i, { email: e.target.value })} />
              <Input placeholder="Telefon" value={c.phone}
                onChange={(e) => setContact(i, { phone: e.target.value })} />
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <input type="checkbox" checked={c.isPrimary}
                  onChange={(e) => setContact(i, { isPrimary: e.target.checked })} />
                hlavní
              </label>
              <button type="button" aria-label="Odebrat"
                onClick={() => setContacts(contacts.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : submitLabel}
        </Button>
        <Link href="/dodavatele" className={buttonVariants({ variant: "outline" })}>
          Zrušit
        </Link>
      </div>
    </form>
  );
}
