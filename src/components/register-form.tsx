"use client";

import { useActionState } from "react";
import { registerOwner, type FormState } from "@/app/actions/onboarding";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#103D63] focus:ring-2 focus:ring-[#103D63]/20";

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(registerOwner, undefined);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="mb-5 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand-logo.png" alt="Svět úsměvů" className="h-11 w-auto" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Vytvoření účtu majitele</h1>
        <p className="mt-1 text-sm text-slate-500">Založ hlavní (admin) účet kliniky.</p>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">Jméno</label>
          <input id="name" name="name" required autoFocus className={inputClass} placeholder="Jan Novák" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">E-mail</label>
          <input id="email" name="email" type="email" required className={inputClass} placeholder="jmeno@klinika.cz" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">Heslo</label>
          <input id="password" name="password" type="password" required className={inputClass} placeholder="min. 6 znaků" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pin" className="text-sm font-medium text-slate-700">PIN (4 číslice)</label>
          <input id="pin" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required
            className={inputClass} placeholder="pro rychlé přepínání u tabletu" />
        </div>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <button type="submit" disabled={pending}
          className="w-full rounded-md bg-[#103D63] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#0d3354] disabled:opacity-60">
          {pending ? "Zakládám…" : "Vytvořit účet"}
        </button>
      </form>
    </div>
  );
}
