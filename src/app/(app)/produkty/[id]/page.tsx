import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, PackagePlus, PackageMinus, Barcode } from "lucide-react";
import { barcodeForProduct, barcodeUrl } from "@/lib/barcode";
import { QuickProductSettings } from "@/components/quick-product-settings";
import { AdminStockCorrection } from "@/components/admin-stock-correction";
import { requireUser, can } from "@/lib/dal";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCZK,
  formatQty,
  formatDate,
  toNumber,
  daysUntil,
} from "@/lib/format";
import { UNIT_LABELS, type Unit } from "@/lib/enums";
import { EXPIRY_WARN_DAYS } from "@/lib/config";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const showPrices = can(user, "MANAGER");
  const canEdit = can(user, "MANAGER");
  const isAdmin = can(user, "ADMIN");
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      defaultWarehouse: { select: { name: true } },
      defaultSupplier: { select: { name: true } },
      barcodes: { select: { code: true } },
      levels: { include: { warehouse: { select: { name: true } } } },
      batches: {
        orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
        include: {
          warehouse: { select: { name: true } },
          bin: { select: { code: true } },
          supplier: { select: { name: true } },
        },
      },
    },
  });

  if (!product) notFound();

  const codeSpec = barcodeForProduct({
    sku: product.sku,
    codes: product.barcodes.map((b) => b.code),
  });

  const activeBatches = product.batches.filter((b) => toNumber(b.quantity) > 0);
  const totalQty = activeBatches.reduce((s, b) => s + toNumber(b.quantity), 0);
  const value = activeBatches.reduce(
    (s, b) =>
      s +
      toNumber(b.quantity) *
        (b.pricePurchase != null
          ? toNumber(b.pricePurchase)
          : toNumber(product.pricePurchase)),
    0,
  );
  const belowMin = totalQty < toNumber(product.minQuantity);
  const unitLabel = UNIT_LABELS[product.unit as Unit] ?? product.unit;

  // Porovnání cen od dodavatelů (z historie šarží).
  const bySupplier = new Map<string, { price: number; at: Date }[]>();
  for (const b of product.batches) {
    if (b.pricePurchase == null || !b.supplier) continue;
    const arr = bySupplier.get(b.supplier.name) ?? [];
    arr.push({ price: toNumber(b.pricePurchase), at: b.receivedAt });
    bySupplier.set(b.supplier.name, arr);
  }
  const supplierRows = [...bySupplier.entries()]
    .map(([name, prices]) => {
      const sorted = [...prices].sort((a, b) => b.at.getTime() - a.at.getTime());
      return {
        name,
        lastPrice: sorted[0].price,
        lastAt: sorted[0].at,
        lowest: Math.min(...prices.map((p) => p.price)),
        count: prices.length,
      };
    })
    .sort((a, b) => a.lowest - b.lowest);
  const cheapestSupplier = supplierRows[0]?.name;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {product.name}
          </h1>
          <p className="mt-1 font-mono text-sm text-slate-500">
            M-kód: {product.sku}
            {product.manufacturerCode
              ? ` · výr.: ${product.manufacturerCode}`
              : ""}
            {product.distributorCode ? ` · DL: ${product.distributorCode}` : ""}
          </p>
          {product.barcodes.length > 0 && (
            <p className="mt-0.5 font-mono text-xs text-slate-400">
              EAN: {product.barcodes.map((b) => b.code).join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/naskladneni?product=${product.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <PackagePlus className="size-4" />
            Naskladnit
          </Link>
          <Link
            href={`/vydej?product=${product.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <PackageMinus className="size-4" />
            Vydat
          </Link>
          <Link
            href={`/stitek/${product.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Barcode className="size-4" />
            Tisk štítku
          </Link>
          {canEdit && (
            <Link
              href={`/produkty/${product.id}/upravit`}
              className={buttonVariants()}
            >
              <Pencil className="size-4" />
              Upravit
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start">
        {/* Náhled čárového kódu */}
        <div className="flex items-center gap-3 rounded-lg border bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={barcodeUrl(codeSpec, { scale: 2, height: 10 })}
            alt={`Čárový kód ${codeSpec.text}`}
            className="h-14"
          />
          <span className="text-xs text-slate-400">
            {codeSpec.bcid.toUpperCase()}
            {codeSpec.text === product.sku ? " · interní kód z M-kódu" : ""}
          </span>
        </div>

        {/* Rychlé nastavení (do místa červeného kruhu) */}
        {canEdit && (
          <QuickProductSettings
            productId={product.id}
            unitLabel={unitLabel}
            defaults={{
              minQuantity: toNumber(product.minQuantity),
              optimalQuantity: toNumber(product.optimalQuantity),
              pricePurchase: toNumber(product.pricePurchase),
              piecesPerPackage: toNumber(product.piecesPerPackage),
              packageLabel: product.packageLabel,
              trackLevels: product.trackLevels,
            }}
          />
        )}

        {isAdmin && (
          <AdminStockCorrection
            productId={product.id}
            currentQty={totalQty}
            unitLabel={unitLabel}
          />
        )}
      </div>

      {/* Souhrn */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Skladem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatQty(totalQty, product.unit)}
            </p>
            {belowMin && (
              <Badge variant="destructive" className="mt-1">
                Pod min. ({formatQty(product.minQuantity, product.unit)})
              </Badge>
            )}
          </CardContent>
        </Card>
        {showPrices && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Hodnota skladem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCZK(value)}</p>
              <p className="mt-1 text-xs text-slate-400">
                Nákupní cena: {formatCZK(product.pricePurchase)}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Dodavatel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {product.defaultSupplier?.name ?? "—"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Sklad: {product.defaultWarehouse?.name ?? "—"}
            </p>
            {product.storageLocation && (
              <p className="mt-0.5 text-xs text-slate-400">
                Umístění: {product.storageLocation}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Vlastnosti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{product.isMedicalDevice ? "🩺 Zdravotnický prostředek" : "Běžná položka"}</p>
            <p className="text-slate-500">
              {product.trackBatches ? "Sledují se šarže" : "Bez sledování šarží"}
            </p>
            {toNumber(product.piecesPerPackage) > 1 && (
              <p className="text-slate-500">
                📦 {product.packageLabel ?? "balení"}: {toNumber(product.piecesPerPackage)}{" "}
                {unitLabel}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ceny od dodavatelů */}
      {showPrices && supplierRows.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Ceny od dodavatelů
          </h2>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dodavatel</TableHead>
                  <TableHead className="text-right">Poslední cena</TableHead>
                  <TableHead className="text-right">Nejnižší cena</TableHead>
                  <TableHead className="text-right">Dodávek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierRows.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">
                      {s.name}
                      {s.name === cheapestSupplier && (
                        <Badge variant="secondary" className="ml-2 text-[11px]">nejlevnější</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCZK(s.lastPrice)}
                      <span className="block text-xs text-slate-400">{formatDate(s.lastAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">{formatCZK(s.lowest)}</TableCell>
                    <TableCell className="text-right text-slate-500">{s.count}×</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Hladiny po skladech */}
      {product.levels.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Hladiny zásob po skladech
          </h2>
          <div className="flex flex-wrap gap-3">
            {product.levels.map((l) => (
              <div key={l.id} className="rounded-md border bg-white px-4 py-2 text-sm">
                <span className="font-medium">{l.warehouse.name}</span>
                <span className="ml-3 text-slate-500">
                  min {formatQty(l.minQuantity, product.unit)} · opt{" "}
                  {formatQty(l.optimalQuantity, product.unit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Šarže */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Šarže na skladě
        </h2>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Šarže (lot)</TableHead>
                <TableHead>Expirace</TableHead>
                <TableHead>Sklad / pozice</TableHead>
                <TableHead>Dodavatel</TableHead>
                <TableHead className="text-right">Množství</TableHead>
                {showPrices && (
                  <TableHead className="text-right">Cena dodávky</TableHead>
                )}
                <TableHead>Naskladněno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeBatches.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={showPrices ? 7 : 6}
                    className="text-center text-slate-500"
                  >
                    Žádné šarže na skladě.
                  </TableCell>
                </TableRow>
              )}
              {activeBatches.map((b) => {
                const d = daysUntil(b.expiryDate);
                const expired = d != null && d < 0;
                const soon = d != null && d >= 0 && d <= EXPIRY_WARN_DAYS;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">
                      {b.lotNumber ?? "—"}
                    </TableCell>
                    <TableCell
                      className={
                        expired
                          ? "font-medium text-red-600"
                          : soon
                            ? "text-amber-600"
                            : ""
                      }
                    >
                      {formatDate(b.expiryDate)}
                      {expired && " (po expiraci)"}
                      {soon && ` (za ${d} dní)`}
                    </TableCell>
                    <TableCell>
                      {b.warehouse.name}
                      {[b.positionRow, b.positionShelf, b.positionRack]
                        .filter(Boolean).length > 0
                        ? ` · ${[b.positionRow, b.positionShelf, b.positionRack].filter(Boolean).join("-")}`
                        : b.bin?.code
                          ? ` · ${b.bin.code}`
                          : ""}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {b.supplier?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQty(b.quantity, product.unit)}
                    </TableCell>
                    {showPrices && (
                      <TableCell className="text-right">
                        {b.pricePurchase != null
                          ? formatCZK(b.pricePurchase)
                          : "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-slate-500">
                      {formatDate(b.receivedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Jednotka: {unitLabel}. Výdej probíhá metodou FEFO (nejbližší expirace
          první).
        </p>
      </div>
    </div>
  );
}
