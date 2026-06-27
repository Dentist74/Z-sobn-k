"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { UNITS, UNIT_LABELS } from "@/lib/enums";
import type { ProductFormState } from "@/app/actions/products";

const selectClass =
  "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

type Option = { id: string; name: string };

type Action = (
  prev: ProductFormState,
  formData: FormData,
) => Promise<ProductFormState>;

export type ProductLevel = {
  warehouseId: string;
  minQuantity: number;
  optimalQuantity: number;
};

export type ProductDefaults = {
  name?: string;
  sku?: string;
  manufacturerCode?: string | null;
  distributorCode?: string | null;
  category?: string | null;
  description?: string | null;
  unit?: string;
  piecesPerPackage?: number;
  packageLabel?: string | null;
  defaultWarehouseId?: string | null;
  defaultSupplierId?: string | null;
  minQuantity?: number;
  optimalQuantity?: number;
  reorderQuantity?: number;
  pricePurchase?: number;
  vatRate?: number;
  isMedicalDevice?: boolean;
  trackBatches?: boolean;
  trackLevels?: boolean;
  storageLocation?: string | null;
  active?: boolean;
  barcodes?: string[];
  levels?: ProductLevel[];
};

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

// Vygeneruje platný interní EAN-13 (prefix 299 = vnitřní použití) + kontrolní číslice.
function genEan13(): string {
  let d = "299";
  for (let i = 0; i < 9; i++) d += Math.floor(Math.random() * 10);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (i % 2 === 0 ? 1 : 3);
  return d + String((10 - (sum % 10)) % 10);
}

