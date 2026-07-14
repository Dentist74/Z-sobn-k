import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { getInventoryValue } from "@/lib/stock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCZK, formatQty, toNumber } from "@/lib/format";

export const metadata = { title: "Náklady a grafy – Zásobník" };

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;
  const days = Number(sp.days) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const since12m = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const [movements, stockValue, chartMoves] = await Promise.all([
    db.stockMovement.findMany({
      where: { type: { in: ["ISSUE", "WRITE_OFF"] }, createdAt: { gte: since } },
      include: {
        ordinace: { select: { name: true } },
        batch: { select: { pricePurchase: true, product: { select: { name: true, unit: true } } } },
      },
    }),
    getInventoryValue(),
    db.stockMovement.findMany({
      where: { type: { in: ["ISSUE", "WRITE_OFF"] }, createdAt: { gte: since12m } },
      select: { quantity: true, createdAt: true, batch: { select: { pricePurchase: true } } },
    }),
  ]);

  // měsíční buckety spotřeby (posledních 12 měsíců)
  const monthLabels: string[] = [];
  const monthKeys: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
    monthLabels.push(d.toLocaleDateString("cs-CZ", { month: "short" }));
  }
  const monthValues: Record<string, number> = {};
  for (const m of chartMoves) {
    const d = new Date(m.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthValues[key] = (monthValues[key] ?? 0) + Math.abs(toNumber(m.quantity)) * toNumber(m.batch?.pricePurchase);
  }
  const chartData = monthKeys.map((k, i) => ({ label: monthLabels[i], value: monthValues[k] ?? 0 }));
  const chartMax = Math.max(1, ...chartData.map((c) => c.value));

  // agregace spotřeby
  const byOrdinace = new Map<string, number>();
  const byProduct = new Map<string, { qty: number; value: number; unit: string }>();
  let totalValue = 0;
  let totalQty = 0;

  for (const m of movements) {
    const qty = Math.abs(toNumber(m.quantity));
    const price = toNumber(m.batch?.pricePurchase);
    const value = qty * price;
    totalValue += value;
    totalQty += qty;

    const oName = m.ordinace?.name ?? "Bez ordinace / odpis";
    byOrdinace.set(oName, (byOrdinace.get(oName) ?? 0) + value);

    const pName = m.batch?.product.name ?? "—";
    const cur = byProduct.get(pName) ?? { qty: 0, value: 0, unit: m.batch?.product.unit ?? "PCS" };
    cur.qty += qty;
    cur.value += value;
    byProduct.set(pName, cur);
  }

  const ordinaceRows = [...byOrdinace.entries()].sort((a, b) => b[1] - a[1]);
  const topProducts = [...byProduct.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 15);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Náklady a grafy</h1>
          <p className="mt-1 text-slate-500">Spotřeba a náklady za zvolené období.</p>
        </div>
        <form method="get">
          <select name="days" defaultValue={String(days)} className={selectClass}>
            <option value="7">7 dní</option>
            <option value="30">30 dní</option>
            <option value="90">90 dní</option>
            <option value="365">1 rok</option>
          </select>{" "}
          <button type="submit" className={selectClass + " cursor-pointer bg-slate-900 px-4 text-white"}>
            Zobrazit
          </button>
        </form>
      </div>

      {/* Souhrn */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-l-4 border-l-[#F4B63E] bg-white p-4">
          <div className="text-sm text-slate-500">Náklady na spotřebu (období)</div>
          <div className="mt-1 text-2xl font-semibold text-[#103D63]">{formatCZK(totalValue)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-500">Vydáno celkem</div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{Math.round(totalQty)} ks</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-500">Aktuální hodnota skladu</div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{formatCZK(stockValue)}</div>
        </div>
      </div>

      {/* Graf spotřeby v čase */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Spotřeba v čase (12 měsíců)
        </h2>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex h-48 items-end gap-2">
            {chartData.map((c, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-slate-400">
                  {c.value > 0 ? Math.round(c.value / 1000) + "k" : ""}
                </span>
                <div
                  className="w-full rounded-t bg-[#103D63]"
                  style={{ height: `${Math.round((c.value / chartMax) * 100)}%`, minHeight: c.value > 0 ? 2 : 0 }}
                  title={formatCZK(c.value)}
                />
                <span className="text-[11px] text-slate-500">{c.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Náklady na spotřebu (výdej + odpis) po měsících. Hodnoty v tisících Kč.
          </p>
        </div>
      </section>

      {/* Náklady po ordinacích */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Náklady po ordinacích</h2>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordinace</TableHead>
                <TableHead className="text-right">Náklady</TableHead>
                <TableHead className="text-right">Podíl</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordinaceRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500">Žádný výdej v období.</TableCell>
                </TableRow>
              )}
              {ordinaceRows.map(([name, value]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-right">{formatCZK(value)}</TableCell>
                  <TableCell className="text-right text-slate-500">
                    {totalValue > 0 ? Math.round((value / totalValue) * 100) : 0} %
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Nejvíce spotřebované položky */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Nejvíce spotřebované položky</h2>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Položka</TableHead>
                <TableHead className="text-right">Množství</TableHead>
                <TableHead className="text-right">Náklady</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500">Žádná spotřeba v období.</TableCell>
                </TableRow>
              )}
              {topProducts.map(([name, v]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-right">{formatQty(v.qty, v.unit)}</TableCell>
                  <TableCell className="text-right">{formatCZK(v.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
