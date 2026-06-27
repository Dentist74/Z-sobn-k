import Link from "next/link";
import { FileText, Paperclip } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatCZK, toNumber } from "@/lib/format";

export const metadata = { title: "Doklady – Zásobník" };

export default async function DocumentsPage() {
  await requireRole("MANAGER");

  const docs = await db.stockDocument.findMany({
    where: { type: "RECEIPT" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      supplier: { select: { name: true } },
      warehouse: { select: { name: true } },
      user: { select: { name: true } },
      movements: { select: { quantity: true, batch: { select: { pricePurchase: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Doklady (příjemky)</h1>
        <p className="mt-1 text-slate-500">
          Archiv příjemek včetně naskenovaných faktur.
        </p>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Doklad</TableHead>
              <TableHead>Sklad</TableHead>
              <TableHead>Kdo</TableHead>
              <TableHead className="text-right">Hodnota</TableHead>
              <TableHead>Faktura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  Zatím žádné příjemky.
                </TableCell>
              </TableRow>
            )}
            {docs.map((doc) => {
              const value = doc.movements.reduce(
                (s, m) => s + toNumber(m.quantity) * toNumber(m.batch?.pricePurchase),
                0,
              );
              return (
                <TableRow key={doc.id}>
                  <TableCell className="whitespace-nowrap text-slate-500">
                    {formatDateTime(doc.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {doc.reference || <span className="text-slate-400">—</span>}
                    {doc.note && <span className="block text-xs text-slate-400">{doc.note}</span>}
                  </TableCell>
                  <TableCell className="text-slate-500">{doc.warehouse?.name ?? "—"}</TableCell>
                  <TableCell className="text-slate-500">{doc.user.name}</TableCell>
                  <TableCell className="text-right">{formatCZK(value)}</TableCell>
                  <TableCell>
                    {doc.attachmentPath ? (
                      <a href={`/api/doklad/${doc.id}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                        <Paperclip className="size-3.5" /> zobrazit
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <FileText className="size-3.5" /> bez přílohy
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Badge variant="secondary">Pohyby zboží se nikdy nemažou (dohledatelnost)</Badge>
    </div>
  );
}
