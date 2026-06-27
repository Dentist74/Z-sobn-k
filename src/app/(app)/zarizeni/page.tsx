import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
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
import { formatDate, daysUntil } from "@/lib/format";

export const metadata = { title: "Zařízení – Zásobník" };

export default async function EquipmentPage() {
  await requireRole("MANAGER");
  const items = await db.equipment.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Zařízení</h1>
          <p className="mt-1 text-slate-500">Evidence přístrojů a jejich revizí.</p>
        </div>
        <Link href="/zarizeni/nove" className={buttonVariants()}>
          <Plus className="size-4" /> Nové zařízení
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Sériové č.</TableHead>
              <TableHead>Umístění</TableHead>
              <TableHead>Příští revize</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  Zatím žádná zařízení.
                </TableCell>
              </TableRow>
            )}
            {items.map((e) => {
              const d = daysUntil(e.nextServiceDate);
              const overdue = d != null && d < 0;
              const soon = d != null && d >= 0 && d <= 30;
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {e.serialNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-slate-500">{e.location ?? "—"}</TableCell>
                  <TableCell className={overdue ? "text-red-600 font-medium" : soon ? "text-amber-600" : "text-slate-500"}>
                    {formatDate(e.nextServiceDate)}
                    {overdue && " (po termínu)"}
                    {soon && ` (za ${d} dní)`}
                  </TableCell>
                  <TableCell>
                    {e.active ? (
                      <Badge variant="secondary">V provozu</Badge>
                    ) : (
                      <Badge variant="outline">Vyřazeno</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/zarizeni/${e.id}`}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      aria-label="Upravit">
                      <Pencil className="size-4" />
                    </Link>
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
