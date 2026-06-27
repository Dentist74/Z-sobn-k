"use client";

import { useEffect, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";

// Čtečka čárových kódů se chová jako klávesnice — nejde zjistit „připojení".
// Tenhle indikátor ale pozná SKEN (rychlá dávka znaků zakončená Enterem)
// a potvrdí, že systém čtečku vidí.
export function ScannerStatus() {
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const buf = useRef("");
  const t0 = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const now = Date.now();
      if (e.key === "Enter") {
        const code = buf.current;
        const fast = now - t0.current < 400;
        if (fast && code.length >= 3) {
          setLastCode(code);
          setFlash(true);
          setTimeout(() => setFlash(false), 1200);
        }
        buf.current = "";
        return;
      }
      if (e.key.length === 1) {
        if (buf.current === "" || now - t0.current > 120) {
          buf.current = "";
          t0.current = now;
        }
        buf.current += e.key;
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const active = lastCode != null;

  return (
    <div
      className={
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors " +
        (flash
          ? "border-green-400 bg-green-50"
          : active
            ? "border-green-200 bg-white"
            : "border-slate-200 bg-white")
      }
    >
      <ScanBarcode className={active ? "size-4 text-green-600" : "size-4 text-slate-400"} />
      <span className="relative flex size-2">
        {flash && (
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-green-400" />
        )}
        <span
          className={
            "inline-flex size-2 rounded-full " +
            (active ? "bg-green-500" : "bg-slate-300")
          }
        />
      </span>
      {active ? (
        <span className="text-slate-600">
          Čtečka funguje{lastCode ? ` · poslední kód: ${lastCode}` : ""}
        </span>
      ) : (
        <span className="text-slate-500">
          Čtečka: zkus naskenovat libovolný kód pro ověření
        </span>
      )}
    </div>
  );
}
