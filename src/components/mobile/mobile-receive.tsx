"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Trash2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { receiveDocument } from "@/app/actions/stock";
import { compressImage } from "@/lib/image";
import { DeliveryScan } from "@/components/delivery-scan";
import { MobileItemSearch, QtyStepper, type MobileProduct } from "@/components/mobile/mobile-ui";

const selectClass =
  "border-input flex h-12 w-full rounded-xl border bg-white px-3 text-base shadow-xs";

type Row = {
  key: string;
  product: MobileProduct;
  quantity: number;
  lotNumber: string;
  expiryDate: string;
  pricePurchase: number | null; // z AI skenu (jinak null)
};

export function MobileReceive({
  products,
  warehouses,
  defaultWarehouseId,
  canManage,
}: {
  products: MobileProduct[];
  warehouses: { id: string; name: string }[];
  defaultWarehouseId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [rows, setRows] = useState<Row[]>([]);
  const [photo, setPhoto] = useState<{ base64: string; name: string; mediaType: string; dataUrl: string } | null>(null);

  function addProduct(p: MobileProduct, qty = 1, price: number | null = null) {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.product.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        return next;
      }
      return [...prev, {
        key: `${p.id}-${prev.length}`,
        product: p,
        quantity: qty,
        lotNumber: "",
        expiryDate: "",
        pricePurchase: price,
      }];
    });
  }

  function patchRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function onPhotoFile(file: File) {
    try {
      const c = await compressImage(file);
      setPhoto({ base64: c.base64, name: file.name || "faktura.jpg", mediaType: c.mediaType, dataUrl: c.dataUrl });
    } catch {
      toast.error("Fotku se nepodařilo načíst.");
    }
  }

  function submit() {
    if (rows.length === 0) { toast.error("Přidej alespoň jednu položku."); return; }
    start(async () => {
      const res = await receiveDocument({
        warehouseId,
        items: rows.map((r) => ({
          productId: r.product.id,
          quantity: r.quantity,
          lotNumber: r.lotNumber || null,
          expiryDate: r.expiryDate || null,
          pricePurchase: r.pricePurchase,
        })),
        attachment: photo ? { base64: photo.base64, name: photo.name, mediaType: photo.mediaType } : null,
      });
      if (!res.ok) { toast.error(res.error ?? "Naskladnění selhalo."); return; }
      toast.success(`Naskladněno ${rows.length} položek. ✅`);
      setRows([]);
      setPhoto(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Sklad */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-600">Sklad</span>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectClass}>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </label>

      {/* AI sken dodacího listu */}
      <DeliveryScan
        products={products}
        canManage={canManage}
        onAdd={(p) => {
          const prod = products.find((x) => x.id === p.productId);
          if (prod) addProduct(prod, p.quantity, p.unitPrice);
        }}
      />

      {/* Přidat položku ručně / čtečkou */}
      <div className="space-y-2 rounded-2xl border bg-white p-3">
        <p className="text-sm font-medium text-slate-600">Přidat položku</p>
        <MobileItemSearch products={products} onPick={(p) => addProduct(p)} />
      </div>

      {/* Položky příjemky */}
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="space-y-2 rounded-2xl border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{r.product.name}</p>
                <button type="button" onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))}
                  className="text-slate-400 active:text-red-600" aria-label="Odebrat">
                  <Trash2 className="size-4.5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <QtyStepper value={r.quantity} onChange={(n) => patchRow(r.key, { quantity: n })} />
                <span className="text-sm text-slate-500">ks</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Šarže (nepovinné)" value={r.lotNumber}
                  onChange={(e) => patchRow(r.key, { lotNumber: e.target.value })} className="h-10 text-sm" />
                <Input type="date" value={r.expiryDate} title="Expirace"
                  onChange={(e) => patchRow(r.key, { expiryDate: e.target.value })} className="h-10 text-sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fotka faktury */}
      <div className="rounded-2xl border bg-white p-3">
        <p className="mb-2 text-sm font-medium text-slate-600">Faktura / doklad (fotka)</p>
        {photo ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.dataUrl} alt="Faktura" className="h-16 w-16 rounded-lg object-cover" />
            <button type="button" onClick={() => setPhoto(null)} className="text-sm text-red-600 underline">
              Odebrat fotku
            </button>
          </div>
        ) : (
          <label className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#103D63] text-base font-semibold text-white active:scale-[0.98]">
            <Camera className="size-5" /> Fotoaparát
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhotoFile(f); e.target.value = ""; }} />
          </label>
        )}
      </div>

      {/* Potvrzení */}
      <button type="button" onClick={submit} disabled={pending || rows.length === 0}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 text-lg font-bold text-white disabled:opacity-40 active:scale-[0.98]">
        <Check className="size-6" />
        {pending ? "Naskladňuji…" : `Naskladnit (${rows.length})`}
      </button>
    </div>
  );
}
