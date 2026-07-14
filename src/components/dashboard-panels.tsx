"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TriangleAlert,
  CalendarClock,
  PackageX,
  PackageMinus,
  ClipboardList,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Vše předpřipravené na serveru jako texty — klient jen zobrazuje.
export type DashboardVM = {
  showPrices: boolean;
  canManage: boolean;
  expiryWarnDays: number;
  valueLabel: string;
  consumption: {
    totalLabel: string;
    byOrdinace: { name: string; valueLabel: string }[];
    topProducts: { productId: string; name: string; qtyLabel: string; valueLabel: string }[];
  };
  belowMin: {
    productId: string;
    productName: string;
    warehouseName: string;
    currentLabel: string;
    minLabel: string;
    reorderLabel: string;
    supplierName: string;
  }[];
  expiringSoon: ExpiryRow[];
  expired: ExpiryRow[];
  incomplete: { id: string; name: string; fromScan: boolean; missing: string[] }[];
};

type ExpiryRow = {
  id: string;
  productId: string;
  productName: string;
  lotLabel: string;
  expiryLabel: string;
  daysLeft: number;
  qtyLabel: string;
  warehouseName: string;
};

type PanelKey = "value" | "belowMin" | "expiring" | "expired" | "incomplete";

export function DashboardPanels({ vm }: { vm: DashboardVM }) {
  const [open, setOpen] = useState<PanelKey | null>(null);
  const toggle = (k: PanelKey) => setOpen((p) => (p === k ? null : k));

  return (
    <div className="space-y-6">
      {/* Bubliny */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {vm.showPrices && (
          <StatBubble
            icon={<Wallet className="size-5" />} label="Hodnota skladu"
            value={vm.valueLabel} tone="brand"
            active={open === "value"} onClick={() => toggle("value")}
          />
        )}
        <StatBubble
          icon={<TriangleAlert className="size-5" />} label="Položky pod minimem"
          value={String(vm.belowMin.length)} tone={vm.belowMin.length ? "warn" : "ok"}
          active={open === "belowMin"} onClick={() => toggle("belowMin")}
        />
        <StatBubble
          icon={<CalendarClock className="size-5" />} label={`Brzy expiruje (${vm.expiryWarnDays} dní)`}
          value={String(vm.expiringSoon.length)} tone={vm.expiringSoon.length ? "warn" : "ok"}
          active={open === "expiring"} onClick={() => toggle("expiring")}
        />
        <StatBubble
          icon={<PackageX className="size-5" />} label="Po expiraci"
          value={String(vm.expired.length)} tone={vm.expired.length ? "danger" : "ok"}
          active={open === "expired"} onClick={() => toggle("expired")}
        />
        {vm.canManage && (
          <StatBubble
            icon={<ClipboardList className="size-5" />} label="Karty k doplnění"
            value={String(vm.incomplete.length)} tone={vm.incomplete.length ? "warn" : "ok"}
            active={open === "incomplete"} onClick={() => toggle("incomplete")}
          />
        )}
      </div>

      {open === null && (
        <p className="text-center text-sm text-slate-400">
          Klikni na bublinu a detail se zobrazí tady.
        </p>
      )}

      {/* Detail pod bublinami */}
      {open === "value" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Spotřeba materiálu (30 dní) — {vm.consumption.totalLabel}
          </h2>
          {vm.consumption.byOrdinace.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vm.consumption.byOrdinace.map((o) => (
                <span key={o.name} className="rounded-lg border bg-white px-3 py-1.5 text-sm">
                  {o.name}: <b>{o.valueLabel}</b>
                </span>
              ))}
            </div>
          )}
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Položka</TableHead>
                  <TableHead className="text-right">Spotřebováno</TableHead>
                  <TableHead className="text-right">Náklady</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.consumption.topProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500">
                      Za posledních 30 dní není žádná spotřeba.
                    </TableCell>
                  </TableRow>
                )}
                {vm.consumption.topProducts.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="font-medium">
                      <Link href={`/produkty/${p.productId}`} className="hover:underline">{p.name}</Link>
                    </TableCell>
                    <TableCell className="text-right">{p.qtyLabel}</TableCell>
                    <TableCell className="text-right">{p.valueLabel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Link href="/spotreba" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Podrobná spotřeba →
          </Link>
        </section>
      )}

      {open === "belowMin" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Položky pod minimem</h2>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Položka</TableHead>
                  <TableHead>Sklad</TableHead>
                  <TableHead className="text-right">Skladem</TableHead>
                  <TableHead className="text-right">Minimum</TableHead>
                  <TableHead className="text-right">Objednat</TableHead>
                  <TableHead>Dodavatel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.belowMin.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500">
                      Vše je nad minimem. 👍
                    </TableCell>
                  </TableRow>
                )}
                {vm.belowMin.map((p, i) => (
                  <TableRow key={`${p.productId}-${i}`}>
                    <TableCell className="font-medium">
                      <Link href={`/produkty/${p.productId}`} className="hover:underline">
                        {p.productName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-500">{p.warehouseName}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{p.currentLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-slate-500">{p.minLabel}</TableCell>
                    <TableCell className="text-right">{p.reorderLabel}</TableCell>
                    <TableCell className="text-slate-500">{p.supplierName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {open === "expiring" && (
        <ExpiryTable
          title={`Brzy expiruje (do ${vm.expiryWarnDays} dní)`}
          rows={vm.expiringSoon}
          emptyText="Žádné šarže blízko expirace. 👍"
        />
      )}

      {open === "expired" && (
        <ExpiryTable
          title="Po expiraci"
          rows={vm.expired}
          emptyText="Žádné propadlé šarže. 👍"
          expired
        />
      )}

      {open === "incomplete" && vm.canManage && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Karty k doplnění ({vm.incomplete.length})
            </h2>
            <p className="text-sm text-slate-500">
              Tyto karty nemají vyplněné všechny údaje — třeba nové ze skenu dokladu.
            </p>
          </div>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Položka</TableHead>
                  <TableHead>Chybí doplnit</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.incomplete.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500">
                      Všechny karty jsou kompletní. 👍
                    </TableCell>
                  </TableRow>
                )}
                {vm.incomplete.slice(0, 30).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link href={`/produkty/${p.id}`} className="hover:underline">{p.name}</Link>
                      {p.fromScan && (
                        <Badge variant="outline" className="ml-2 text-[10px]">ze skenu</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.missing.length === 0 ? (
                          <span className="text-xs text-slate-400">zkontrolovat</span>
                        ) : (
                          p.missing.map((m) => (
                            <Badge key={m} variant="secondary" className="text-[11px]">{m}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/produkty/${p.id}/upravit`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}>
                        <Pencil className="size-3.5" /> Doplnit
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {vm.incomplete.length > 30 && (
              <p className="px-4 py-2 text-xs text-slate-400">
                …a dalších {vm.incomplete.length - 30}.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ExpiryTable({
  title,
  rows,
  emptyText,
  expired = false,
}: {
  title: string;
  rows: ExpiryRow[];
  emptyText: string;
  expired?: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Položka</TableHead>
              <TableHead>Šarže</TableHead>
              <TableHead>Expirace</TableHead>
              <TableHead className="text-right">Množství</TableHead>
              <TableHead>Sklad</TableHead>
              {expired && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={expired ? 6 : 5} className="text-center text-slate-500">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">
                  <Link href={`/produkty/${b.productId}`} className="hover:underline">
                    {b.productName}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{b.lotLabel}</TableCell>
                <TableCell className={expired ? "font-medium text-red-600" : "text-amber-600"}>
                  {b.expiryLabel}{" "}
                  {expired ? (
                    <Badge variant="destructive">propadlé</Badge>
                  ) : (
                    <span className="text-xs">(za {b.daysLeft} dní)</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{b.qtyLabel}</TableCell>
                <TableCell className="text-slate-500">{b.warehouseName}</TableCell>
                {expired && (
                  <TableCell>
                    <Link href={`/vydej?product=${b.productId}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <PackageMinus className="size-3.5" /> Odepsat
                    </Link>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function StatBubble({
  icon,
  label,
  value,
  tone = "neutral",
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn" | "danger" | "brand";
  active: boolean;
  onClick: () => void;
}) {
  const chip = {
    neutral: "bg-[#103D63]/10 text-[#103D63]",
    brand: "bg-[#F4B63E]/20 text-[#9a6b0e]",
    ok: "bg-green-100 text-green-700",
    warn: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  }[tone];
  const valueClass = {
    neutral: "text-slate-800",
    brand: "text-[#103D63]",
    ok: "text-green-600",
    warn: "text-amber-600",
    danger: "text-red-600",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-xl border bg-white p-4 text-left transition hover:shadow-md " +
        (active
          ? "border-[#103D63] ring-2 ring-[#103D63]/25"
          : "border-slate-200 " + (tone === "brand" ? "border-l-4 border-l-[#F4B63E]" : ""))
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={"flex size-9 items-center justify-center rounded-lg " + chip}>{icon}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className={"text-2xl font-semibold " + valueClass}>{value}</p>
        <ChevronDown
          className={"size-4 text-slate-400 transition-transform " + (active ? "rotate-180" : "")}
        />
      </div>
    </button>
  );
}
