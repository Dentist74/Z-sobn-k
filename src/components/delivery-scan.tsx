"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanLine, Plus, Check, X, FilePlus, Link2, RefreshCw, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductPicker, type PickerProduct } from "@/components/product-picker";
import { compressImage } from "@/lib/image";
import {
  scanDeliveryNote,
  matchScanLine,
  createProductFromScan,
  updateReferencePrice,
  type ScannedItem,
} from "@/app/actions/ai";
import { formatCZK } from "@/lib/format";

type AddPayload = {
  productId: string;
  quantity: number;
  unitPrice: number | null;
  name?: string;
  sku?: string;
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;

function diffOf(unit: number | null, stored: number | null): number | null {
  if (stored && stored > 0 && unit != null) {
    return Math.round(((unit - stored) / stored) * 1000) / 10;
  }
  return null;
}

export function DeliveryScan({
  onAdd,
  products,
  canManage,
  mobile = false,
}: {
  onAdd: (p: AddPayload) => void;
  products: PickerProduct[];
  canManage: boolean;
  // Pracovní mód: velké modré akční tlačítko „Vyfotit" přes celou šířku.
  mobile?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<ScannedItem[] | null>(null);
  const [supplier, setSupplier] = useState<string | null>(null);
  const [matchingIdx, setMatchingIdx] = useState<number | null>(null);
  // řádky už přidané do příjemky — zmizí z nabídky „Z dokladu"
  const [addedIdx, setAddedIdx] = useState<Set<number>>(new Set());
  // náhled vyfocené/vybrané faktury před odesláním do AI
  const [preview, setPreview] = useState<
    { dataUrl: string; base64: string; mediaType: (typeof ALLOWED)[number] } | null
  >(null);

  function patchRow(i: number, patch: Partial<ScannedItem>) {
    setRows((prev) =>
      prev ? prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : prev,
    );
  }

  // 1) vyber/vyfoť → ukáže náhled (nic se ještě neposílá do AI)
  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Nahraj fotku (JPG/PNG). PDF zatím vyfoť jako obrázek.");
      return;
    }
    try {
      // zmenšení v telefonu → menší přenos, rychlejší a levnější AI
      const { dataUrl, base64 } = await compressImage(file);
      setPreview({ dataUrl, base64, mediaType: "image/jpeg" });
    } catch {
      toast.error("Obrázek se nepodařilo zpracovat. Zkus to znovu.");
    }
  }

  // 2) potvrzení náhledu → teprve teď rozpoznání přes AI
  function runScan() {
    if (!preview) return;
    const { base64, mediaType } = preview;
    start(async () => {
      const res = await scanDeliveryNote({ imageBase64: base64, mediaType });
      if (!res.ok) {
        toast.error(res.error ?? "Sken selhal.");
        return;
      }
      setRows(res.items ?? []);
      setSupplier(res.supplierName ?? null);
      setMatchingIdx(null);
      setAddedIdx(new Set());
      setPreview(null);
      toast.success(`Načteno ${res.items?.length ?? 0} položek z dokladu.`);
    });
  }

  function diffBadge(it: ScannedItem) {
    if (it.diffPct == null) return null;
    if (Math.abs(it.diffPct) < 0.5) {
      return <Badge variant="secondary">cena beze změny</Badge>;
    }
    const up = it.diffPct > 0;
    return (
      <Badge className={up ? "bg-red-500 text-white" : "bg-green-600 text-white"}>
        {up ? "↑" : "↓"} {Math.abs(it.diffPct)} %
      </Badge>
    );
  }

  // Ruční napárování na existující kartu (uloží alias dodavatele).
  // renameTo: volitelně přepíše název karty na fakturní.
  function doMatch(i: number, productId: string, renameTo?: string | null) {
    const row = rows![i];
    start(async () => {
      const res = await matchScanLine({
        productId,
        code: row.code,
        name: row.name,
        supplierName: supplier,
        renameTo: renameTo ?? null,
      });
      if (!res.ok) { toast.error(res.error ?? "Párování selhalo."); return; }
      patchRow(i, {
        productId: res.productId!,
        productName: res.productName!,
        productSku: res.productSku!,
        storedPrice: res.storedPrice ?? null,
        diffPct: diffOf(row.unitPriceExclVat, res.storedPrice ?? null),
        matchedByAlias: true,
      });
      setMatchingIdx(null);
      toast.success(renameTo ? "Napárováno a karta přejmenována." : "Napárováno a zapamatováno pro příště.");
      if (renameTo) router.refresh();
    });
  }

  // Založení nové karty z řádku.
  function doCreate(i: number) {
    const row = rows![i];
    start(async () => {
      const res = await createProductFromScan({
        name: row.name,
        code: row.code,
        unitPriceExclVat: row.unitPriceExclVat,
        supplierName: supplier,
        packGuess: row.packGuess,
      });
      if (!res.ok) { toast.error(res.error ?? "Založení karty selhalo."); return; }
      patchRow(i, {
        productId: res.productId!,
        productName: res.productName!,
        productSku: res.productSku!,
        storedPrice: res.storedPrice ?? null,
        diffPct: 0,
      });
      toast.success(`Karta „${res.productName}" vytvořena.`);
      router.refresh();
    });
  }

  // Přepis výchozí ceny na kartě (jen budoucnost).
  function doUpdatePrice(i: number) {
    const row = rows![i];
    if (!row.productId || row.unitPriceExclVat == null) return;
    start(async () => {
      const res = await updateReferencePrice(row.productId!, row.unitPriceExclVat!);
      if (!res.ok) { toast.error(res.error ?? "Změna ceny selhala."); return; }
      patchRow(i, { storedPrice: row.unitPriceExclVat, diffPct: 0 });
      toast.success("Výchozí cena na kartě aktualizována.");
      router.refresh();
    });
  }

  function add(it: ScannedItem, i: number) {
    if (!it.productId || addedIdx.has(i)) return;
    onAdd({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPriceExclVat,
      name: it.productName ?? it.name,
      sku: it.productSku ?? undefined,
    });
    setAddedIdx((prev) => new Set(prev).add(i));
  }

  // počet napárovaných, které ještě nebyly přidány do příjemky
  const pendingMatched =
    rows?.map((it, i) => ({ it, i })).filter(({ it, i }) => it.productId && !addedIdx.has(i)) ?? [];
  const matchedCount = pendingMatched.length;

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <ScanLine className="size-4" />
          Načíst z dodacího listu (AI)
        </div>
        <label className={mobile ? "w-full cursor-pointer" : "cursor-pointer"}>
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          {mobile ? (
            <span className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#103D63] text-base font-semibold text-white active:scale-[0.98]">
              <Camera className="size-5" /> {pending ? "Pracuji…" : "Vyfotit"}
            </span>
          ) : (
            <span className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50">
              {pending ? "Pracuji…" : "Vybrat / vyfotit"}
            </span>
          )}
        </label>
      </div>

      {preview && (
        <div className="space-y-2 rounded-md border bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-700">Je fotka v pořádku?</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.dataUrl} alt="Náhled dokladu"
            className="max-h-72 w-auto rounded border" />
          <p className="text-xs text-slate-500">
            Zkontroluj, že je čitelná a není rozmazaná. Pak spusť rozpoznání.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={runScan} disabled={pending}>
              {pending ? "Rozpoznávám…" : "Použít a rozpoznat"}
            </Button>
            <Button type="button" variant="outline" disabled={pending}
              onClick={() => setPreview(null)}>
              Vyfotit / vybrat znovu
            </Button>
          </div>
        </div>
      )}

      {supplier && (
        <p className="text-xs text-slate-500">Dodavatel z dokladu: {supplier}</p>
      )}

      {rows && (
        <>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Z dokladu</TableHead>
                  <TableHead className="text-right">Množ.</TableHead>
                  <TableHead className="text-right">Cena/ks bez DPH</TableHead>
                  <TableHead>Karta / změna</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-500">Nic nenačteno.</TableCell></TableRow>
                )}
                {rows.map((it, i) => {
                  if (addedIdx.has(i)) return null;
                  return (
                  <TableRow key={i}>
                    <TableCell>
                      <span className="font-medium">{it.name}</span>
                      {it.code && <span className="block font-mono text-xs text-slate-400">{it.code}</span>}
                    </TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">
                      {it.unitPriceExclVat != null ? formatCZK(it.unitPriceExclVat) : "—"}
                    </TableCell>
                    <TableCell>
                      {it.productId ? (
                        <div className="space-y-1">
                          <span className="flex items-center gap-1 text-sm">
                            <Check className="size-3.5 text-green-600" />
                            {it.productName}
                            {it.matchedByAlias && (
                              <Badge variant="outline" className="text-[10px]">alias</Badge>
                            )}
                          </span>
                          <span className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {it.storedPrice != null && <>uloženo {formatCZK(it.storedPrice)}</>}
                            {diffBadge(it)}
                            {canManage && it.diffPct != null && Math.abs(it.diffPct) >= 0.5 && it.unitPriceExclVat != null && (
                              <button type="button" disabled={pending}
                                onClick={() => doUpdatePrice(i)}
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline disabled:opacity-50">
                                <RefreshCw className="size-3" /> aktualizovat cenu
                              </button>
                            )}
                          </span>
                        </div>
                      ) : matchingIdx === i ? (
                        <div className="space-y-1">
                          <ProductPicker
                            products={products}
                            value={null}
                            onChange={(p) => p && doMatch(i, p.id)}
                          />
                          <button type="button" className="text-xs text-slate-400 hover:text-slate-700"
                            onClick={() => setMatchingIdx(null)}>zrušit</button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {it.suggestion && (
                            <div className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-sm">
                              <span className="text-slate-600">Možná shoda: </span>
                              <span className="font-medium">{it.suggestion.productName}</span>
                              <span className="ml-1 font-mono text-xs text-slate-400">
                                {it.suggestion.productSku}
                              </span>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <button type="button" disabled={pending}
                                  onClick={() => doMatch(i, it.suggestion!.productId)}
                                  className="inline-flex items-center gap-1 text-blue-700 hover:underline disabled:opacity-50">
                                  <Link2 className="size-3.5" /> Ano, spárovat
                                </button>
                                {canManage && (
                                  <button type="button" disabled={pending}
                                    onClick={() => doMatch(i, it.suggestion!.productId, it.name)}
                                    className="inline-flex items-center gap-1 text-blue-700 hover:underline disabled:opacity-50"
                                    title={`Přejmenovat kartu na: ${it.name}`}>
                                    spárovat a přejmenovat na fakturní
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="flex items-center gap-1 text-amber-600">
                              <X className="size-3.5" /> nenapárováno
                            </span>
                            <button type="button" disabled={pending}
                              onClick={() => setMatchingIdx(i)}
                              className="inline-flex items-center gap-1 text-slate-600 hover:underline disabled:opacity-50">
                              <Link2 className="size-3.5" /> {it.suggestion ? "napárovat jinou" : "napárovat"}
                            </button>
                            {canManage && (
                              <button type="button" disabled={pending}
                                onClick={() => doCreate(i)}
                                className="inline-flex items-center gap-1 text-slate-600 hover:underline disabled:opacity-50">
                                <FilePlus className="size-3.5" /> založit kartu
                              </button>
                            )}
                            {it.packGuess && (
                              <span className="text-xs text-slate-400">
                                (návrh balení: {it.packGuess} ks)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {it.productId && (
                        <button type="button" aria-label="Přidat do příjemky"
                          onClick={() => add(it, i)}
                          className="text-slate-400 hover:text-slate-900">
                          <Plus className="size-4" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {matchedCount > 0 && (
            <Button type="button" variant="outline" size="sm"
              onClick={() => pendingMatched.forEach(({ it, i }) => add(it, i))}>
              <Plus className="size-4" /> Přidat vše napárované ({matchedCount})
            </Button>
          )}
          <p className="text-xs text-slate-400">
            Ceny jsou přepočteny na cenu za kus bez DPH. Množství a balení zkontroluj
            před uložením — ceny ber jako návrh ke kontrole.
          </p>
        </>
      )}
    </div>
  );
}
