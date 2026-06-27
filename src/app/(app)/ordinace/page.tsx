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

export const metadata = { title: "Ordinace – Zásobník" };

export default async function OrdinacePage() {
  await requireRole("MANAGER");
  const ordinace = await db.ordinace.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Ordinace</h1>
          <p className="mt-1 text-slate-500">
            Oddělení, kterým se připisuje spotřeba materiálu.
          </p>
        </div>
        <Link href="/ordinace/nova" className={buttonVariants()}>
          <Plus className="size-4" />
          Nová ordinace
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Poznámka</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordinace.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500">
                  Zatím žádné ordinace.
                </TableCell>
              </TableRow>
            )}
            {ordinace.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell className="text-slate-500">{o.note ?? "—"}</TableCell>
                <TableCell>
                  {o.active ? (
                    <Badge variant="secondary">Aktivní</Badge>
                  ) : (
                    <Badge variant="outline">Neaktivní</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/ordinace/${o.id}`}
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
