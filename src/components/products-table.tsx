"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MoreVertical, Pencil, Power, Trash2, SlidersHorizontal, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleProductActive, deleteProduct, bulkUpdateProducts } from "@/app/actions/products";

export type ProductRowVM = {
  id: string;
  name: string;
  sku: string;
  codes: string[];
  category: string | null;
  totalQtyLabel: string;
  minQtyLabel: string;
  optQtyLabel: string;
  valueLabel: string;
  belowMin: boolean;
  isZero: boolean;
  expiringSoon: boolean;
  expired: boolean;
  nearestExpiryLabel: string;
  active: boolean;
  byWh: Record<
    string,
    { qtyLabel: string; minQtyLabel: string; optQtyLabel: string; valueLabel: string; belowMin: boolean; isZero: boolean }
  >;
};

const selectClass =
  "border-input flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

export function ProductsTable({
  rows,
  warehouses,
  suppliers = [],
  showPrices,
  canManage,
}: {
  rows: ProductRowVM[];
  warehouses: { id: string; name: string }[];
  suppliers?: { id: string; name: string }[];
  showPrices: boolean;
  canManage: boolean;
}) {
  const [q, setQ] = useState("");
  const [wh, setWh] = useState("");
  const [avail, setAvail] = useState(""); // "" | below | zero | expiring
  const [cat, setCat] = useState("");
  const [activeFilter, setActiveFilter] = useState("active"); // active | inactive | all
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // hromadná úprava — pole (prázdné = neměnit)
  const [bCat, setBCat] = useState("");
  const [bSup, setBSup] = useState("");
  const [bMin, setBMin] = useState("");
  const [bOpt, setBOpt] = useState("");
  const [bPrice, setBPrice] = useState("");
  const [bTrack, setBTrack] = useState("");

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeFilter === "active" && !r.active) return false;
      if (activeFilter === "inactive" && r.active) return false;
      if (wh && !r.byWh[wh]) return false;
      if (cat && r.category !== cat) return false;
      if (avail === "below" && !r.belowMin) return false;
      if (avail === "zero" && !r.isZero) return false;
      if (avail === "expiring" && !(r.expiringSoon || r.expired)) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.sku.toLowerCase().includes(needle) ||
        r.codes.some((c) => c.toLowerCase().includes(needle))
      );
    });
  }, [q, wh, avail, cat, activeFilter, rows]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && filtered.length === 1) router.push(`/produkty/${filtered[0].id}`);
  }

  function deactivate(id: string) {
    startTransition(async () => {
      const res = await toggleProductActive(id);
      if (!res.ok) { toast.error(res.error ?? "Akce selhala."); return; }
      router.refresh();
    });
  }
  function remove(id: string, name: string) {
    if (!confirm(`Smazat položku „${name}"? Pokud má historii, jen se deaktivuje.`)) return;
    startTransition(async () => {
      const res = await deleteProduct(id);
      if (!res.ok) { toast.error(res.error ?? "Smazání selhalo."); return; }
      if (res.deactivated) toast.info(res.error ?? "Položka deaktivována.");
      else toast.success("Položka smazána.");
      router.refresh();
    });
  }

  function toggleSel(id: string) {
    setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll() {
    const allSel = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
    setSelected(allSel ? new Set() : new Set(filtered.map((r) => r.id)));
  }

  function applyBulk() {
    const patch: {
      category?: string;
      defaultSupplierId?: string;
      minQuantity?: number;
      optimalQuantity?: number;
      pricePurchase?: number;
      trackLevels?: boolean;
    } = {};
    if (bCat) patch.category = bCat;
    if (bSup) patch.defaultSupplierId = bSup;
    if (bMin !== "") patch.minQuantity = Number(bMin);
    if (bOpt !== "") patch.optimalQuantity = Number(bOpt);
    if (bPrice !== "") patch.pricePurchase = Number(bPrice);
    if (bTrack) patch.trackLevels = bTrack === "yes";
    if (Object.keys(patch).length === 0) { toast.error("Vyber, co se má změnit."); return; }
    startTransition(async () => {
      const res = await bulkUpdateProducts([...selected], patch);
      if (!res.ok) { toast.error(res.error ?? "Úprava selhala."); return; }
      toast.success(res.message ?? "Hotovo.");
      setSelected(new Set());
      setBulkOpen(false);
      setBCat(""); setBSup(""); setBMin(""); setBOpt(""); setBPrice(""); setBTrack("");
      router.refresh();
    });
  }

  const selCol = canManage ? 1 : 0;
  const colCount = 5 + (showPrices ? 1 : 0) + selCol;
  const allShownSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  return (
    <div className="space-y-4">
      {/* Filtry */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Hledat název, kód nebo naskenovat čárový kód…" className="pl-9" />
        </div>
        {warehouses.length > 1 && (
          <select value={wh} onChange={(e) => setWh(e.target.value)} className={selectClass}>
            <option value="">Všechny sklady</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        <select value={avail} onChange={(e) => setAvail(e.target.value)} className={selectClass}>
          <option value="">Dostupnost: vše</option>
          <option value="below">Pod minimem</option>
          <option value="zero">Není skladem</option>
          <option value="expiring">Expirující</option>
        </select>
        {categories.length > 0 && (
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectClass}>
            <option value="">Kategorie: vše</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className={selectClass}>
          <option value="active">Aktivní</option>
          <option value="inactive">Neaktivní</option>
          <option value="all">Vše</option>
        </select>
      </div>

      {/* Lišta hromadné úpravy */}
      {canManage && selected.size > 0 && (
        <div className="space-y-3 rounded-lg border border-[#103D63]/30 bg-[#103D63]/5 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[#103D63]">Vybráno {selected.size}</span>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen((v) => !v)}>
              <SlidersHorizontal className="size-4" /> Hromadná úprava
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X className="size-4" /> Zrušit výběr
            </Button>
          </div>
          {bulkOpen && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.length > 0 && (
                <label className="space-y-1 text-xs text-slate-500">Kategorie
                  <select value={bCat} onChange={(e) => setBCat(e.target.value)} className={selectClass + " w-full"}>
                    <option value="">— neměnit —</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              )}
              {suppliers.length > 0 && (
                <label className="space-y-1 text-xs text-slate-500">Dodavatel
                  <select value={bSup} onChange={(e) => setBSup(e.target.value)} className={selectClass + " w-full"}>
                    <option value="">— neměnit —</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              )}
              <label className="space-y-1 text-xs text-slate-500">Min.
                <Input type="number" step="any" min="0" value={bMin} placeholder="neměnit"
                  onChange={(e) => setBMin(e.target.value)} />
              </label>
              <label className="space-y-1 text-xs text-slate-500">Opt.
                <Input type="number" step="any" min="0" value={bOpt} placeholder="neměnit"
                  onChange={(e) => setBOpt(e.target.value)} />
              </label>
              {showPrices && (
                <label className="space-y-1 text-xs text-slate-500">Cena/ks bez DPH
                  <Input type="number" step="any" min="0" value={bPrice} placeholder="neměnit"
                    onChange={(e) => setBPrice(e.target.value)} />
                </label>
              )}
              <label className="space-y-1 text-xs text-slate-500">Sledovat hladiny
                <select value={bTrack} onChange={(e) => setBTrack(e.target.value)} className={selectClass + " w-full"}>
                  <option value="">— neměnit —</option>
                  <option value="yes">Ano</option>
                  <option value="no">Ne</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button size="sm" onClick={applyBulk} disabled={pending}>
                  <Check className="size-4" /> Použít na {selected.size}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && (
                <TableHead className="w-8">
                  <input type="checkbox" className="size-4" checked={allShownSelected} onChange={toggleAll} />
                </TableHead>
              )}
              <TableHead>Název</TableHead>
              <TableHead className="text-right">Skladem</TableHead>
              <TableHead className="whitespace-nowrap text-right">Min. / opt.</TableHead>
              <TableHead className="whitespace-nowrap">Expirace</TableHead>
              {showPrices && <TableHead className="text-right">Hodnota</TableHead>}
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-slate-500">Žádné položky.</TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              const d = wh && r.byWh[wh] ? r.byWh[wh] : {
                qtyLabel: r.totalQtyLabel, minQtyLabel: r.minQtyLabel, optQtyLabel: r.optQtyLabel,
                valueLabel: r.valueLabel, belowMin: r.belowMin, isZero: r.isZero,
              };
              return (
              <TableRow key={r.id} className={!r.active ? "opacity-50" : ""}>
                {canManage && (
                  <TableCell>
                    <input type="checkbox" className="size-4" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  <Link href={`/produkty/${r.id}`} className="hover:underline">{r.name}</Link>
                  {r.category && <span className="block text-xs text-slate-400">{r.category}</span>}
                </TableCell>
                <TableCell className={"text-right tabular-nums font-medium " +
                  (d.isZero ? "text-red-600" : d.belowMin ? "text-amber-600" : "text-slate-700")}>
                  {d.qtyLabel}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-slate-500">
                  {d.minQtyLabel} / {d.optQtyLabel}
                </TableCell>
                <TableCell className={r.expired ? "text-red-600 font-medium" : r.expiringSoon ? "text-amber-600" : "text-slate-500"}>
                  {r.nearestExpiryLabel}
                </TableCell>
                {showPrices && <TableCell className="text-right">{d.valueLabel}</TableCell>}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/produkty/${r.id}`}
                      className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                      Otevřít
                    </Link>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label="Akce"
                          className="flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => router.push(`/produkty/${r.id}/upravit`)}>
                            <Pencil className="size-4" /> Upravit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deactivate(r.id)}>
                            <Power className="size-4" /> {r.active ? "Deaktivovat" : "Aktivovat"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => remove(r.id, r.name)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="size-4" /> Smazat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
