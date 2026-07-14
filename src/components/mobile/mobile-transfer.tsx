"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Check, ArrowDown } from "lucide-react";
import { transferDocument } from "@/app/actions/stock";
import { MobileItemSearch, QtyStepper, type MobileProduct } from "@/components/mobile/mobile-ui";

const selectClass =
  "border-input flex h-12 w-full rounded-xl border bg-white px-3 text-base shadow-xs";

type Row = { key: string; product: MobileProduct; quantity: number };

export function MobileTransfer({
  products,
  warehouses,
}: {
  products: MobileProduct[];
  warehouses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sourceId, setSourceId] = useState(warehouses[0]?.id ?? "");
  const [targetId, setTargetId] = useState(warehouses[1]?.id ?? "");
  const [rows, setRows] = useState<Row[]>([]);

  const inSource = (p: MobileProduct) => p.byWh?.[sourceId] ?? 0;

  function addProduct(p: MobileProduct) {
    if (inSource(p) <= 0) {
      toast.error(`„${p.name}" není na zdrojovém skladu skladem.`);
      return;
    }
    setRows((prev) => {
      const i = prev.findIndex((r) => r.product.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [...prev, { key: `${p.id}-${prev.length}`, product: p, quantity: 1 }];
    });
  }

  function submit() {
    if (sourceId === targetId) { toast.error("Vyber dva různé sklady."); return; }
    if (rows.length === 0) { toast.error("Přidej alespoň jednu položku."); return; }
    const over = rows.find((r) => r.quantity > inSource(r.product));
    if (over) { toast.error(`„${over.product.name}" — na zdrojovém skladu jen ${inSource(over.product)} ks.`); return; }
    start(async () => {
      const res = await transferDocument({
        sourceWarehouseId: sourceId,
        targetWarehouseId: targetId,
        items: rows.map((r) => ({ productId: r.product.id, quantity: r.quantity })),
      });
      if (!res.ok) { toast.error(res.error ?? "Přeskladnění selhalo."); return; }
      toast.success(`Přeskladněno ${rows.length} položek. ✅`);
      setRows([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-2xl border bg-white p-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-600">Ze skladu</span>
          <select value={sourceId} onChange={(e) => { setSourceId(e.target.value); setRows([]); }} className={selectClass}>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </label>
        <div className="flex justify-center text-slate-400"><ArrowDown className="size-5" /></div>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-600">Do skladu</span>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={selectClass}>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </label>
        {sourceId === targetId && (
          <p className="text-sm text-red-600">Zdrojový a cílový sklad musí být různé.</p>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border bg-white p-3">
        <p className="text-sm font-medium text-slate-600">Přidat položku</p>
        <MobileItemSearch
          products={products.map((p) => ({ ...p, totalQty: inSource(p) }))}
          onPick={addProduct}
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="space-y-2 rounded-2xl border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.product.name}</p>
                  <p className="text-xs text-slate-400">na zdrojovém skladu {inSource(r.product)} ks</p>
                </div>
                <button type="button" onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))}
                  className="text-slate-400 active:text-red-600" aria-label="Odebrat">
                  <Trash2 className="size-4.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <QtyStepper value={r.quantity} onChange={(n) => setRows((p) => p.map((x) => x.key === r.key ? { ...x, quantity: n } : x))} />
                <span className="text-sm text-slate-500">ks</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={submit} disabled={pending || rows.length === 0 || sourceId === targetId}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 text-lg font-bold text-white disabled:opacity-40 active:scale-[0.98]">
        <Check className="size-6" />
        {pending ? "Přeskladňuji…" : `Přeskladnit (${rows.length})`}
      </button>
    </div>
  );
}
