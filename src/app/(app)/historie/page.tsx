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
import { formatDateTime, formatQty } from "@/lib/format";
import { MOVEMENT_TYPES, MOVEMENT_TYPE_LABELS, type MovementType } from "@/lib/enums";

export const metadata = { title: "Historie akcí – Zásobník" };

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs";

const typeColor: Record<string, string> = {
  RECEIPT: "text-green-700",
  ISSUE: "text-blue-700",
  WRITE_OFF: "text-red-700",
  ADJUSTMENT: "text-amber-700",
  TRANSFER: "text-slate-600",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; days?: string; user?: string }>;
}) {
  await requireRole("MANAGER");
  const sp = await searchParams;

  const days = Number(sp.days) || 30;
  const type = sp.type && MOVEMENT_TYPES.includes(sp.type as MovementType) ? sp.type : "";
  const userId = sp.user || "";
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [movements, users] = await Promise.all([
    db.stockMovement.findMany({
      where: {
        createdAt: { gte: since },
        ...(type ? { type } : {}),
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        user: { select: { name: true } },
        ordinace: { select: { name: true } },
        batch: {
          select: {
            warehouse: { select: { name: true } },
            product: { select: { name: true, unit: true } },
          },
        },
      },
    }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Historie akcí</h1>
        <p className="mt-1 text-slate-500">
          Kdo co udělal — naskladnění, výdej, inventura, převody. Viditelné jen pro vedení.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-xs text-slate-500">Typ akce</label>
          <select id="type" name="type" defaultValue={type} className={selectClass}>
            <option value="">Vše</option>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{MOVEMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="user" className="text-xs text-slate-500">Uživatel</label>
          <select id="user" name="user" defaultValue={userId} className={selectClass}>
            <option value="">Všichni</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="days" className="text-xs text-slate-500">Období</label>
          <select id="days" name="days" defaultValue={String(days)} className={selectClass}>
            <option value="7">7 dní</option>
            <option value="30">30 dní</option>
            <option value="90">90 dní</option>
            <option value="365">1 rok</option>
          </select>
        </div>
        <button type="submit" className={selectClass + " cursor-pointer bg-slate-900 px-4 text-white"}>
          Filtrovat
        </button>
      </form>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kdy</TableHead>
              <TableHead>Kdo</TableHead>
              <TableHead>Akce</TableHead>
              <TableHead>Položka</TableHead>
              <TableHead className="text-right">Množství</TableHead>
              <TableHead>Sklad / ordinace</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  Žádné záznamy pro zvolený filtr.
                </TableCell>
              </TableRow>
            )}
            {movements.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap text-slate-500">
                  {formatDateTime(m.createdAt)}
                </TableCell>
                <TableCell className="font-medium">{m.user.name}</TableCell>
                <TableCell>
                  <span className={typeColor[m.type] ?? "text-slate-600"}>
                    {MOVEMENT_TYPE_LABELS[m.type as MovementType] ?? m.type}
                  </span>
                </TableCell>
                <TableCell>{m.batch.product.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.quantity > 0 ? "+" : ""}
                  {formatQty(m.quantity, m.batch.product.unit)}
                </TableCell>
                <TableCell className="text-slate-500">
                  {m.ordinace?.name ?? m.batch.warehouse?.name ?? "—"}
                  {m.reason && <span className="block text-xs text-slate-400">{m.reason}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
