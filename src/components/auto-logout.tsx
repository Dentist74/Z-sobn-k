"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { logout } from "@/app/actions/auth";

// Odhlásí uživatele po zadané době nečinnosti (minutes = 0 → vypnuto)
// a ukazuje v rohu odpočet do odhlášení. Jakákoliv aktivita ho resetuje.
export function AutoLogout({ minutes }: { minutes: number }) {
  const deadline = useRef<number>(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!minutes || minutes <= 0) return;
    const ms = minutes * 60 * 1000;
    deadline.current = Date.now() + ms;

    // Aktivita jen posune deadline (bez překreslení — levné i při mousemove).
    const reset = () => { deadline.current = Date.now() + ms; };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    // Překreslení 1× za sekundu; po vypršení odhlásit.
    let loggingOut = false;
    const tick = setInterval(() => {
      const left = deadline.current - Date.now();
      if (left <= 0) {
        if (!loggingOut) { loggingOut = true; logout(); }
        return;
      }
      setRemaining(left);
    }, 1000);
    setRemaining(ms);

    return () => {
      clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes]);

  if (!minutes || minutes <= 0 || remaining == null) return null;

  const totalSec = Math.max(0, Math.ceil(remaining / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = String(totalSec % 60).padStart(2, "0");
  const urgent = totalSec <= 60;

  return (
    <div
      title="Odhlášení při nečinnosti — jakákoliv aktivita odpočet vrátí na začátek"
      className={
        "fixed right-2 top-16 z-40 flex select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs shadow-sm " +
        (urgent
          ? "border-red-200 bg-red-50 font-semibold text-red-700"
          : "border-slate-200 bg-white/90 text-slate-500")
      }
    >
      <Clock className="size-3.5" />
      Odhlášení za {mm}:{ss}
    </div>
  );
}
