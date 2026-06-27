"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Trash2, ShoppingCart, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createManualOrders } from "@/app/actions/orders";
import { formatCZK } from "@/lib/format";
import { UNIT_LABELS, type Unit } from "@/lib/enums";

export type OrderProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  defaultSupplierId: string | null;
  totalQty: number;
  min: number;
  belowMin: boolean;
  suggestQty: number;
};

type Line = { supplierId: string; qty: string };

const selectClass =
  "border-input flex h-9 w-full rounded-md border bg-transparent px-2 py-1 text-sm shadow-xs";

export function NewOrderForm({
  suppliers,
  products,
}: {
  suppliers: { id: string; name: string }[];
  products: OrderProduct[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Record<string, Line>>({});
  const [q, setQ] = useState("");

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );
  const lowStock = useMemo(() => products.filter((p) => p.belowMin), [products]);

  const searchResults = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.sku.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [q, products]);

  function add(p: OrderProduct) {
    setSelected((prev) =>
      prev[p.id]
        ? prev
        : {
            ...prev,
            [p.id]: {
              supplierId: p.defaultSupplierId ?? suppliers[0]?.id ?? "",
              qty: String(p.belowMin ? p.suggestQty : 1),
            },
          },
    );
  }
  function remove(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }
  function patch(id: string, p: Partial<Line>) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));
  }

  const lineIds = Object.keys(selected);
  const total = lineIds.reduce((s, id) => {
    const p = productById.get(id);
    return s + (p ? p.price * (Number(selected[id].qty) || 0) : 0);
  }, 0);

  // přehled: kolik objednávek vznikne (dle dodavatelů)
  const supplierCount = new Set(
    lineIds.map((id) => selected[id].supplierId).filter(Boolean),
  ).size;

  function submit() {
    const lines = lineIds.map((id) => ({
      productId: id,
      supplierId: selected[id].supplierId,
      quantity: Number(selected[id].qty) || 0,
      unitPrice: productById.get(id)?.price ?? 0,
    }));
    if (lines.some((l) => !l.supplierId)) {
      toast.error("U každé položky vyber dodavatele.");
      return;
    }
    start(async () => {
      const res = await createManualOrders(lines);
      if (!res.ok) {
        toast.error(res.error ?? "Vytvoření selhalo.");
        return;
      }
      toast.success(res.message ?? "Hotovo.");
      router.push("/objednavky");
    });
  }

  return (
    <div className="space-y-6">
      {/* Docházející položky */}
      {lowStock.length > 0 && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <AlertTriangle className="size-4 text-amber-500" />
            Docházející položky ({lowStock.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!!selected[p.id]}
                onClick={() => add(p)}
                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                <Plus className="size-3.5" />
                {p.name}
                <span className="text-xs text-slate-400">
                  ({p.totalQty}/{p.min} {UNIT_LABELS[p.unit as Unit] ?? p.unit})
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Vyhledat položku */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Přidat konkrétní položku</h2>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat název nebo M-kód…" className="pl-9" />
        </div>
        {searchResults.length > 0 && (
          <ul className="mt-2 divide-y rounded-md border">
            {searchResults.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {p.name}{" "}
                  <span className="font-mono text-xs text-slate-400">{p.sku}</span>
                </span>
                <button type="button" disabled={!!selected[p.id]}
                  onClick={() => { add(p); setQ(""); }}
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline disabled:opacity-40">
                  <Plus className="size-3.5" /> přidat
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vybrané položky */}
      <section className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Položka</TableHead>
              <TableHead className="w-32 text-right">Množství</TableHead>
              <TableHead className="w-56">Dodavatel</TableHead>
              <TableHead className="text-right">Cena celkem</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineIds.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  Zatím nic nevybráno.
                </TableCell>
              </TableRow>
            )}
            {lineIds.map((id) => {
              const p = productById.get(id)!;
              const line = selected[id];
              return (
                <TableRow key={id}>
                  <TableCell className="font-medium">
                    {p.name}
                    <span className="block font-mono text-xs text-slate-400">{p.sku}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input type="number" step="any" min="0" value={line.qty}
                      onChange={(e) => patch(id, { qty: e.target.value })}
                      className="text-right" />
                  </TableCell>
                  <TableCell>
                    <select value={line.supplierId} className={selectClass}
                      onChange={(e) => patch(id, { supplierId: e.target.value })}>
                      <option value="">— vyber —</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-right text-slate-600">
                    {formatCZK(p.price * (Number(line.qty) || 0))}
                  </TableCell>
                  <TableCell>
                    <button type="button" aria-label="Odebrat" onClick={() => remove(id)}
                      className="text-slate-400 hover:text-red-600">
                      <Trash2 className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {lineIds.length} položek
          {supplierCount > 1 && ` · vznikne ${supplierCount} objednávek (dle dodavatelů)`}
          {" · "}celkem bez DPH: <strong className="text-slate-900">{formatCZK(total)}</strong>
        </p>
        <Button onClick={submit} disabled={pending || lineIds.length === 0}>
          <ShoppingCart className="size-4" />
          {pending ? "Vytvářím…" : "Vytvořit objednávku"}
        </Button>
      </div>
    </div>
  );
}
