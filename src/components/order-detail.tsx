"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Trash2, Send, Ban, ExternalLink, MailCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  setOrderItemQuantity,
  removeOrderItem,
  markOrderSent,
  setOrderStatus,
  deleteOrder,
  sendOrderEmail,
} from "@/app/actions/orders";
import { formatCZK } from "@/lib/format";
import { ORDER_STATUS_LABELS, UNIT_LABELS, type OrderStatus, type Unit } from "@/lib/enums";

export type OrderItemVM = {
  id: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type OrderVM = {
  id: string;
  status: OrderStatus;
  supplierName: string;
  supplierEmail: string | null;
  supplierUrl: string | null;
  items: OrderItemVM[];
};

export function OrderDetail({ order, mailReady }: { order: OrderVM; mailReady: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isDraft = order.status === "DRAFT";

  const [qty, setQty] = useState<Record<string, string>>(
    () => Object.fromEntries(order.items.map((i) => [i.id, String(i.quantity)])),
  );
  const [emailOpen, setEmailOpen] = useState(false);
  const [note, setNote] = useState(
    "Dobrý den,\n\nobjednáváme níže uvedené položky (viz příloha).",
  );

  function sendEmail() {
    start(async () => {
      const res = await sendOrderEmail(order.id, note);
      if (!res.ok) {
        toast.error(res.error ?? "Odeslání selhalo.");
        return;
      }
      toast.success(res.message ?? "Odesláno.");
      setEmailOpen(false);
      router.refresh();
    });
  }

  const total = order.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Akce selhala.");
        return;
      }
      if (res.message) toast.success(res.message);
      router.refresh();
    });
  }

  function saveQty(itemId: string) {
    const v = Number(qty[itemId]);
    if (!Number.isFinite(v) || v < 0) return;
    run(() => setOrderItemQuantity(itemId, v));
  }

  // mailto s předvyplněným obsahem objednávky
  const subject = encodeURIComponent(`Objednávka – ${order.supplierName}`);
  const bodyLines = [
    "Dobrý den,",
    "",
    "objednáváme následující položky:",
    ...order.items.map(
      (it) =>
        `- ${it.productName} (${it.sku}): ${it.quantity} ${UNIT_LABELS[it.unit as Unit] ?? it.unit}`,
    ),
    "",
    "Děkuji.",
  ];
  const mailto = `mailto:${order.supplierEmail ?? ""}?subject=${subject}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Objednávka – {order.supplierName}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <Badge variant={order.status === "CANCELLED" ? "destructive" : "secondary"}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            {order.supplierEmail && <span>{order.supplierEmail}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.supplierUrl && (
            <a href={order.supplierUrl} target="_blank" rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}>
              <ExternalLink className="size-4" /> E-shop dodavatele
            </a>
          )}
          {isDraft && (
            <>
              {mailReady && order.supplierEmail && (
                <Button
                  variant="outline"
                  disabled={pending || order.items.length === 0}
                  onClick={() => setEmailOpen((v) => !v)}
                >
                  <MailCheck className="size-4" /> Odeslat e-mailem
                </Button>
              )}
              <a href={mailto} className={buttonVariants({ variant: "outline" })}>
                <Mail className="size-4" /> Otevřít ve svém e-mailu
              </a>
              <Button
                disabled={pending || order.items.length === 0}
                onClick={() => {
                  if (confirm("Označit objednávku jako odeslanou? (bez odeslání e-mailu z appky)")) {
                    run(() => markOrderSent(order.id));
                  }
                }}
              >
                <Send className="size-4" /> Označit jako odeslané
              </Button>
            </>
          )}
          {order.status === "SENT" && (
            <Button variant="outline" disabled={pending}
              onClick={() => run(() => setOrderStatus(order.id, "RECEIVED"))}>
              Označit jako přijaté
            </Button>
          )}
          {(isDraft || order.status === "SENT") && (
            <Button variant="outline" disabled={pending}
              onClick={() => run(() => setOrderStatus(order.id, "CANCELLED"))}>
              <Ban className="size-4" /> Zrušit
            </Button>
          )}
          {(isDraft || order.status === "CANCELLED") && (
            <Button variant="destructive" disabled={pending}
              onClick={() => { if (confirm("Smazat objednávku?")) run(() => deleteOrder(order.id)); }}>
              <Trash2 className="size-4" /> Smazat
            </Button>
          )}
        </div>
      </div>

      {isDraft && !order.supplierEmail && (
        <p className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Dodavatel nemá objednávkový e-mail — doplň ho v Nastavení → Dodavatelé, ať můžeš odeslat přímo z appky.
        </p>
      )}
      {isDraft && !mailReady && order.supplierEmail && (
        <p className="rounded-md bg-slate-50 px-4 py-2 text-sm text-slate-500">
          Odesílání z appky není nakonfigurované (SMTP). Zatím použij „Otevřít ve svém e-mailu".
        </p>
      )}

      {isDraft && emailOpen && (
        <div className="space-y-2 rounded-lg border bg-white p-4">
          <p className="text-sm font-medium text-slate-700">
            Odeslat objednávku na {order.supplierEmail}
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            placeholder="Krátká zpráva pro dodavatele…"
          />
          <p className="text-xs text-slate-400">
            Seznam položek se přiloží jako CSV (otevře se v Excelu) a zároveň bude v textu e-mailu.
          </p>
          <div className="flex gap-2">
            <Button disabled={pending} onClick={sendEmail}>
              <MailCheck className="size-4" /> {pending ? "Odesílám…" : "Odeslat objednávku"}
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => setEmailOpen(false)}>
              Zrušit
            </Button>
          </div>
        </div>
      )}

      {!isDraft && (
        <p className="rounded-md bg-slate-50 px-4 py-2 text-sm text-slate-500">
          Položky lze upravovat jen u návrhu (DRAFT).
        </p>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Položka</TableHead>
              <TableHead className="w-40 text-right">Množství</TableHead>
              <TableHead className="text-right">Cena/ks</TableHead>
              <TableHead className="text-right">Celkem</TableHead>
              {isDraft && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={isDraft ? 5 : 4} className="text-center text-slate-500">
                  Objednávka nemá žádné položky.
                </TableCell>
              </TableRow>
            )}
            {order.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">
                  {it.productName}
                  <span className="block font-mono text-xs text-slate-400">{it.sku}</span>
                </TableCell>
                <TableCell className="text-right">
                  {isDraft ? (
                    <Input
                      type="number" step="any" min="0"
                      value={qty[it.id] ?? ""}
                      onChange={(e) => setQty({ ...qty, [it.id]: e.target.value })}
                      onBlur={() => saveQty(it.id)}
                      className="text-right"
                    />
                  ) : (
                    <>
                      {it.quantity} {UNIT_LABELS[it.unit as Unit] ?? it.unit}
                    </>
                  )}
                </TableCell>
                <TableCell className="text-right text-slate-500">
                  {formatCZK(it.unitPrice)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCZK(it.quantity * it.unitPrice)}
                </TableCell>
                {isDraft && (
                  <TableCell>
                    <button type="button" aria-label="Odebrat" disabled={pending}
                      onClick={() => run(() => removeOrderItem(it.id))}
                      className="text-slate-400 hover:text-red-600 disabled:opacity-40">
                      <Trash2 className="size-4" />
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <p className="text-lg">
          Celkem bez DPH:{" "}
          <strong className="text-slate-900">{formatCZK(total)}</strong>
        </p>
      </div>
    </div>
  );
}
