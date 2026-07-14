"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Check } from "lucide-react";
import { issueDocument } from "@/app/actions/stock";
import { MobileItemSearch, QtyStepper, type MobileProduct } from "@/components/mobile/mobile-ui";

const selectClass =
  "border-input flex h-12 w-full rounded-xl border bg-white px-3 text-base shadow-xs";

type Row = { key: string; product: MobileProduct; quantity: number };

export function MobileIssue({
  products,
  ordinace,
}: {
  products: MobileProduct[];
  ordinace: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ordinaceId, setOrdinaceId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  function addProduct(p: MobileProduct) {
    if ((p.totalQty ?? 0) <= 0) { toast.error(`„${p.name}" není skladem.`); return; }
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
    if (rows.length === 0) { toast.error("Přidej alespoň jednu položku."); return; }
    const over = rows.find((r) => r.quantity > (r.product.totalQty ?? 0));
    if (over) { toast.error(`„${over.product.name}" — skladem jen ${over.product.totalQty} ks.`); return; }
    start(async () => {
      const res = await issueDocument({
        type: "ISSUE",
        ordinaceId: ordinaceId || null,
        items: rows.map((r) => ({ productId: r.product.id, quantity: r.quantity })),
      });
      if (!res.ok) { toast.error(res.error ?? "Výdej selhal."); return; }
      toast.success(`Vydáno ${rows.length} položek. ✅`);
      setRows([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-600">Ordinace (kdo si bere)</span>
        <select value={ordinaceId} onChange={(e) => setOrdinaceId(e.target.value)} className={selectClass}>
          <option value="">— nevybráno —</option>
          {ordinace.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>

      <div className="space-y-2 rounded-2xl border bg-white p-3">
        <p className="text-sm font-medium text-slate-600">Přidat položku</p>
        <MobileItemSearch products={products} onPick={addProduct} />
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="space-y-2 rounded-2xl border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.product.name}</p>
                  <p className="text-xs text-slate-400">skladem {r.product.totalQty ?? 0} ks</p>
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

      <button type="button" onClick={submit} disabled={pending || rows.length === 0}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#103D63] text-lg font-bold text-white disabled:opacity-40 active:scale-[0.98]">
        <Check className="size-6" />
        {pending ? "Vydávám…" : `Vydat (${rows.length})`}
      </button>
    </div>
  );
}
