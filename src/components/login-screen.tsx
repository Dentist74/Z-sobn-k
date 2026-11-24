"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Delete, ChevronDown, UserRound } from "lucide-react";
import { login, type LoginState, listPinUsers, loginWithPin, type PinUser } from "@/app/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/enums";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

// Zlatý gradient pro akcenty (sladěno s CBCT plánovačem a generátorem LP).
const GOLD_GRAD = "linear-gradient(100deg,#f7d78c 0%,#e2a93b 55%,#c9912f 100%)";

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
    <div
      style={{ maxWidth: 400 }}
      className="w-full rounded-3xl border border-white/10 bg-[#141D2B]/75 p-7 text-slate-100 shadow-[0_24px_60px_-28px_rgba(0,0,0,.75)] backdrop-blur-xl"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Zásobník</h1>
        <p className="mt-1 text-sm text-[#9aa5b5]">Skladový systém kliniky Svět úsměvů</p>
      </div>

      {pinUsers && pinUsers.length > 0 && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}
          className="mb-6 rounded-xl border border-white/10 bg-white/5 p-1 text-sm"
        >
          <button
            type="button"
            onClick={() => setMode("pin")}
            style={mode === "pin" ? { background: GOLD_GRAD } : undefined}
            className={
              "rounded-lg py-1.5 font-semibold transition " +
              (mode === "pin" ? "text-[#102239] shadow-sm" : "text-[#9aa5b5] hover:text-slate-200")
            }
          >
            PIN
          </button>
          <button
            type="button"
            onClick={() => setMode("password")}
            style={mode === "password" ? { background: GOLD_GRAD } : undefined}
            className={
              "rounded-lg py-1.5 font-semibold transition " +
              (mode === "password" ? "text-[#102239] shadow-sm" : "text-[#9aa5b5] hover:text-slate-200")
            }
          >
            E-mail a heslo
          </button>
        </div>
      )}

      {mode === "pin" ? <PinPanel users={pinUsers ?? []} /> : <PasswordPanel />}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 " +
  "placeholder:text-slate-500 outline-none transition focus:border-[#F4B63E]/70 focus:ring-2 focus:ring-[#F4B63E]/25";

function PasswordPanel() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-slate-300">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required
          className={inputClass} placeholder="jmeno@klinika.cz" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-slate-300">Heslo</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className={inputClass} placeholder="••••••••" />
      </div>
      {state?.error && (
        <p className="rounded-xl border border-red-400/20 bg-red-500/15 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{ background: GOLD_GRAD }}
        className="w-full rounded-xl px-3 py-2.5 text-sm font-bold text-[#102239] shadow-[0_8px_24px_-8px_rgba(226,169,59,.6)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Přihlašuji…" : "Přihlásit se"}
      </button>
    </form>
  );
}

function PinPanel({ users }: { users: PinUser[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<PinUser | null>(null);
  const [listOpen, setListOpen] = useState(false);
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
      router.push(res.redirectTo ?? "/dashboard");
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
    // Výběr uživatele jako rozbalovací nabídka — karta zůstane kompaktní
    // i při větším počtu sestřiček (seznam uvnitř scrolluje).
    return (
      <div>
        <p className="mb-3 text-center text-sm text-[#9aa5b5]">Vyber se a zadej PIN</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setListOpen((o) => !o)}
            aria-expanded={listOpen}
            className={
              "flex w-full items-center gap-3 rounded-xl border bg-white/5 px-3.5 py-2.5 text-left transition " +
              (listOpen ? "border-[#F4B63E]/60 bg-white/10" : "border-white/15 hover:border-[#F4B63E]/50 hover:bg-white/10")
            }
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#9aa5b5]">
              <UserRound className="size-5" />
            </span>
            <span className="text-sm font-semibold text-slate-200">Vyber uživatele…</span>
            <ChevronDown
              className={"ml-auto size-4 text-[#9aa5b5] transition-transform " + (listOpen ? "rotate-180" : "")}
            />
          </button>

          {listOpen && (
            <div className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#15213A]/95 p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setSelected(u); setListOpen(false); setPin(""); setError(null); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/10"
                >
                  <span
                    style={{ background: GOLD_GRAD }}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#102239]"
                  >
                    {initials(u.name)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-100">{u.name}</span>
                    <span className="block text-xs text-[#9aa5b5]">
                      {ROLE_LABELS[u.role as Role] ?? u.role}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => { setSelected(null); setPin(""); setError(null); }}
        className="mb-2 text-xs text-[#9aa5b5] transition hover:text-slate-200"
      >
        ← jiný uživatel
      </button>
      <span
        style={{ background: GOLD_GRAD }}
        className="flex size-12 items-center justify-center rounded-full text-base font-bold text-[#102239] shadow-[0_8px_24px_-8px_rgba(226,169,59,.6)]"
      >
        {initials(selected.name)}
      </span>
      <p className="mt-2 text-sm font-semibold text-slate-100">{selected.name}</p>

      <div className="my-4 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={
              "size-3 rounded-full transition " +
              (i < pin.length
                ? "bg-[#F4B63E] shadow-[0_0_10px_rgba(244,182,62,.8)]"
                : "bg-white/15")
            }
          />
        ))}
      </div>
      {error && <p className="mb-2 text-sm text-red-300">{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: 232 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            disabled={pending}
            style={{ height: 64 }}
            className="rounded-2xl border border-white/10 bg-white/5 text-xl font-medium text-slate-100 transition hover:border-[#F4B63E]/40 hover:bg-white/10 active:scale-95 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={() => press("0")}
          disabled={pending}
          style={{ height: 64 }}
          className="rounded-2xl border border-white/10 bg-white/5 text-xl font-medium text-slate-100 transition hover:border-[#F4B63E]/40 hover:bg-white/10 active:scale-95 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => { setPin(pin.slice(0, -1)); setError(null); }}
          disabled={pending}
          style={{ height: 64 }}
          className="flex items-center justify-center rounded-2xl text-[#9aa5b5] transition hover:bg-white/10 hover:text-slate-200"
          aria-label="Smazat poslední číslici"
        >
          <Delete className="size-5" />
        </button>
      </div>
    </div>
  );
}
