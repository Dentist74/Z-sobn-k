import Link from "next/link";
import {
  Wallet,
  TriangleAlert,
  CalendarClock,
  PackageX,
  PackageMinus,
  ClipboardList,
  Pencil,
} from "lucide-react";
import { requireUser, can } from "@/lib/dal";
import {
  getStockAlerts,
  getInventoryValue,
  getExpiringBatches,
  getIncompleteProducts,
} from "@/lib/stock";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCZK, formatQty, formatDate } from "@/lib/format";
import { EXPIRY_WARN_DAYS } from "@/lib/config";

export const metadata = { title: "Přehled – Zásobník" };

export default async function DashboardPage() {
  const user = await requireUser();
  const showPrices = can(user, "MANAGER");

  const canManage = can(user, "MANAGER");
  const [belowMin, value, expiring, incomplete] = await Promise.all([
    getStockAlerts(),
    getInventoryValue(),
    getExpiringBatches(EXPIRY_WARN_DAYS),
    canManage ? getIncompleteProducts() : Promise.resolve([]),
  ]);

  const expired = expiring.filter((b) => b.daysLeft < 0);
  const expiringSoon = expiring.filter((b) => b.daysLeft >= 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Přehled</h1>
        <p className="mt-1 text-slate-500">Vítej zpět, {user.name}.</p>
      </div>

      {/* Souhrnné karty */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showPrices && (
          <StatCard
            icon={<Wallet className="size-5" />}
            label="Hodnota skladu"
            value={formatCZK(value)}
            tone="brand"
          />
        )}
        <StatCard
          icon={<TriangleAlert className="size-5" />}
          label="Položky pod minimem"
          value={String(belowMin.length)}
          tone={belowMin.length ? "warn" : "ok"}
        />
        <StatCard
          icon={<CalendarClock className="size-5" />}
          label={`Brzy expiruje (${EXPIRY_WARN_DAYS} dní)`}
          value={String(expiringSoon.length)}
          tone={expiringSoon.length ? "warn" : "ok"}
        />
        <StatCard
          icon={<PackageX className="size-5" />}
          label="Po expiraci"
          value={String(expired.length)}
          tone={expired.length ? "danger" : "ok"}
        />
        {canManage && (
          <StatCard
            icon={<ClipboardList className="size-5" />}
            label="Karty k doplnění"
            value={String(incomplete.length)}
            tone={incomplete.length ? "warn" : "ok"}
          />
        )}
      </div>

      {/* Co dochází */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Co dochází
        </h2>
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
              {belowMin.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    Vše je nad minimem. 👍
                  </TableCell>
                </TableRow>
              )}
              {belowMin.map((p, i) => (
                <TableRow key={`${p.productId}-${i}`}>
                  <TableCell className="font-medium">
                    <Link href={`/produkty/${p.productId}`} className="hover:underline">
                      {p.productName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {p.warehouseName ?? "celkem"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">
                      {formatQty(p.currentQty, p.unit)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {formatQty(p.minQty, p.unit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.reorderQuantity
                      ? formatQty(p.reorderQuantity, p.unit)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {p.supplierName ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Karty k doplnění */}
      {canManage && incomplete.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            Karty k doplnění ({incomplete.length})
          </h2>
          <p className="mb-3 text-sm text-slate-500">
            Tyto karty nemají vyplněné všechny údaje — třeba nové ze skenu dokladu.
          </p>
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
                {incomplete.slice(0, 30).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link href={`/produkty/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
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
                      <Link
                        href={`/produkty/${p.id}/upravit`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <Pencil className="size-3.5" /> Doplnit
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {incomplete.length > 30 && (
              <p className="px-4 py-2 text-xs text-slate-400">
                …a dalších {incomplete.length - 30}.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Expirace */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Expirace a propadlé šarže
        </h2>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Položka</TableHead>
                <TableHead>Šarže</TableHead>
                <TableHead>Expirace</TableHead>
                <TableHead className="text-right">Množství</TableHead>
                <TableHead>Sklad</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiring.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    Žádné šarže blízko expirace. 👍
                  </TableCell>
                </TableRow>
              )}
              {expiring.map((b) => {
                const isExpired = b.daysLeft < 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/produkty/${b.productId}`}
                        className="hover:underline"
                      >
                        {b.productName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.lotNumber ?? "—"}
                    </TableCell>
                    <TableCell
                      className={
                        isExpired
                          ? "font-medium text-red-600"
                          : "text-amber-600"
                      }
                    >
                      {formatDate(b.expiryDate)}{" "}
                      {isExpired ? (
                        <Badge variant="destructive">propadlé</Badge>
                      ) : (
                        <span className="text-xs">(za {b.daysLeft} dní)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQty(b.quantity, b.unit)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {b.warehouseName}
                    </TableCell>
                    <TableCell>
                      {isExpired && (
                        <Link
                          href={`/vydej?product=${b.productId}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          <PackageMinus className="size-3.5" />
                          Odepsat
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn" | "danger" | "brand";
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
    <div
      className={
        "rounded-xl border border-slate-200 bg-white p-4 " +
        (tone === "brand" ? "border-l-4 border-l-[#F4B63E]" : "")
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={"flex size-9 items-center justify-center rounded-lg " + chip}>
          {icon}
        </span>
      </div>
      <p className={"mt-2 text-2xl font-semibold " + valueClass}>{value}</p>
    </div>
  );
}
