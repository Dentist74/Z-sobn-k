import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { getConsumption } from "@/lib/stock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCZK, formatQty } from "@/lib/format";

export const metadata = { title: "Spotřeba materiálu – Zásobník" };

export default async function ConsumptionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; ordinace?: string }>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;

  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(sp.to + "T23:59:59") : undefined;
  const ordinaceId = sp.ordinace || undefined;

  const [ordinace, result] = await Promise.all([
    db.ordinace.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getConsumption({ from, to, ordinaceId }),
  ]);

  const selectClass =
    "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Spotřeba materiálu
          </h1>
          <p className="mt-1 text-slate-500">
            Hodnota a množství vydaného materiálu, rozpad po ordinacích.
          </p>
        </div>
        <a
          href={`/api/export/spotreba?${new URLSearchParams({
            ...(sp.from ? { from: sp.from } : {}),
            ...(sp.to ? { to: sp.to } : {}),
            ...(sp.ordinace ? { ordinace: sp.ordinace } : {}),
          }).toString()}`}
          className={buttonVariants({ variant: "outline" })}
        >
          <Download className="size-4" />
          Export CSV
        </a>
      </div>

      {/* Filtr */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <div className="space-y-1.5">
          <Label htmlFor="from">Od</Label>
          <input id="from" name="from" type="date" defaultValue={sp.from ?? ""}
            className={selectClass} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Do</Label>
          <input id="to" name="to" type="date" defaultValue={sp.to ?? ""}
            className={selectClass} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ordinace">Ordinace</Label>
          <select id="ordinace" name="ordinace" defaultValue={sp.ordinace ?? ""}
            className={selectClass}>
            <option value="">Všechny</option>
            {ordinace.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <Button type="submit">Zobrazit</Button>
      </form>

      {/* Souhrn */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Hodnota spotřebovaného materiálu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCZK(result.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Počet výdejů
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{result.totalQtyLines}</p>
          </CardContent>
        </Card>
      </div>

      {/* Po ordinacích */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Spotřeba po ordinacích
        </h2>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordinace</TableHead>
                <TableHead className="text-right">Hodnota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.byOrdinace.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-slate-500">
                    Žádná spotřeba za zvolené období.
                  </TableCell>
                </TableRow>
              )}
              {result.byOrdinace.map((o) => (
                <TableRow key={o.ordinaceId ?? "none"}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-right">{formatCZK(o.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Po produktech */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Spotřebované položky
        </h2>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Položka</TableHead>
                <TableHead className="text-right">Množství</TableHead>
                <TableHead className="text-right">Hodnota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.byProduct.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500">
                    Žádná spotřeba za zvolené období.
                  </TableCell>
                </TableRow>
              )}
              {result.byProduct.map((p) => (
                <TableRow key={p.productId}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">
                    {formatQty(p.qty, p.unit)}
                  </TableCell>
                  <TableCell className="text-right">{formatCZK(p.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
