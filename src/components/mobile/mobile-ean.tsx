"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Barcode, Printer, RotateCcw, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { assignGeneratedEan, createProductForEan } from "@/app/actions/products";
import { barcodeUrl } from "@/lib/barcode";
import { MobileItemSearch, type MobileProduct } from "@/components/mobile/mobile-ui";

// Přidělení EAN: najdi položku → vygeneruj interní EAN-13 → vytiskni štítek.
export function MobileEan({ products }: { products: MobileProduct[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<MobileProduct | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Založí novou kartu přímo tady (zůstáváme v pracovním módu) a rovnou
  // jí vygeneruje EAN — detaily karty se doplní později ve správním módu.
  function createNew() {
    const name = newName.trim();
    if (name.length < 2) { toast.error("Zadej název materiálu."); return; }
    start(async () => {
      const created = await createProductForEan(name);
      if (!created.ok || !created.id) { toast.error(created.error ?? "Založení selhalo."); return; }
      const ean = await assignGeneratedEan(created.id);
      setSelected({ id: created.id, name, sku: created.sku ?? "", unit: "PCS", codes: [] });
      if (ean.ok && ean.code) {
        setNewCode(ean.code);
        toast.success("Karta založena a EAN vygenerován.");
      } else {
        toast.success("Karta založena — vygeneruj jí EAN.");
      }
      setCreateOpen(false);
      setNewName("");
      router.refresh();
    });
  }

  function generate() {
    if (!selected) return;
    start(async () => {
      const res = await assignGeneratedEan(selected.id);
      if (!res.ok || !res.code) { toast.error(res.error ?? "Generování selhalo."); return; }
      setNewCode(res.code);
      toast.success("EAN vygenerován a uložen na kartu.");
      router.refresh();
    });
  }

  if (selected) {
    const eans = selected.codes.filter((c) => /^\d{8}$|^\d{13}$/.test(c));
    const shown = newCode ?? eans[0] ?? null;
    return (
      <div className="space-y-3">
        <div className="space-y-3 rounded-2xl border bg-white p-4">
          <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>

          {shown ? (
            <div className="space-y-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={barcodeUrl({ text: shown, bcid: "ean13" })} alt={shown}
                className="mx-auto max-h-24" />
              <p className="font-mono text-sm text-slate-600">{shown}</p>
              {!newCode && <p className="text-xs text-slate-400">Položka už čárový kód má.</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Položka zatím nemá žádný čárový kód.</p>
          )}

          <div className="space-y-2">
            {!shown && (
              <button type="button" onClick={generate} disabled={pending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#103D63] text-base font-semibold text-white disabled:opacity-50 active:scale-[0.98]">
                <Barcode className="size-5" /> {pending ? "Generuji…" : "Vygenerovat EAN kód"}
              </button>
            )}
            {shown && (
              <Link href={`/stitek/${selected.id}`} target="_blank"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-base font-semibold text-white active:scale-[0.98]">
                <Printer className="size-5" /> Vytisknout štítek
              </Link>
            )}
          </div>
        </div>

        <button type="button" onClick={() => { setSelected(null); setNewCode(null); }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-white text-base font-semibold text-slate-700 active:scale-[0.98]">
          <RotateCcw className="size-5" /> Další položka
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-white p-3">
        <MobileItemSearch products={products} onPick={setSelected} placeholder="Najdi materiál…" />
      </div>
      {createOpen ? (
        <div className="space-y-2 rounded-2xl border bg-white p-3">
          <p className="text-sm font-medium text-slate-600">Nová položka</p>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Název materiálu…" className="h-12 text-base" autoFocus />
          <button type="button" onClick={createNew} disabled={pending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#103D63] text-base font-semibold text-white disabled:opacity-50 active:scale-[0.98]">
            <Plus className="size-5" /> {pending ? "Zakládám…" : "Založit a vygenerovat EAN"}
          </button>
          <button type="button" onClick={() => setCreateOpen(false)}
            className="w-full text-center text-sm text-slate-500 underline">Zrušit</button>
          <p className="text-xs text-slate-400">
            Detaily karty (cena, balení, hladiny) se doplní později ve správním módu.
          </p>
        </div>
      ) : (
        <button type="button" onClick={() => setCreateOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white text-base font-medium text-slate-600 active:scale-[0.98]">
          <Plus className="size-5" /> Materiál tu ještě není? Založit novou kartu
        </button>
      )}
    </div>
  );
}
