import "server-only";
import { getStockAlerts, getExpiringBatches } from "@/lib/stock";
import { EXPIRY_WARN_DAYS } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { UNIT_LABELS, type Unit } from "@/lib/enums";

const unit = (u: string) => UNIT_LABELS[u as Unit] ?? u;

export async function buildExpirySummary() {
  const [belowMin, expiring] = await Promise.all([
    getStockAlerts(),
    getExpiringBatches(EXPIRY_WARN_DAYS),
  ]);
  const expired = expiring.filter((b) => b.daysLeft < 0);
  const expiringSoon = expiring.filter((b) => b.daysLeft >= 0);
  return { belowMin, expired, expiringSoon };
}

export function summaryToText(s: Awaited<ReturnType<typeof buildExpirySummary>>): string {
  const lines: string[] = ["Souhrn skladu – Zásobník", ""];

  lines.push(`DOCHÁZEJÍCÍ POLOŽKY (${s.belowMin.length}):`);
  if (s.belowMin.length === 0) lines.push("  — vše nad minimem");
  for (const a of s.belowMin) {
    lines.push(
      `  • ${a.productName}${a.warehouseName ? ` [${a.warehouseName}]` : ""}: ${a.currentQty} ${unit(a.unit)} (min ${a.minQty})`,
    );
  }
  lines.push("");

  lines.push(`PO EXPIRACI (${s.expired.length}):`);
  if (s.expired.length === 0) lines.push("  — žádné");
  for (const b of s.expired) {
    lines.push(`  • ${b.productName} (š. ${b.lotNumber ?? "—"}): exp. ${formatDate(b.expiryDate)}, ${b.quantity} ${unit(b.unit)}`);
  }
  lines.push("");

  lines.push(`BRZY EXPIRUJE do ${EXPIRY_WARN_DAYS} dní (${s.expiringSoon.length}):`);
  if (s.expiringSoon.length === 0) lines.push("  — žádné");
  for (const b of s.expiringSoon) {
    lines.push(`  • ${b.productName} (š. ${b.lotNumber ?? "—"}): exp. ${formatDate(b.expiryDate)} (za ${b.daysLeft} dní), ${b.quantity} ${unit(b.unit)}`);
  }

  return lines.join("\n");
}

export function summaryIsEmpty(s: Awaited<ReturnType<typeof buildExpirySummary>>): boolean {
  return s.belowMin.length === 0 && s.expired.length === 0 && s.expiringSoon.length === 0;
}
