"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, X } from "lucide-react";

// Čárové kódy + QR + DataMatrix (bývá na dentálním materiálu), TRY_HARDER
// výrazně zlepší čtení menších/hůř nasvícených kódů z mobilu.
const SCAN_HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
    ],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

// Tlačítko, které otevře fotoaparát a naskenuje čárový/QR kód (Android i iOS).
// Vyžaduje HTTPS (nebo localhost) — jinak prohlížeč kameru nepustí.
export function CameraScanButton({
  onScan,
  className,
  label = "Fotoaparát",
}: {
  onScan: (code: string) => void;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    setError(null);
    const reader = new BrowserMultiFormatReader(SCAN_HINTS);
    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, _err, controls) => {
          controlsRef.current = controls;
          if (result && !stopped) {
            stopped = true;
            controls.stop();
            setOpen(false);
            onScan(result.getText());
          }
        },
      )
      .catch(() => {
        setError("Nepodařilo se spustit fotoaparát. Povol v prohlížeči přístup ke kameře.");
      });
    return () => {
      stopped = true;
      try { controlsRef.current?.stop(); } catch {}
    };
  }, [open, onScan]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Skenovat fotoaparátem"
        className={
          className ??
          "inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50"
        }
      >
        <Camera className="size-4" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-black">
            <video ref={videoRef} className="w-full" playsInline muted />
          </div>
          <p className="mt-3 text-sm text-white">Namiř fotoaparát na čárový kód…</p>
          {error && <p className="mt-1 max-w-md text-center text-sm text-red-300">{error}</p>}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-4 py-2 text-sm text-white hover:bg-white/25"
          >
            <X className="size-4" /> Zavřít
          </button>
        </div>
      )}
    </>
  );
}
