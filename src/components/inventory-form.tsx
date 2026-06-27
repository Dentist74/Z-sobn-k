"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ClipboardList, ScanBarcode, RotateCcw, Search, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDirty } from "@/components/nav-guard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  applyInventory,
  type InventoryReportRow,
} from "@/app/actions/inventory";

export type InventoryBatch = {
  id: string;
  productName: string;
  lotNumber: string | null;
  expiryLabel: string;
  warehouseName: string;
  systemQty: number;
  unitLabel: string;
  codes: string[];
};

export function InventoryForm({
  batches,
  userName,
}: {
  batches: InventoryBatch[];
  userName: string;
}) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [doneAt, setDoneAt] = useState<string>("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [report, setReport] = useState<InventoryReportRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [scan, setScan] = useState("");
  const [scanInfo, setScanInfo] = useState<{ ok: boolean; text: string } | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  // Rozdělaná inventura = chraň před opuštěním stránky.
  useDirty(started && !done);

  function start(fromZero: boolean) {
    setCounts(
      Object.fromEntries(batches.map((b) => [b.id, fromZero ? "0" : String(b.systemQty)])),
    );
    setReport(null);
    setDone(false);
    setStarted(true);
    if (fromZero) setTimeout(() => scanRef.current?.focus(), 50);
  }

  function resetToZero() {
    setCounts(Object.fromEntries(batches.map((b) => [b.id, "0"])));
    scanRef.current?.focus();
  }

  function onScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = scan.trim().toLowerCase();
    if (!code) return;
    const hit = batches.find((b) => b.codes.some((c) => c.toLowerCase() === code));
    if (!hit) {
      setScanInfo({ ok: false, text: `Kód „${scan}" není na skladě.` });
      setScan("");
      return;
    }
    setCounts((c) => ({ ...c, [hit.id]: String((Number(c[hit.id]) || 0) + 1) }));
    setScanInfo({ ok: true, text: `${hit.productName}: +1 → ${(Number(counts[hit.id]) || 0) + 1}` });
    setScan("");
  }

  function submit() {
    const items = batches.map((b) => ({
      batchId: b.id,
      counted: Number(counts[b.id]),
    }));
    startTransition(async () => {
      const res = await applyInventory(items);
      if (!res.ok) {
        toast.error(res.error ?? "Inventura selhala.");
        return;
      }
      setReport(res.report ?? []);
      setDone(true);
      setDoneAt(new Date().toLocaleString("cs-CZ"));
      if ((res.adjustedCount ?? 0) === 0) {
        toast.success("Inventura dokončena. Žádné nesrovnalosti. 🎉");
      } else {
        toast.success(`Inventura dokončena. Upraveno ${res.adjustedCount} šarží.`);
      }
    });
  }

  function printProtocol() {
    const rows = batches
      .map((b) => {
        const counted = Number(counts[b.id]);
        const diff = Number.isNaN(counted) ? 0 : counted - b.systemQty;
        const color = diff === 0 ? "#64748b" : diff > 0 ? "#16a34a" : "#dc2626";
        return `<tr>
          <td>${b.productName}</td>
          <td>${b.lotNumber ?? "—"} (${b.expiryLabel})</td>
          <td>${b.warehouseName}</td>
          <td style="text-align:right">${b.systemQty} ${b.unitLabel}</td>
          <td style="text-align:right">${Number.isNaN(counted) ? "" : counted}</td>
          <td style="text-align:right;color:${color}">${diff > 0 ? "+" : ""}${diff}</td>
        </tr>`;
      })
      .join("");
    const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8">
      <title>Protokol o inventuře</title>
      <style>
        body{font-family:system-ui,Arial,sans-serif;color:#0f172a;padding:24px;font-size:12px}
        h1{font-size:18px;margin:0 0 4px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left}
        th{background:#f1f5f9}
        .sig{margin-top:40px;display:flex;justify-content:space-between}
      </style></head><body>
      <h1>Protokol o inventuře</h1>
      <div>Svět úsměvů – sklad &middot; Datum: ${doneAt} &middot; Provedl/a: ${userName}</div>
      <table><thead><tr>
        <th>Položka</th><th>Šarže / expirace</th><th>Sklad</th>
        <th style="text-align:right">Systém</th><th style="text-align:right">Napočítáno</th><th style="text-align:right">Rozdíl</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <div class="sig"><div>Podpis odpovědné osoby: ______________________</div><div>Razítko:</div></div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  if (batches.length === 0) {
    return (
      <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Na skladě nejsou žádné šarže k inventuře.
      </p>
    );
  }

  // Úvodní obrazovka — položky se zobrazí až po zahájení.
  if (!started) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-[#103D63]/10 text-[#103D63]">
            <ClipboardList className="size-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900">Inventura skladu</h2>
            <p className="mt-1 text-sm text-slate-500">
              K inventuře je připraveno <strong>{batches.length}</strong> šarží. Po zahájení
              projdi sklad a u každé šarže zadej napočítané množství — buď ručně, nebo
              naskenuj každý kus čtečkou. Systém pak vytvoří korekce na rozdíly.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => start(false)}>
                <ClipboardList className="size-4" /> Zahájit inventuru (ručně)
              </Button>
              <Button variant="outline" onClick={() => start(true)}>
                <ScanBarcode className="size-4" /> Inventura čtečkou (od nuly)
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Skenování */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="scan" className="text-xs text-slate-500">
              Sken / vyhledání kódu (Enter přičte +1)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input id="scan" ref={scanRef} value={scan} onKeyDown={onScan}
                onChange={(e) => setScan(e.target.value)}
                placeholder="Naskenuj čárový kód…" className="pl-9" />
            </div>
          </div>
          <Button variant="outline" onClick={resetToZero} type="button">
            <RotateCcw className="size-4" /> Vynulovat napočítané
          </Button>
        </div>
        {scanInfo && (
          <p className={"mt-2 text-sm " + (scanInfo.ok ? "text-green-700" : "text-red-600")}>
            {scanInfo.text}
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Položka</TableHead>
              <TableHead>Šarže</TableHead>
              <TableHead>Sklad</TableHead>
              <TableHead className="text-right">Systém</TableHead>
              <TableHead className="w-40 text-right">Napočítáno</TableHead>
              <TableHead className="text-right">Rozdíl</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => {
              const counted = Number(counts[b.id]);
              const diff = Number.isNaN(counted) ? 0 : counted - b.systemQty;
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.productName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {b.lotNumber ?? "—"}
                    <span className="block text-slate-400">{b.expiryLabel}</span>
                  </TableCell>
                  <TableCell className="text-slate-500">{b.warehouseName}</TableCell>
                  <TableCell className="text-right">
                    {b.systemQty} {b.unitLabel}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input type="number" step="any" min="0" value={counts[b.id] ?? ""}
                      onChange={(e) => setCounts((c) => ({ ...c, [b.id]: e.target.value }))}
                      className="text-right" />
                  </TableCell>
                  <TableCell
                    className={
                      diff === 0
                        ? "text-right text-slate-400"
                        : diff > 0
                          ? "text-right font-medium text-green-600"
                          : "text-right font-medium text-red-600"
                    }
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Button onClick={submit} disabled={pending}>
        {pending ? "Ukládám inventuru…" : "Dokončit inventuru"}
      </Button>

      {report && (
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Report nesrovnalostí</h2>
            <Button variant="outline" size="sm" onClick={printProtocol}>
              <Printer className="size-4" /> Tisk protokolu
            </Button>
          </div>
          {report.length === 0 ? (
            <p className="text-sm text-green-700">
              Vše souhlasí, žádné korekce nebyly potřeba.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {report.map((r) => (
                <li key={r.batchId} className="flex justify-between">
                  <span>
                    {r.productName} ({r.lotNumber ?? "bez šarže"}): systém {r.systemQty} →
                    napočítáno {r.countedQty}
                  </span>
                  <span className={r.diff > 0 ? "font-medium text-green-600" : "font-medium text-red-600"}>
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
