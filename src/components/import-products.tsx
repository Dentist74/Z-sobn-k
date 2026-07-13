"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseImport, runImport } from "@/app/actions/import";
import type { ImportRecord } from "@/lib/import-evidentist";

const selectClass =
  "border-input flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

export function ImportProducts({
  warehouses,
}: {
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [records, setRecords] = useState<ImportRecord[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; existing: number; created: number } | null>(null);
  const [skip, setSkip] = useState<Set<number>>(new Set()); // indexy, které NEimportovat

  const [importPrice, setImportPrice] = useState(true);
  const [importVat, setImportVat] = useState(true);
  const [importStock, setImportStock] = useState(true);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");

  const selectedCount = useMemo(
    () => (records ? records.length - skip.size : 0),
    [records, skip],
  );

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      start(async () => {
        const res = await parseImport(base64);
        if (!res.ok) {
          toast.error(res.error ?? "Načtení selhalo.");
          return;
        }
        setRecords(res.records ?? []);
        setSummary(res.summary ?? null);
        setSkip(new Set());
      });
    };
    reader.readAsDataURL(file);
  }

  function doImport() {
    if (!records) return;
    const chosen = records.filter((_, i) => !skip.has(i));
    if (chosen.length === 0) { toast.error("Není vybrána žádná položka."); return; }
    start(async () => {
      const res = await runImport(chosen, { importStock, importPrice, importVat, warehouseId });
      if (!res.ok) {
        toast.error(res.error ?? "Import selhal.");
        return;
      }
      const parts = [`nových: ${res.created}`, `aktualizovaných: ${res.updated}`];
      if (importStock) parts.push(`zásoba nastavena: ${res.stockSet}`);
      if (res.skippedStock) parts.push(`zásoba přeskočena (už měla pohyby): ${res.skippedStock}`);
      toast.success(`Hotovo — ${parts.join(", ")}.`);
      setRecords(null);
      setSummary(null);
      setSkip(new Set());
      router.push("/produkty");
    });
  }

  function reset() {
    setRecords(null);
    setSummary(null);
    setSkip(new Set());
  }

  function toggle(i: number) {
    setSkip((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  }
  function toggleAll() {
    if (!records) return;
    setSkip((p) => (p.size === 0 ? new Set(records.map((_, i) => i)) : new Set()));
  }

  if (!records) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 p-10 text-center hover:border-slate-300">
          <input
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <Upload className="size-8 text-slate-400" />
          <span className="font-medium text-slate-700">
            {pending ? "Načítám…" : "Vyber export z Evidentistu (.xlsx / .csv)"}
          </span>
          <span className="text-sm text-slate-400">
            Nahraje se jen pro náhled — nic se neuloží, dokud import nepotvrdíš.
          </span>
        </label>
      </div>
    );
  }

  const allChosen = skip.size === 0;

  return (
    <div className="space-y-5">
      {summary && (
        <div className="rounded-lg border bg-white p-4 text-sm">
          V souboru <strong>{summary.total}</strong> položek:{" "}
          <strong className="text-green-700">{summary.created} nových</strong>,{" "}
          <strong className="text-amber-700">{summary.existing} existujících</strong>{" "}
          (spáruje se podle M-kódu, u položek bez M-kódu podle názvu).
        </div>
      )}

      {/* Volby */}
      <div className="space-y-3 rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Co naimportovat</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={importStock}
            onChange={(e) => setImportStock(e.target.checked)} />
          Počty ks skladem (vytvoří se jako počáteční stav)
        </label>
        {importStock && (
          <div className="flex items-center gap-2 pl-6 text-sm">
            <span className="text-slate-500">do skladu:</span>
            <select value={warehouseId} className={selectClass}
              onChange={(e) => setWarehouseId(e.target.value)}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={importPrice}
            onChange={(e) => setImportPrice(e.target.checked)} />
          Nákupní ceny (bez DPH)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={importVat}
            onChange={(e) => setImportVat(e.target.checked)} />
          Sazby DPH
        </label>
        <p className="text-xs text-slate-400">
          Název, M-kód, kódy, čárové kódy, dodavatel a balení se importují vždy.
          Zásoba se u položek, které už mají skladové pohyby, přeskočí (kvůli dohledatelnosti).
        </p>
      </div>

      {/* Výběr položek */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
          <span className="font-medium text-slate-700">
            Vybráno {selectedCount} z {records.length}
          </span>
          <button type="button" onClick={toggleAll} className="text-[#103D63] hover:underline">
            {allChosen ? "Odznačit vše" : "Vybrat vše"}
          </button>
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input type="checkbox" className="size-4" checked={allChosen} onChange={toggleAll} />
                </TableHead>
                <TableHead>Název</TableHead>
                <TableHead>M-kód</TableHead>
                <TableHead>Dodavatel</TableHead>
                <TableHead className="text-right">Balení</TableHead>
                <TableHead className="text-right">Skladem</TableHead>
                <TableHead className="text-right">Cena bez DPH</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r, i) => {
                const chosen = !skip.has(i);
                return (
                  <TableRow key={i} className={chosen ? "" : "opacity-40"}>
                    <TableCell>
                      <input type="checkbox" className="size-4" checked={chosen} onChange={() => toggle(i)} />
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.sku || "—"}</TableCell>
                    <TableCell className="text-slate-500">{r.supplierName ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {r.packaged ? `${r.piecesPerPackage} ks/bal.` : "ks"}
                    </TableCell>
                    <TableCell className="text-right">{r.stockQty}</TableCell>
                    <TableCell className="text-right">{r.priceExclVat}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={doImport} disabled={pending || selectedCount === 0 || (importStock && !warehouseId)}>
          <Check className="size-4" /> {pending ? "Importuji…" : `Importovat ${selectedCount} položek`}
        </Button>
        <Button variant="outline" onClick={reset} disabled={pending}>
          <RotateCcw className="size-4" /> Vybrat jiný soubor
        </Button>
      </div>
    </div>
  );
}
