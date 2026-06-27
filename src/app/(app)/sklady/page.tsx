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
import { WAREHOUSE_TYPE_LABELS, type WarehouseType } from "@/lib/enums";

export const metadata = { title: "Sklady – Zásobník" };

export default async function WarehousesPage() {
  await requireRole("MANAGER");

  const warehouses = await db.warehouse.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { batches: true, bins: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sklady</h1>
          <p className="mt-1 text-slate-500">
            Fyzické i logické sklady kliniky.
          </p>
        </div>
        <Link href="/sklady/novy" className={buttonVariants()}>
          <Plus className="size-4" />
          Nový sklad
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Umístění</TableHead>
              <TableHead className="text-right">Šarží</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  Zatím žádné sklady.
                </TableCell>
              </TableRow>
            )}
            {warehouses.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.name}</TableCell>
                <TableCell>
                  {WAREHOUSE_TYPE_LABELS[w.type as WarehouseType] ?? w.type}
                </TableCell>
                <TableCell className="text-slate-500">
                  {w.locationLabel ?? "—"}
                </TableCell>
                <TableCell className="text-right">{w._count.batches}</TableCell>
                <TableCell>
                  {w.active ? (
                    <Badge variant="secondary">Aktivní</Badge>
                  ) : (
                    <Badge variant="outline">Neaktivní</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/sklady/${w.id}`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                    aria-label="Upravit"
                  >
                    <Pencil className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
