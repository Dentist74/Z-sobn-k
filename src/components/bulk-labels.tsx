"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { barcodeUrl, type BarcodeSpec } from "@/lib/barcode";

export type LabelItem = { id: string; name: string; spec: BarcodeSpec };

const SIZES = {
  "50x30": { w: 50, h: 30, label: "50 × 30 mm" },
  "38x25": { w: 38, h: 25, label: "38 × 25 mm" },
  "62x29": { w: 62, h: 29, label: "62 × 29 mm (Brother DK-11209)" },
  "100x50": { w: 100, h: 50, label: "100 × 50 mm" },
} as const;
type SizeKey = keyof typeof SIZES;

export function BulkLabels({ products }: { products: LabelItem[] }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState(1);
  const [size, setSize] = useState<SizeKey>("62x29");
  const dim = SIZES[size];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.spec.text.toLowerCase().includes(needle),
    );
  }, [q, products]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function selectAllShown() {
    setSelected((prev) => new Set([...prev, ...filtered.map((p) => p.id)]));
  }

  const chosen = products.filter((p) => selected.has(p.id));
  const perItem = Math.max(1, Math.min(copies, 50));
  const toPrint: LabelItem[] = chosen.flatMap((p) => Array.from({ length: perItem }, () => p));

  return (
    <div>
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

      {/* Ovládání */}
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <Link href="/produkty" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="size-4" /> Zpět
          </Link>
          <div className="space-y-1.5">
            <Label htmlFor="copies">Kopií na položku</Label>
            <Input id="copies" type="number" min="1" max="50" value={copies}
              onChange={(e) => setCopies(Number(e.target.value) || 1)} className="w-28" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="size">Velikost štítku</Label>
            <select id="size" value={size} onChange={(e) => setSize(e.target.value as SizeKey)}
              className="border-input flex h-9 w-64 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs">
              {Object.entries(SIZES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => window.print()} disabled={chosen.length === 0}>
            <Printer className="size-4" /> Tisk ({toPrint.length})
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Hledat položku…" className="pl-9" />
          </div>
          <Button variant="outline" size="sm" onClick={selectAllShown}>
            Vybrat vše zobrazené ({filtered.length})
          </Button>
          {selected.size > 0 && (
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
              Zrušit výběr ({selected.size})
            </Button>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border bg-white">
          {filtered.map((p) => (
            <label key={p.id}
              className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50">
              <input type="checkbox" className="size-4" checked={selected.has(p.id)}
                onChange={() => toggle(p.id)} />
              <span className="flex-1">{p.name}</span>
              <span className="font-mono text-xs text-slate-400">{p.spec.text}</span>
            </label>
          ))}
        </div>

        <p className="text-sm text-slate-500">
          Vybráno {chosen.length} položek → {toPrint.length} štítků. V tiskovém dialogu
          zvol štítkovou tiskárnu a velikost {dim.label}.
        </p>
      </div>

      {/* Tisková plocha */}
      <div className="mt-4 flex flex-wrap gap-3">
        {toPrint.map((p, i) => {
          const img = barcodeUrl(p.spec, { scale: 4, height: 14, includetext: false });
          return (
            <div key={`${p.id}-${i}`} className="label rounded border bg-white text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Kód ${p.spec.text}`} />
              <span className="text-[2.4mm] tracking-wide">{p.spec.text}</span>
              <span className="text-[2.6mm] font-medium leading-tight line-clamp-2">{p.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
