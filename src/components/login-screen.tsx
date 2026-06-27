"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
import { login, type LoginState, listPinUsers, loginWithPin, type PinUser } from "@/app/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/enums";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function LoginScreen() {
  const [mode, setMode] = useState<"pin" | "password">("pin");
  const [pinUsers, setPinUsers] = useState<PinUser[] | null>(null);

  useEffect(() => {
    listPinUsers().then((u) => {
      setPinUsers(u);
      if (u.length === 0) setMode("password");
    });
  }, []);

  return (
    <div style={{ maxWidth: 380 }} className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="mb-5 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand-logo.png" alt="Svět úsměvů" className="h-11 w-auto" />
        <p className="mt-3 text-sm text-slate-500">Zásobník</p>
      </div>

      {pinUsers && pinUsers.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}
          className="mb-5 rounded-lg bg-slate-100 p-1 text-sm">
          <button type="button" onClick={() => setMode("pin")}
            className={"rounded-md py-1.5 font-medium " + (mode === "pin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
            PIN
          </button>
          <button type="button" onClick={() => setMode("password")}
            className={"rounded-md py-1.5 font-medium " + (mode === "password" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
            E-mail a heslo
          </button>
        </div>
      )}

      {mode === "pin" ? <PinPanel users={pinUsers ?? []} /> : <PasswordPanel />}
    </div>
  );
}

function PasswordPanel() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#103D63] focus:ring-2 focus:ring-[#103D63]/20"
          placeholder="jmeno@klinika.cz" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">Heslo</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#103D63] focus:ring-2 focus:ring-[#103D63]/20"
          placeholder="••••••••" />
      </div>
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button type="submit" disabled={pending}
        className="w-full rounded-md bg-[#103D63] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#0d3354] disabled:opacity-60">
        {pending ? "Přihlašuji…" : "Přihlásit se"}
      </button>
    </form>
  );
}

function PinPanel({ users }: { users: PinUser[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<PinUser | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(code: string, user: PinUser) {
    start(async () => {
      const res = await loginWithPin(user.id, code);
      if (!res.ok) {
        setError(res.error ?? "Nesprávný PIN.");
        setPin("");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  function press(d: string) {
    if (!selected || pending) return;
    setError(null);
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) submit(next, selected);
  }

  if (!selected) {
    return (
      <div>
        <p className="mb-3 text-center text-sm text-slate-500">Vyber se a zadej PIN</p>
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <button key={u.id} type="button" onClick={() => { setSelected(u); setPin(""); setError(null); }}
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-[#103D63] hover:bg-slate-50">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#103D63] text-sm font-medium text-white">
                {initials(u.name)}
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-900">{u.name}</span>
                <span className="block text-xs text-slate-400">{ROLE_LABELS[u.role as Role] ?? u.role}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={() => { setSelected(null); setPin(""); setError(null); }}
        className="mb-1 text-xs text-slate-400 hover:text-slate-700">
        ← jiný uživatel
      </button>
      <span className="flex size-11 items-center justify-center rounded-full bg-[#103D63] text-base font-medium text-white">
        {initials(selected.name)}
      </span>
      <p className="mt-2 text-sm font-medium text-slate-900">{selected.name}</p>

      <div className="my-4 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i}
            className={"size-3 rounded-full " + (i < pin.length ? "bg-[#F4B63E]" : "bg-slate-200")} />
        ))}
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: 232 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} disabled={pending}
            style={{ height: 64 }}
            className="rounded-xl border border-slate-200 text-xl text-slate-800 hover:bg-slate-50 active:scale-95 disabled:opacity-50">
            {d}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => press("0")} disabled={pending}
          style={{ height: 64 }}
          className="rounded-xl border border-slate-200 text-xl text-slate-800 hover:bg-slate-50 active:scale-95 disabled:opacity-50">
          0
        </button>
        <button type="button" onClick={() => { setPin(pin.slice(0, -1)); setError(null); }} disabled={pending}
          style={{ height: 64 }}
          className="flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50">
          <Delete className="size-5" />
        </button>
      </div>
    </div>
  );
}
