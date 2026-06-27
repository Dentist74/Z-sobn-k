"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductPicker, type PickerProduct } from "@/components/product-picker";
import { transferDocument } from "@/app/actions/stock";
import { UNIT_LABELS, type Unit } from "@/lib/enums";

const selectClass =
  "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

type WarehouseOpt = { id: string; name: string };
type ProductData = PickerProduct & {
  piecesPerPackage: number;
  packageLabel: string | null;
  stock: { warehouseId: string; quantity: number }[];
};
type CartItem = { key: string; product: ProductData; quantity: number };

export function TransferForm({
  products,
  warehouses,
}: {
  products: ProductData[];
  warehouses: WarehouseOpt[];
}) {
  const [sourceId, setSourceId] = useState(warehouses[0]?.id ?? "");
  const [targetId, setTargetId] = useState(warehouses[1]?.id ?? "");
  const [items, setItems] = useState<CartItem[]>([]);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const [draft, setDraft] = useState<ProductData | null>(null);
  const [qty, setQty] = useState("");
  const [qtyUnit, setQtyUnit] = useState<"pcs" | "pkg">("pcs");

  function sourceStock(p: ProductData) {
    return p.stock
      .filter((s) => s.warehouseId === sourceId)
      .reduce((s, x) => s + x.quantity, 0);
  }
  function inCart(productId: string) {
    return items.filter((i) => i.product.id === productId).reduce((s, i) => s + i.quantity, 0);
  }

  const ppp = draft && draft.piecesPerPackage > 0 ? draft.piecesPerPackage : 1;
  const hasPackage = ppp > 1;
  const pkgLabel = draft?.packageLabel || "balení";
  const unitLabel = draft ? UNIT_LABELS[draft.unit as Unit] ?? draft.unit : "";
  const needPieces = (Number(qty) || 0) * (qtyUnit === "pkg" ? ppp : 1);
  const available = draft ? sourceStock(draft) - inCart(draft.id) : 0;

  function addItem() {
    if (!draft) return;
    if (!needPieces || needPieces <= 0) {
      toast.error("Zadej kladné množství.");
      return;
    }
    if (needPieces > available) {
      toast.error(`Na zdrojovém skladu je jen ${available} ${unitLabel}.`);
      return;
    }
    setItems((p) => [...p, { key: `${draft.id}-${p.length}`, product: draft, quantity: needPieces }]);
    setDraft(null);
    setQty("");
    setQtyUnit("pcs");
  }

  function submit() {
    if (items.length === 0) return toast.error("Seznam je prázdný.");
    if (sourceId === targetId) return toast.error("Zvol různé sklady.");
    start(async () => {
      const res = await transferDocument({
        sourceWarehouseId: sourceId,
        targetWarehouseId: targetId,
        note,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      if (!res.ok) {
        toast.error(res.error ?? "Přeskladnění selhalo.");
        return;
      }
      toast.success(res.message ?? "Hotovo.");
      setItems([]);
      setNote("");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="src">Ze skladu</Label>
            <select id="src" value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={selectClass}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <ArrowRight className="mb-2 size-5 text-slate-400" />
          <div className="space-y-1.5">
            <Label htmlFor="tgt">Do skladu</Label>
            <select id="tgt" value={targetId} onChange={(e) => setTargetId(e.target.value)} className={selectClass}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Přidat položku</Label>
          <ProductPicker products={products} value={draft}
            onChange={(p) => { setDraft(p as ProductData | null); setQty(""); }} />
        </div>

        {draft && (
          <div className="space-y-4 rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">
              Na zdrojovém skladu: <strong className="text-slate-900">{available} {unitLabel}</strong>
            </p>
            <div className="space-y-1.5">
              <Label>Množství</Label>
              <div className="flex gap-2">
                <Input type="number" step="any" min="0" autoFocus value={qty}
                  onChange={(e) => setQty(e.target.value)} />
                {hasPackage && (
                  <select value={qtyUnit} className={selectClass + " w-28"}
                    onChange={(e) => setQtyUnit(e.target.value as "pcs" | "pkg")}>
                    <option value="pcs">kusy</option>
                    <option value="pkg">{pkgLabel}</option>
                  </select>
                )}
              </div>
              {hasPackage && qtyUnit === "pkg" && (
                <p className="text-xs text-slate-500">= {needPieces} {unitLabel}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={addItem}><Plus className="size-4" /> Přidat</Button>
              <Button type="button" variant="outline" onClick={() => { setDraft(null); setQty(""); }}>Zrušit</Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-lg border bg-white p-4">
        <h2 className="font-semibold text-slate-900">K přeskladnění ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Zatím prázdné.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Položka</TableHead>
                <TableHead className="text-right">Množ.</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={it.key}>
                  <TableCell className="font-medium">{it.product.name}</TableCell>
                  <TableCell className="text-right">
                    {it.quantity} {UNIT_LABELS[it.product.unit as Unit] ?? it.product.unit}
                  </TableCell>
                  <TableCell>
                    <button type="button" aria-label="Odebrat"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600">
                      <Trash2 className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="note">Poznámka</Label>
          <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button onClick={submit} disabled={pending || items.length === 0} className="w-full">
          {pending ? "Přeskladňuji…" : "Provést přeskladnění"}
        </Button>
      </div>
    </div>
  );
}
