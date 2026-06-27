"use client";

import { useState, useTransition } from "react";
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

  const [importPrice, setImportPrice] = useState(true);
  const [importVat, setImportVat] = useState(true);
  const [importStock, setImportStock] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");

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
      });
    };
    reader.readAsDataURL(file);
  }

  function doImport() {
    if (!records) return;
    start(async () => {
      const res = await runImport(records, { importStock, importPrice, importVat, warehouseId });
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
      router.push("/produkty");
    });
  }

  function reset() {
    setRecords(null);
    setSummary(null);
  }

  if (!records) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 p-10 text-center hover:border-slate-300">
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <Upload className="size-8 text-slate-400" />
          <span className="font-medium text-slate-700">
            {pending ? "Načítám…" : "Vyber export z Evidentistu (.xlsx)"}
          </span>
          <span className="text-sm text-slate-400">
            Nahraje se jen pro náhled — nic se neuloží, dokud import nepotvrdíš.
          </span>
        </label>
      </div>
    );
  }

  const preview = records.slice(0, 12);

  return (
    <div className="space-y-5">
      {summary && (
        <div className="rounded-lg border bg-white p-4 text-sm">
          Nalezeno <strong>{summary.total}</strong> položek:{" "}
          <strong className="text-green-700">{summary.created} nových</strong>,{" "}
          <strong className="text-amber-700">{summary.existing} existujících</strong>{" "}
          (spárováno podle M-kódu, jen se aktualizují).
        </div>
      )}

      {/* Volby */}
      <div className="space-y-3 rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Co naimportovat</h3>
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={importStock}
            onChange={(e) => setImportStock(e.target.checked)} />
          Počáteční stavy zásob (vytvoří se jako úprava skladu)
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
        <p className="text-xs text-slate-400">
          Název, M-kód, kód výrobce, čárové kódy, dodavatel a balení se importují vždy.
          Zásoba se u položek, které už mají skladové pohyby, přeskočí (kvůli dohledatelnosti).
        </p>
      </div>

      {/* Náhled */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>M-kód</TableHead>
              <TableHead>Dodavatel</TableHead>
              <TableHead className="text-right">Balení</TableHead>
              <TableHead className="text-right">Skladem</TableHead>
              <TableHead className="text-right">Cena bez DPH</TableHead>
              <TableHead className="text-right">DPH</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                <TableCell className="text-slate-500">{r.supplierName ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {r.packaged ? `${r.piecesPerPackage} ks/bal.` : "ks"}
                </TableCell>
                <TableCell className="text-right">{r.stockQty}</TableCell>
                <TableCell className="text-right">{r.priceExclVat}</TableCell>
                <TableCell className="text-right">{r.vatRate} %</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {records.length > preview.length && (
          <p className="px-4 py-2 text-xs text-slate-400">
            …a dalších {records.length - preview.length} položek.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={doImport} disabled={pending || (importStock && !warehouseId)}>
          <Check className="size-4" /> {pending ? "Importuji…" : `Importovat ${records.length} položek`}
        </Button>
        <Button variant="outline" onClick={reset} disabled={pending}>
          <RotateCcw className="size-4" /> Vybrat jiný soubor
        </Button>
      </div>
    </div>
  );
}
