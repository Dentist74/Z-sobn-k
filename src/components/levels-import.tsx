"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseLevels, runLevelsImport } from "@/app/actions/import";
import type { LevelRecord } from "@/lib/import-levels";

export function LevelsImport() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [records, setRecords] = useState<LevelRecord[] | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      start(async () => {
        const res = await parseLevels(base64);
        if (!res.ok) { toast.error(res.error ?? "Načtení selhalo."); return; }
        setRecords(res.records ?? []);
      });
    };
    reader.readAsDataURL(file);
  }

  function run() {
    if (!records) return;
    start(async () => {
      const res = await runLevelsImport(records);
      if (!res.ok) { toast.error(res.error ?? "Import selhal."); return; }
      toast.success(
        `Hladiny doplněny u ${res.updated} položek${res.notFound ? `, nenalezeno ${res.notFound} M-kódů` : ""}.`,
      );
      setRecords(null);
      router.push("/produkty");
    });
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="font-semibold text-slate-900">Import hladin (min / opt)</h2>
      <p className="mt-1 mb-4 text-sm text-slate-500">
        Tabulka (.xlsx) se sloupci <strong>M-kód</strong>, <strong>Minimum</strong>,{" "}
        <strong>Optimum</strong>. Spáruje se podle M-kódu a doplní hladiny u existujících karet.
        (Evidentist hladiny neexportuje — soubor připravíme zvlášť.)
      </p>

      {!records ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-8 text-center hover:border-slate-300">
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          <Upload className="size-7 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            {pending ? "Načítám…" : "Vyber soubor s hladinami (.xlsx)"}
          </span>
        </label>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            Nalezeno <strong>{records.length}</strong> řádků s M-kódem. Doplní se min/opt
            u odpovídajících karet.
          </p>
          <div className="flex gap-2">
            <Button onClick={run} disabled={pending}>
              <Check className="size-4" /> {pending ? "Importuji…" : `Doplnit hladiny (${records.length})`}
            </Button>
            <Button variant="outline" onClick={() => setRecords(null)} disabled={pending}>
              <RotateCcw className="size-4" /> Jiný soubor
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
