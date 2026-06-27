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

export const metadata = { title: "Dodavatelé – Zásobník" };

export default async function SuppliersPage() {
  await requireRole("MANAGER");
  const suppliers = await db.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      _count: { select: { products: true, orders: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dodavatelé</h1>
          <p className="mt-1 text-slate-500">Dodavatelé a obchodní zástupci.</p>
        </div>
        <Link href="/dodavatele/novy" className={buttonVariants()}>
          <Plus className="size-4" />
          Nový dodavatel
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>E-mail pro objednávky</TableHead>
              <TableHead>Hlavní kontakt</TableHead>
              <TableHead className="text-right">Položek</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  Zatím žádní dodavatelé.
                </TableCell>
              </TableRow>
            )}
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-slate-500">{s.orderEmail ?? "—"}</TableCell>
                <TableCell className="text-slate-500">
                  {s.contacts[0]?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right">{s._count.products}</TableCell>
                <TableCell>
                  {s.active ? (
                    <Badge variant="secondary">Aktivní</Badge>
                  ) : (
                    <Badge variant="outline">Neaktivní</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dodavatele/${s.id}`}
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
