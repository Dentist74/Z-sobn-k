import { UNIT_LABELS, type Unit } from "@/lib/enums";

const czk = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 2,
});

const num = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2 });

const dateFmt = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

// Prisma Decimal | number | null → number
export function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v);
}

export function formatCZK(v: unknown): string {
  return czk.format(toNumber(v));
}

export function formatNumber(v: unknown): string {
  return num.format(toNumber(v));
}

export function formatQty(v: unknown, unit: string): string {
  const label = UNIT_LABELS[unit as Unit] ?? unit;
  return `${num.format(toNumber(v))} ${label}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateFmt.format(typeof d === "string" ? new Date(d) : d);
}

const dateTimeFmt = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateTimeFmt.format(typeof d === "string" ? new Date(d) : d);
}

// Dní do expirace (záporné = po expiraci). null pokud bez expirace.
export function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
