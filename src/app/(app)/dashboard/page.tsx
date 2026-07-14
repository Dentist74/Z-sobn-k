import { requireUser, can } from "@/lib/dal";
import {
  getStockAlerts,
  getInventoryValue,
  getExpiringBatches,
  getIncompleteProducts,
  getConsumption,
} from "@/lib/stock";
import { DashboardPanels, type DashboardVM } from "@/components/dashboard-panels";
import { formatCZK, formatQty, formatDate } from "@/lib/format";
import { EXPIRY_WARN_DAYS } from "@/lib/config";

export const metadata = { title: "Přehled – Zásobník" };

export default async function DashboardPage() {
  const user = await requireUser();
  const showPrices = can(user, "MANAGER");
  const canManage = can(user, "MANAGER");

  const [belowMin, value, expiring, incomplete, consumption] = await Promise.all([
    getStockAlerts(),
    getInventoryValue(),
    getExpiringBatches(EXPIRY_WARN_DAYS),
    canManage ? getIncompleteProducts() : Promise.resolve([]),
    getConsumption({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }),
  ]);

  const expiryRow = (b: (typeof expiring)[number]) => ({
    id: b.id,
    productId: b.productId,
    productName: b.productName,
    lotLabel: b.lotNumber ?? "—",
    expiryLabel: formatDate(b.expiryDate),
    daysLeft: b.daysLeft,
    qtyLabel: formatQty(b.quantity, b.unit),
    warehouseName: b.warehouseName,
  });

  const vm: DashboardVM = {
    showPrices,
    canManage,
    expiryWarnDays: EXPIRY_WARN_DAYS,
    valueLabel: formatCZK(value),
    consumption: {
      totalLabel: formatCZK(consumption.totalValue),
      byOrdinace: consumption.byOrdinace.map((o) => ({
        name: o.name,
        valueLabel: formatCZK(o.value),
      })),
      topProducts: consumption.byProduct.slice(0, 10).map((p) => ({
        productId: p.productId,
        name: p.name,
        qtyLabel: formatQty(p.qty, p.unit),
        valueLabel: formatCZK(p.value),
      })),
    },
    belowMin: belowMin.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      warehouseName: p.warehouseName ?? "celkem",
      currentLabel: formatQty(p.currentQty, p.unit),
      minLabel: formatQty(p.minQty, p.unit),
      reorderLabel: p.reorderQuantity ? formatQty(p.reorderQuantity, p.unit) : "—",
      supplierName: p.supplierName ?? "—",
    })),
    expiringSoon: expiring.filter((b) => b.daysLeft >= 0).map(expiryRow),
    expired: expiring.filter((b) => b.daysLeft < 0).map(expiryRow),
    incomplete: incomplete.map((p) => ({
      id: p.id,
      name: p.name,
      fromScan: p.fromScan,
      missing: p.missing,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Přehled</h1>
        <p className="mt-1 text-slate-500">Vítej zpět, {user.name}.</p>
      </div>
      <DashboardPanels vm={vm} />
    </div>
  );
}