export function ProductForm({
  action,
  warehouses,
  suppliers,
  categories = [],
  defaultValues,
  submitLabel,
  cancelHref,
}: {
  action: Action;
  warehouses: Option[];
  suppliers: Option[];
  categories?: string[];
  defaultValues?: ProductDefaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<
    ProductFormState,
    FormData
  >(action, undefined);
  const dv = defaultValues ?? {};

  const [barcodes, setBarcodes] = useState<string[]>(dv.barcodes ?? []);
  const [newBarcode, setNewBarcode] = useState("");

  // název + auto-předvyplnění M-kódu (dokud uživatel SKU ručně neupraví)
  const [nameVal, setNameVal] = useState(dv.name ?? "");
  const [skuVal, setSkuVal] = useState(dv.sku ?? "");
  const [skuTouched, setSkuTouched] = useState(Boolean(dv.sku));
  const [categoryVal, setCategoryVal] = useState(dv.category ?? "");

  function onNameChange(v: string) {
    setNameVal(v);
    if (!skuTouched) setSkuVal(slugify(v));
  }

  // Návrh počtu ks v balení z názvu ("4x400g", "4 role", "80 ks").
  function guessPack(s: string): number {
    const m =
      s.match(/(\d+)\s*[x×]\s*\d+/i) ||
      s.match(/(\d+)\s*(?:rol[íeí]?|ks|kus[uůy]?|pcs|blistr[uůy]?)\b/i);
    const n = m ? Number(m[1]) : 0;
    return n > 1 ? n : 0;
  }
  const packSuggestion = guessPack(nameVal);

  // balení (Ano/Ne) + počet ks v balení
  const [packaged, setPackaged] = useState((dv.piecesPerPackage ?? 1) > 1);
  // balení + cena
  const [pcsPerPkg, setPcsPerPkg] = useState(String(dv.piecesPerPackage ?? 1));
  const [priceMode, setPriceMode] = useState<"piece" | "package">("piece");
  const [priceInput, setPriceInput] = useState(String(dv.pricePurchase ?? 0));
  const ppp = packaged && Number(pcsPerPkg) > 0 ? Number(pcsPerPkg) : 1;
  const perPiecePrice =
    priceMode === "package" ? (Number(priceInput) || 0) / ppp : Number(priceInput) || 0;
  const baseUnitLabel = UNIT_LABELS[(dv.unit ?? "PCS") as keyof typeof UNIT_LABELS] ?? "ks";

  // sledování hladin min/opt (lze vypnout → nepřipomíná se k doplnění)
  const [trackLevels, setTrackLevels] = useState(dv.trackLevels ?? true);

  // hladiny: mapa warehouseId → {min, opt}
  const [levels, setLevels] = useState<Record<string, ProductLevel>>(() => {
    const m: Record<string, ProductLevel> = {};
    for (const l of dv.levels ?? []) m[l.warehouseId] = l;
    return m;
  });

  function addBarcode() {
    const c = newBarcode.trim();
    if (c && !barcodes.includes(c)) setBarcodes([...barcodes, c]);
    setNewBarcode("");
  }

  function setLevel(warehouseId: string, field: "minQuantity" | "optimalQuantity", value: string) {
    setLevels((prev) => {
      const cur = prev[warehouseId] ?? {
        warehouseId,
        minQuantity: 0,
        optimalQuantity: 0,
      };
      return { ...prev, [warehouseId]: { ...cur, [field]: Number(value) || 0 } };
    });
  }

  // jen hladiny s nenulovou hodnotou ukládáme
  const levelsToSave = Object.values(levels).filter(
    (l) => l.minQuantity > 0 || l.optimalQuantity > 0,
  );

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <input type="hidden" name="barcodesJson" value={JSON.stringify(barcodes)} />
      <input type="hidden" name="levelsJson" value={JSON.stringify(levelsToSave)} />

      {/* Základní info */}
      <section className="space-y-5 rounded-lg border bg-white p-5">
        <h2 className="font-semibold text-slate-900">Základní informace</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Název položky</Label>
            <Input id="name" name="name" value={nameVal} required
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Nitrilové rukavice M" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku">M-kód (interní)</Label>
            <Input id="sku" name="sku" value={skuVal} required placeholder="RUK-NIT-M"
              onChange={(e) => { setSkuVal(e.target.value); setSkuTouched(true); }} />
            <p className="text-xs text-slate-400">Předvyplní se z názvu, můžeš přepsat.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manufacturerCode">Kód výrobce (REF)</Label>
            <Input id="manufacturerCode" name="manufacturerCode"
              defaultValue={dv.manufacturerCode ?? ""} placeholder="659730V" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="distributorCode">DL-kód (distributor)</Label>
            <Input id="distributorCode" name="distributorCode"
              defaultValue={dv.distributorCode ?? ""} placeholder="DEN659730" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Kategorie</Label>
            <Input id="category" name="category" value={categoryVal} list="cat-list"
              onChange={(e) => setCategoryVal(e.target.value)}
              placeholder="vyber nebo napiš novou" />
            <datalist id="cat-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit">Skladová jednotka</Label>
            <select id="unit" name="unit" defaultValue={dv.unit ?? "PCS"} className={selectClass}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{UNIT_LABELS[u]}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400">To nejmenší, co reálně vydáváš (obvykle ks).</p>
          </div>
        </div>

        {/* Balení */}
        <div className="rounded-md border bg-slate-50 p-4">
          <input type="hidden" name="piecesPerPackage" value={packaged ? pcsPerPkg : "1"} />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={packaged}
              onChange={(e) => setPackaged(e.target.checked)} />
            Kupuje se po balení (krabice) — výdej dál po kusech
          </label>
          {!packaged && packSuggestion > 1 && (
            <button type="button"
              onClick={() => { setPackaged(true); setPcsPerPkg(String(packSuggestion)); }}
              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Sparkles className="size-3" /> Z názvu to vypadá na balení po {packSuggestion} ks — zapnout
            </button>
          )}
          {packaged && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pcsPerPkg">Kolik kusů je v 1 balení</Label>
                <Input id="pcsPerPkg" type="number" step="any" min="1"
                  value={pcsPerPkg} onChange={(e) => setPcsPerPkg(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="packageLabel">Název balení</Label>
                <Input id="packageLabel" name="packageLabel"
                  defaultValue={dv.packageLabel ?? ""} placeholder="balení / krabice" />
              </div>
              <p className="text-xs text-slate-500 sm:col-span-2">
                Příklad: Optragate krabice = 80 ks → naskladníš „1 balení", vydáváš po
                kusech. Airflow 4×400 g → 1 balení = 4 ks (lahvičky).
              </p>
            </div>
          )}
        </div>

        {/* EANy */}
        <div className="space-y-2">
          <Label>Čárové kódy (EAN)</Label>
          <div className="flex flex-wrap gap-2">
            {barcodes.map((c) => (
              <span key={c} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs">
                {c}
                <button type="button" onClick={() => setBarcodes(barcodes.filter((x) => x !== c))}
                  className="text-slate-400 hover:text-red-600">
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {barcodes.length === 0 && (
              <span className="text-xs text-slate-400">Žádné kódy</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input value={newBarcode} onChange={(e) => setNewBarcode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBarcode(); } }}
              placeholder="Naskenuj nebo zadej EAN a stiskni Enter" className="max-w-xs" />
            <Button type="button" variant="outline" onClick={addBarcode}>
              <Plus className="size-4" /> Přidat
            </Button>
            <Button type="button" variant="outline"
              onClick={() => setBarcodes([...barcodes, genEan13()])}>
              <Sparkles className="size-4" /> Vygenerovat nový
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            „Vygenerovat nový" vytvoří vlastní interní EAN-13 (pro položky bez
            výrobcem přiděleného kódu) — pak ho vytiskneš na štítek.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Popis</Label>
          <textarea id="description" name="description" defaultValue={dv.description ?? ""}
            rows={3}
            className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs"
            placeholder="Popis položky…" />
        </div>
      </section>

      {/* Ceny a dodavatel */}
      <section className="space-y-5 rounded-lg border bg-white p-5">
        <h2 className="font-semibold text-slate-900">Ceny a dodavatel</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="priceInput">Nákupní cena bez DPH</Label>
            <input type="hidden" name="pricePurchase" value={perPiecePrice} />
            <div className="flex gap-2">
              <Input id="priceInput" type="number" step="any" min="0" value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)} />
              <select value={priceMode} className={selectClass + " w-32"}
                onChange={(e) => setPriceMode(e.target.value as "piece" | "package")}>
                <option value="piece">za kus</option>
                <option value="package">za balení</option>
              </select>
            </div>
            {priceMode === "package" && (
              <p className="text-xs text-slate-500">
                = {perPiecePrice.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč / {baseUnitLabel}
                {" "}(balení po {ppp} {baseUnitLabel})
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vatRate">Sazba DPH (%)</Label>
            <select id="vatRate" name="vatRate" defaultValue={dv.vatRate ?? 21} className={selectClass}>
              <option value="21">21 %</option>
              <option value="12">12 %</option>
              <option value="0">0 %</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultSupplierId">Preferovaný dodavatel</Label>
            <select id="defaultSupplierId" name="defaultSupplierId"
              defaultValue={dv.defaultSupplierId ?? ""} className={selectClass}>
              <option value="">— nevybráno —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultWarehouseId">Výchozí sklad</Label>
            <select id="defaultWarehouseId" name="defaultWarehouseId"
              defaultValue={dv.defaultWarehouseId ?? ""} className={selectClass}>
              <option value="">— nevybráno —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reorderQuantity">Množství k objednání</Label>
            <Input id="reorderQuantity" name="reorderQuantity" type="number" step="any" min="0"
              defaultValue={dv.reorderQuantity ?? 0} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="storageLocation">Umístění ve skladu</Label>
            <Input id="storageLocation" name="storageLocation"
              defaultValue={dv.storageLocation ?? ""} placeholder="např. A-3-2 (regál-police-pozice)" />
            <p className="text-xs text-slate-400">Kde položku ve skladu najdeš.</p>
          </div>
        </div>
      </section>

      {/* Hladiny zásob */}
      <section className="space-y-5 rounded-lg border bg-white p-5">
        <h2 className="font-semibold text-slate-900">Hladiny zásob</h2>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="trackLevels" className="size-4"
            checked={trackLevels} onChange={(e) => setTrackLevels(e.target.checked)} />
          Sledovat hladiny min./opt.
        </label>
        {!trackLevels ? (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Hladiny se u této položky nesledují — nebude se hlídat docházení ani
            připomínat doplnění.
          </p>
        ) : (
        <>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="minQuantity">Min. hladina (globální výchozí)</Label>
            <Input id="minQuantity" name="minQuantity" type="number" step="any" min="0"
              defaultValue={dv.minQuantity ?? 0} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="optimalQuantity">Optimální hladina (globální výchozí)</Label>
            <Input id="optimalQuantity" name="optimalQuantity" type="number" step="any" min="0"
              defaultValue={dv.optimalQuantity ?? 0} />
          </div>
        </div>

        {warehouses.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              Volitelně nastav min./opt. hladinu zvlášť pro konkrétní sklad
              (přepíše globální výchozí):
            </p>
            <div className="space-y-2">
              {warehouses.map((w) => {
                const l = levels[w.id];
                return (
                  <div key={w.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                    <span className="text-sm">{w.name}</span>
                    <Input type="number" step="any" min="0" placeholder="min"
                      value={l?.minQuantity ?? ""} className="w-24"
                      onChange={(e) => setLevel(w.id, "minQuantity", e.target.value)} />
                    <Input type="number" step="any" min="0" placeholder="opt"
                      value={l?.optimalQuantity ?? ""} className="w-24"
                      onChange={(e) => setLevel(w.id, "optimalQuantity", e.target.value)} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </>
        )}
      </section>

      {/* Vlastnosti */}
      <section className="space-y-3 rounded-lg border bg-white p-5">
        <h2 className="font-semibold text-slate-900">Vlastnosti</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isMedicalDevice" className="size-4"
            defaultChecked={dv.isMedicalDevice ?? false} />
          Zdravotnický prostředek (vyžaduje šarže a expiraci)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="trackBatches" className="size-4"
            defaultChecked={dv.trackBatches ?? true} />
          Sledovat šarže a expiraci
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" className="size-4"
            defaultChecked={dv.active ?? true} />
          Aktivní
        </label>
      </section>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : submitLabel}
        </Button>
        <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
          Zrušit
        </Link>
      </div>
    </form>
  );
}
