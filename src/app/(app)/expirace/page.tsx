import Link from "next/link";
import { PackageMinus } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { getExpiringBatches } from "@/lib/stock";
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
import { formatDate, formatQty } from "@/lib/format";

export const metadata = { title: "Expirace – Zásobník" };

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs";

export default async function ExpiryPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;
  const days = Number(sp.days) || 60;

  const batches = await getExpiringBatches(days);
  const expired = batches.filter((b) => b.daysLeft < 0);
  const soon = batches.filter((b) => b.daysLeft >= 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Expirace</h1>
          <p className="mt-1 text-slate-500">
            Šarže po expiraci ({expired.length}) a blížící se expiraci ({soon.length}).
          </p>
        </div>
        <form method="get">
          <select name="days" defaultValue={String(days)} className={selectClass}>
            <option value="30">do 30 dní</option>
            <option value="60">do 60 dní</option>
            <option value="90">do 90 dní</option>
            <option value="180">do 6 měsíců</option>
            <option value="365">do 1 roku</option>
          </select>{" "}
          <button type="submit" className={selectClass + " cursor-pointer bg-slate-900 px-4 text-white"}>
            Zobrazit
          </button>
        </form>
      </div>

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
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  Žádné šarže v tomto období. 👍
                </TableCell>
              </TableRow>
            )}
            {batches.map((b) => {
              const isExpired = b.daysLeft < 0;
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    <Link href={`/produkty/${b.productId}`} className="hover:underline">
                      {b.productName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{b.lotNumber ?? "—"}</TableCell>
                  <TableCell className={isExpired ? "font-medium text-red-600" : "text-amber-600"}>
                    {formatDate(b.expiryDate)}{" "}
                    {isExpired ? (
                      <Badge variant="destructive">propadlé</Badge>
                    ) : (
                      <span className="text-xs">(za {b.daysLeft} dní)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatQty(b.quantity, b.unit)}</TableCell>
                  <TableCell className="text-slate-500">{b.warehouseName}</TableCell>
                  <TableCell>
                    {isExpired && (
                      <Link href={`/vydej?product=${b.productId}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}>
                        <PackageMinus className="size-3.5" /> Odepsat
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
