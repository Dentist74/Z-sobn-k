"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { useDirty } from "@/components/nav-guard";
import { issueDocument } from "@/app/actions/stock";
import { UNIT_LABELS, type Unit } from "@/lib/enums";

const selectClass =
  "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

type Batch = { lotNumber: string | null; expiryDate: string | null; quantity: number };
type FullProduct = PickerProduct & {
  totalQty: number;
  batches: Batch[];
  piecesPerPackage: number;
  packageLabel: string | null;
};
type OrdinaceOpt = { id: string; name: string };

function sortFEFO(batches: Batch[]): Batch[] {
  return [...batches].sort((a, b) => {
    if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
    if (a.expiryDate && !b.expiryDate) return -1;
    if (!a.expiryDate && b.expiryDate) return 1;
    return 0;
  });
}
function fmtDate(iso: string | null): string {
  if (!iso) return "bez expirace";
  return new Intl.DateTimeFormat("cs-CZ").format(new Date(iso));
}

type CartItem = { key: string; product: FullProduct; quantity: number };

export function IssueForm({
  products,
  ordinace,
}: {
  products: FullProduct[];
  ordinace: OrdinaceOpt[];
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ordinaceId, setOrdinaceId] = useState("");
  const [type, setType] = useState<"ISSUE" | "WRITE_OFF">("ISSUE");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();

  const [draft, setDraft] = useState<FullProduct | null>(null);
  const [qty, setQty] = useState("");
  const [qtyUnit, setQtyUnit] = useState<"pcs" | "pkg">("pcs");

  // Ochrana proti omylem opuštěné rozdělané výdejce.
  useDirty(items.length > 0 || draft != null);

  // dostupné množství s ohledem na to, co už je v košíku
  function inCart(productId: string) {
    return items
      .filter((it) => it.product.id === productId)
      .reduce((s, it) => s + it.quantity, 0);
  }

  const draftAvailable = draft ? draft.totalQty - inCart(draft.id) : 0;
  const unitLabel = draft ? UNIT_LABELS[draft.unit as Unit] ?? draft.unit : "";
  const ppp = draft && draft.piecesPerPackage > 0 ? draft.piecesPerPackage : 1;
  const hasPackage = ppp > 1;
  const pkgLabel = draft?.packageLabel || "balení";
  // požadované množství přepočtené na kusy
  const needPieces = (Number(qty) || 0) * (qtyUnit === "pkg" ? ppp : 1);

  const preview = useMemo(() => {
    if (!draft) return null;
    if (!needPieces || needPieces <= 0) return null;
    const sorted = sortFEFO(draft.batches.filter((b) => b.quantity > 0));
    let remaining = needPieces;
    const rows: { batch: Batch; taken: number }[] = [];
    for (const b of sorted) {
      if (remaining <= 0) break;
      const taken = Math.min(b.quantity, remaining);
      rows.push({ batch: b, taken });
      remaining -= taken;
    }
    return { rows, shortage: Math.max(0, remaining) };
  }, [draft, needPieces]);

  function addItem() {
    if (!draft) return;
    if (!needPieces || needPieces <= 0) {
      toast.error("Zadej kladné množství.");
      return;
    }
    if (needPieces > draftAvailable) {
      toast.error(`Skladem je jen ${draftAvailable} ${unitLabel}.`);
      return;
    }
    setItems((prev) => [
      ...prev,
      { key: `${draft.id}-${prev.length}`, product: draft, quantity: needPieces },
    ]);
    setDraft(null);
    setQty("");
    setQtyUnit("pcs");
  }

  function submit() {
    if (items.length === 0) {
      toast.error("Výdejka je prázdná.");
      return;
    }
    startTransition(async () => {
      const res = await issueDocument({
        ordinaceId: ordinaceId || null,
        type,
        reason: reason || null,
        reference: reference || null,
        items: items.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity,
        })),
      });
      if (!res.ok) {
        toast.error(res.error ?? "Výdej selhal.");
        return;
      }
      toast.success(res.message ?? "Hotovo.");
      setItems([]);
      setReason("");
      setReference("");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label>Přidat položku k výdeji</Label>
          <ProductPicker
            products={products}
            value={draft}
            onChange={(p) => {
              setDraft(p as FullProduct | null);
              setQty("");
            }}
          />
        </div>

        {draft && (
          <div className="space-y-4 rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">
              Dostupné: <strong className="text-slate-900">{draftAvailable} {unitLabel}</strong>
              {hasPackage && (
                <span className="text-slate-400">
                  {" "}({(draftAvailable / ppp).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} {pkgLabel})
                </span>
              )}
            </p>
            <div className="space-y-1.5">
              <Label>Množství</Label>
              <div className="flex gap-2">
                <Input type="number" step="any" min="0" autoFocus
                  value={qty} onChange={(e) => setQty(e.target.value)} />
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

            {preview && (
              <div className="rounded-md border bg-slate-50 p-3 text-sm">
                <p className="mb-1 font-medium text-slate-700">Náhled FEFO:</p>
                <ul className="space-y-0.5">
                  {preview.rows.map((r, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{r.batch.lotNumber ?? "bez šarže"} · exp. {fmtDate(r.batch.expiryDate)}</span>
                      <span className="font-medium">{r.taken} {unitLabel}</span>
                    </li>
                  ))}
                </ul>
                {preview.shortage > 0 && (
                  <p className="mt-1 font-medium text-red-600">
                    Nedostatek o {preview.shortage} {unitLabel}.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" onClick={addItem}
                disabled={(preview?.shortage ?? 1) > 0}>
                <Plus className="size-4" /> Přidat do výdejky
              </Button>
              <Button type="button" variant="outline" onClick={() => { setDraft(null); setQty(""); }}>
                Zrušit
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-lg border bg-white p-4">
        <h2 className="font-semibold text-slate-900">Výdejka ({items.length})</h2>

        <div className="space-y-1.5">
          <Label htmlFor="type">Typ pohybu</Label>
          <select id="type" value={type} className={selectClass}
            onChange={(e) => setType(e.target.value as "ISSUE" | "WRITE_OFF")}>
            <option value="ISSUE">Výdej (spotřeba)</option>
            <option value="WRITE_OFF">Odpis (expirace, poškození)</option>
          </select>
        </div>

        {type === "ISSUE" && (
          <div className="space-y-1.5">
            <Label htmlFor="ordinace">Ordinace</Label>
            <select id="ordinace" value={ordinaceId} className={selectClass}
              onChange={(e) => setOrdinaceId(e.target.value)}>
              <option value="">— nezadáno —</option>
              {ordinace.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Zatím prázdná.</p>
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
          <Label htmlFor="reason">Důvod / poznámka</Label>
          <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={type === "WRITE_OFF" ? "např. expirace" : "např. pacient #1234"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reference">Doklad</Label>
          <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>

        <Button onClick={submit} disabled={pending || items.length === 0} className="w-full">
          {pending ? "Zpracovávám…" : type === "WRITE_OFF" ? "Odepsat výdejku" : "Vydat výdejku (FEFO)"}
        </Button>
      </div>
    </div>
  );
}
