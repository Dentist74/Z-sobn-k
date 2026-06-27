import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
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
import { GenerateOrdersButton } from "@/components/generate-orders-button";
import { formatCZK, formatDate, toNumber } from "@/lib/format";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/enums";

export const metadata = { title: "Objednávky – Zásobník" };

const statusVariant: Record<OrderStatus, "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SENT: "secondary",
  CONFIRMED: "secondary",
  RECEIVED: "secondary",
  CANCELLED: "destructive",
};

export default async function OrdersPage() {
  await requireRole("MANAGER");
  const orders = await db.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { name: true } },
      items: { select: { quantity: true, unitPrice: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Objednávky</h1>
          <p className="mt-1 text-slate-500">
            Návrhy se nikdy neodesílají automaticky — vždy je potvrzuje člověk.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/objednavky/nova" className={buttonVariants()}>
            <Plus className="size-4" /> Nová objednávka
          </Link>
          <GenerateOrdersButton />
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vytvořeno</TableHead>
              <TableHead>Dodavatel</TableHead>
              <TableHead className="text-right">Položek</TableHead>
              <TableHead className="text-right">Hodnota bez DPH</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  Žádné objednávky. Vygeneruj návrhy z docházejících položek.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => {
              const total = o.items.reduce(
                (s, it) => s + toNumber(it.quantity) * toNumber(it.unitPrice),
                0,
              );
              return (
                <TableRow key={o.id}>
                  <TableCell className="text-slate-500">
                    {formatDate(o.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{o.supplier.name}</TableCell>
                  <TableCell className="text-right">{o.items.length}</TableCell>
                  <TableCell className="text-right">{formatCZK(total)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[o.status as OrderStatus]}>
                      {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/objednavky/${o.id}`}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      aria-label="Otevřít"
                    >
                      <ChevronRight className="size-4" />
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
