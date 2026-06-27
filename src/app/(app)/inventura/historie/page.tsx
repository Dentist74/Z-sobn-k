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
import { formatDateTime } from "@/lib/format";
import {
  InventoryProtocolButton,
  type ProtocolRow,
} from "@/components/inventory-protocol-button";

export const metadata = { title: "Historie inventur – Zásobník" };

export default async function InventoryHistoryPage() {
  await requireRole("MANAGER");
  const sessions = await db.inventorySession.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Historie inventur</h1>
        <p className="mt-1 text-slate-500">
          Záznamy provedených inventur — protokol lze vytisknout kdykoliv zpětně.
        </p>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Provedl/a</TableHead>
              <TableHead className="text-right">Položek</TableHead>
              <TableHead className="text-right">Rozdílů</TableHead>
              <TableHead className="text-right">Protokol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  Zatím žádná uložená inventura.
                </TableCell>
              </TableRow>
            )}
            {sessions.map((s) => {
              let rows: ProtocolRow[] = [];
              try {
                rows = JSON.parse(s.reportJson);
              } catch {}
              return (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap text-slate-500">
                    {formatDateTime(s.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{s.user.name}</TableCell>
                  <TableCell className="text-right">{s.itemCount}</TableCell>
                  <TableCell className="text-right">
                    {s.adjustedCount > 0 ? (
                      <Badge variant="secondary">{s.adjustedCount}</Badge>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <InventoryProtocolButton
                      rows={rows}
                      userName={s.user.name}
                      dateLabel={formatDateTime(s.createdAt)}
                    />
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
