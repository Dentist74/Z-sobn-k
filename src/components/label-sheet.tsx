"use client";

import { useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { barcodeUrl, type BarcodeSpec } from "@/lib/barcode";

const SIZES = {
  "50x30": { w: 50, h: 30, label: "50 × 30 mm" },
  "38x25": { w: 38, h: 25, label: "38 × 25 mm" },
  "100x50": { w: 100, h: 50, label: "100 × 50 mm" },
} as const;
type SizeKey = keyof typeof SIZES;

export function LabelSheet({
  name,
  sku,
  specs,
  initialIndex = 0,
  backHref,
}: {
  name: string;
  sku: string;
  specs: BarcodeSpec[]; // všechny kódy karty — na štítek jde vybrat kterýkoliv
  initialIndex?: number;
  backHref: string;
}) {
  const [count, setCount] = useState(1);
  const [size, setSize] = useState<SizeKey>("50x30");
  const [specIdx, setSpecIdx] = useState(Math.min(initialIndex, specs.length - 1));
  const dim = SIZES[size];
  const spec = specs[specIdx] ?? specs[0];

  // vyšší scale pro ostrý tisk
  const img = barcodeUrl(spec, { scale: 4, height: 14, includetext: false });

  const labels = Array.from({ length: Math.max(1, Math.min(count, 200)) });

  return (
    <div>
      {/* dynamický rozměr štítku pro tisk */}
      <style>{`
        @media print {
          @page { size: ${dim.w}mm ${dim.h}mm; margin: 0; }
          .no-print { display: none !important; }
          .label { page-break-after: always; }
        }
        .label {
          width: ${dim.w}mm; height: ${dim.h}mm;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1mm; padding: 1.5mm; box-sizing: border-box; overflow: hidden;
        }
        .label img { max-width: 100%; height: auto; }
      `}</style>

      <div className="no-print mb-6 flex flex-wrap items-end gap-4 border-b bg-white p-4">
        <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> Zpět
        </Link>
        <div className="space-y-1.5">
          <Label htmlFor="count">Počet štítků</Label>
          <Input id="count" type="number" min="1" max="200" value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)} className="w-28" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="size">Velikost štítku</Label>
          <select id="size" value={size} onChange={(e) => setSize(e.target.value as SizeKey)}
            className="border-input flex h-9 w-40 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs">
            {Object.entries(SIZES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        {specs.length > 1 && (
          <div className="space-y-1.5">
            <Label htmlFor="specIdx">Kód na štítku</Label>
            <select id="specIdx" value={specIdx} onChange={(e) => setSpecIdx(Number(e.target.value))}
              className="border-input flex h-9 w-48 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs">
              {specs.map((s, i) => (
                <option key={s.text} value={i}>
                  {s.text}{s.text === sku ? " (M-kód)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Tisk
        </Button>
        <p className="text-xs text-slate-400">
          V tiskovém dialogu vyber štítkovou tiskárnu a velikost papíru {dim.label}.
        </p>
      </div>

      <div className="no-print mb-2 px-4 text-sm text-slate-500">
        Náhled štítku ({dim.label}):
      </div>

      <div className="flex flex-wrap gap-3 px-4">
        {labels.map((_, i) => (
          <div key={i} className="label rounded border bg-white text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={`Kód ${spec.text}`} />
            <span className="text-[2.4mm] tracking-wide">{spec.text}</span>
            <span className="text-[2.6mm] font-medium leading-tight line-clamp-2">{name}</span>
          </div>
        ))}
      </div>
      <p className="no-print mt-4 px-4 text-xs text-slate-400">
        Kód: {spec.bcid.toUpperCase()} · obsah „{spec.text}"
        {spec.text === sku ? " (interní M-kód — vlastní čárový kód)" : ""}
      </p>
    </div>
  );
}
