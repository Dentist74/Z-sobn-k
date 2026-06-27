"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useDirty } from "@/components/nav-guard";
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
import { DeliveryScan } from "@/components/delivery-scan";
import { receiveDocument } from "@/app/actions/stock";

const selectClass =
  "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

type WarehouseOpt = { id: string; name: string };
type SupplierOpt = { id: string; name: string };
type FullProduct = PickerProduct & {
  defaultWarehouseId: string | null;
  piecesPerPackage: number;
  packageLabel: string | null;
};

type CartItem = {
  key: string;
  product: FullProduct;
  quantity: string;
  pricePurchase: string;
  supplierId: string;
  lotNumber: string;
  expiryDate: string;
  positionRow: string;
  positionShelf: string;
  positionRack: string;
};

export function ReceiveForm({
  products,
  warehouses,
  suppliers,
  preselectedId,
  canManage = false,
}: {
  products: FullProduct[];
  warehouses: WarehouseOpt[];
  suppliers: SupplierOpt[];
  preselectedId?: string;
  canManage?: boolean;
}) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [items, setItems] = useState<CartItem[]>([]);
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [additionalCost, setAdditionalCost] = useState("");
  const [attachment, setAttachment] = useState<
    { base64: string; name: string; mediaType: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  function onInvoiceFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setAttachment({ base64: dataUrl.split(",")[1] ?? "", name: file.name, mediaType: file.type });
    };
    reader.readAsDataURL(file);
  }

  // rozpracovaná položka
  const [draft, setDraft] = useState<FullProduct | null>(
    preselectedId ? (products.find((p) => p.id === preselectedId) ?? null) : null,
  );
  const [d, setD] = useState({
    quantity: "",
    pricePurchase: "",
    supplierId: "",
    lotNumber: "",
    expiryDate: "",
    positionRow: "",
    positionShelf: "",
    positionRack: "",
  });
  const [qtyUnit, setQtyUnit] = useState<"pcs" | "pkg">("pcs");
  const [priceUnit, setPriceUnit] = useState<"pcs" | "pkg">("pcs");

  const ppp = draft && draft.piecesPerPackage > 0 ? draft.piecesPerPackage : 1;
  const hasPackage = ppp > 1;
  const pkgLabel = draft?.packageLabel || "balení";
  const piecesPreview = (Number(d.quantity) || 0) * (qtyUnit === "pkg" ? ppp : 1);

  // Položky už přidané do příjemky zmizí z nabídky; po odebrání se vrátí.
  const addedIds = useMemo(() => new Set(items.map((it) => it.product.id)), [items]);
  const availableProducts = useMemo(
    () => products.filter((p) => !addedIds.has(p.id)),
    [products, addedIds],
  );

  // Ochrana proti omylem opuštěné rozdělané příjemce.
  useDirty(items.length > 0 || draft != null);

  function resetDraft() {
    setDraft(null);
    setQtyUnit("pcs");
    setPriceUnit("pcs");
    setD({
      quantity: "",
      pricePurchase: "",
      supplierId: "",
      lotNumber: "",
      expiryDate: "",
      positionRow: "",
      positionShelf: "",
      positionRack: "",
    });
  }

  function addItem() {
    if (!draft) return;
    const enteredQty = Number(d.quantity);
    if (!enteredQty || enteredQty <= 0) {
      toast.error("Zadej kladné množství.");
      return;
    }
    const pieces = qtyUnit === "pkg" ? enteredQty * ppp : enteredQty;
    const perPiece =
      d.pricePurchase === ""
        ? ""
        : String(priceUnit === "pkg" ? Number(d.pricePurchase) / ppp : Number(d.pricePurchase));
    setItems((prev) => [
      ...prev,
      {
        key: `${draft.id}-${prev.length}-${d.lotNumber}`,
        product: draft,
        quantity: String(pieces),
        pricePurchase: perPiece,
        supplierId: d.supplierId,
        lotNumber: d.lotNumber,
        expiryDate: d.expiryDate,
        positionRow: d.positionRow,
        positionShelf: d.positionShelf,
        positionRack: d.positionRack,
      },
    ]);
    resetDraft();
  }

  // Přidání položky z AI skenu dodacího listu.
  function addScanned(p: {
    productId: string;
    quantity: number;
    unitPrice: number | null;
    name?: string;
    sku?: string;
  }) {
    // čerstvě založená karta ještě nemusí být v `products` (než dojede refresh)
    const product: FullProduct =
      products.find((x) => x.id === p.productId) ?? {
        id: p.productId,
        name: p.name ?? "Nová položka",
        sku: p.sku ?? "",
        codes: [],
        unit: "PCS",
        piecesPerPackage: 1,
        packageLabel: null,
        defaultWarehouseId: null,
      };
    setItems((prev) => [
      ...prev,
      {
        key: `${product.id}-${prev.length}-scan`,
        product,
        quantity: String(p.quantity),
        pricePurchase: p.unitPrice != null ? String(p.unitPrice) : "",
        supplierId: "",
        lotNumber: "",
        expiryDate: "",
        positionRow: "",
        positionShelf: "",
        positionRack: "",
      },
    ]);
  }

  function submit() {
    if (items.length === 0) {
      toast.error("Příjemka je prázdná.");
      return;
    }
    startTransition(async () => {
      const res = await receiveDocument({
        warehouseId,
        note,
        reference,
        additionalCost: additionalCost ? Number(additionalCost) : null,
        attachment,
        items: items.map((it) => ({
          productId: it.product.id,
          quantity: Number(it.quantity),
          pricePurchase: it.pricePurchase ? Number(it.pricePurchase) : null,
          supplierId: it.supplierId || null,
          lotNumber: it.lotNumber || null,
          expiryDate: it.expiryDate || null,
          positionRow: it.positionRow || null,
          positionShelf: it.positionShelf || null,
          positionRack: it.positionRack || null,
        })),
      });
      if (!res.ok) {
        toast.error(res.error ?? "Naskladnění selhalo.");
        return;
      }
      toast.success(res.message ?? "Naskladněno.");
      setItems([]);
      setNote("");
      setReference("");
      setAdditionalCost("");
      setAttachment(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Výběr a přidání položky */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="warehouseId">Naskladnit na sklad</Label>
          <select id="warehouseId" value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)} className={selectClass}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <DeliveryScan onAdd={addScanned} products={products} canManage={canManage} />

        <div className="space-y-1.5">
          <Label>Přidat položku</Label>
          <ProductPicker
            products={availableProducts}
            value={draft}
            onChange={(p) => {
              const fp = p as FullProduct | null;
              setDraft(fp);
              if (fp?.defaultWarehouseId) setWarehouseId(fp.defaultWarehouseId);
            }}
          />
        </div>

        {draft && (
          <div className="space-y-4 rounded-lg border bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Množství</Label>
                <div className="flex gap-2">
                  <Input type="number" step="any" min="0" autoFocus value={d.quantity}
                    onChange={(e) => setD({ ...d, quantity: e.target.value })} />
                  {hasPackage && (
                    <select value={qtyUnit} className={selectClass + " w-28"}
                      onChange={(e) => setQtyUnit(e.target.value as "pcs" | "pkg")}>
                      <option value="pcs">kusy</option>
                      <option value="pkg">{pkgLabel}</option>
                    </select>
                  )}
                </div>
                {hasPackage && qtyUnit === "pkg" && (
                  <p className="text-xs text-slate-500">= {piecesPreview} ks (balení po {ppp})</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Nákupní cena bez DPH (Kč)</Label>
                <div className="flex gap-2">
                  <Input type="number" step="any" min="0" value={d.pricePurchase}
                    onChange={(e) => setD({ ...d, pricePurchase: e.target.value })} />
                  {hasPackage && (
                    <select value={priceUnit} className={selectClass + " w-28"}
                      onChange={(e) => setPriceUnit(e.target.value as "pcs" | "pkg")}>
                      <option value="pcs">za kus</option>
                      <option value="pkg">za {pkgLabel}</option>
                    </select>
                  )}
                </div>
                {hasPackage && priceUnit === "pkg" && Number(d.pricePurchase) > 0 && (
                  <p className="text-xs text-slate-500">
                    = {(Number(d.pricePurchase) / ppp).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč/ks
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Dodavatel</Label>
                <select value={d.supplierId} className={selectClass}
                  onChange={(e) => setD({ ...d, supplierId: e.target.value })}>
                  <option value="">— nevybráno —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Šarže (lot)</Label>
                <Input value={d.lotNumber}
                  onChange={(e) => setD({ ...d, lotNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expirace</Label>
                <Input type="date" value={d.expiryDate}
                  onChange={(e) => setD({ ...d, expiryDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Pozice (řada / regál / police)</Label>
                <div className="flex gap-1">
                  <Input placeholder="řada" value={d.positionRow}
                    onChange={(e) => setD({ ...d, positionRow: e.target.value })} />
                  <Input placeholder="regál" value={d.positionShelf}
                    onChange={(e) => setD({ ...d, positionShelf: e.target.value })} />
                  <Input placeholder="police" value={d.positionRack}
                    onChange={(e) => setD({ ...d, positionRack: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={addItem}>
                <Plus className="size-4" /> Přidat do příjemky
              </Button>
              <Button type="button" variant="outline" onClick={resetDraft}>
                Zrušit
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Příjemka (pod výběrem, na celou šířku) */}
      <div className="space-y-4 rounded-lg border bg-white p-4">
        <h2 className="font-semibold text-slate-900">
          Příjemka ({items.length})
        </h2>
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
                  <TableCell>
                    <span className="font-medium">{it.product.name}</span>
                    <span className="block text-xs text-slate-400">
                      {it.lotNumber ? `š. ${it.lotNumber}` : ""}
                      {it.expiryDate ? ` · exp. ${it.expiryDate}` : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
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
          <Label htmlFor="additionalCost">Vedlejší náklady bez DPH (Kč)</Label>
          <Input id="additionalCost" type="number" step="any" min="0"
            value={additionalCost} onChange={(e) => setAdditionalCost(e.target.value)}
            placeholder="doprava apod. (rozpočítá se do cen)" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reference">Doklad / dodací list</Label>
          <Input id="reference" value={reference}
            onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Faktura / doklad (fotka)</Label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onInvoiceFile(f); e.target.value = ""; }} />
            {attachment ? `📎 ${attachment.name}` : "Vyfotit / vybrat fakturu (volitelné)"}
          </label>
          {attachment && (
            <button type="button" onClick={() => setAttachment(null)}
              className="text-xs text-slate-400 hover:text-red-600">odebrat přílohu</button>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="note">Poznámka</Label>
          <textarea id="note" rows={2} value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs" />
        </div>

        <Button onClick={submit} disabled={pending || items.length === 0} className="w-full">
          {pending ? "Naskladňuji…" : "Naskladnit příjemku"}
        </Button>
      </div>
    </div>
  );
}
