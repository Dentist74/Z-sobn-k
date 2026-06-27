import { requireRole } from "@/lib/dal";
import { getProductsWithStock } from "@/lib/stock";
import { toCsv, csvResponse } from "@/lib/csv";
import { UNIT_LABELS, type Unit } from "@/lib/enums";

export async function GET() {
  await requireRole("MANAGER");
  const products = await getProductsWithStock();

  const header = [
    "Název",
    "M-kód",
    "Kategorie",
    "Jednotka",
    "Skladem",
    "Minimum",
    "Optimum",
    "Nákupní cena bez DPH",
    "DPH %",
    "Hodnota skladem",
    "Dodavatel",
    "Stav",
  ];
  const rows = products.map((p) => [
    p.name,
    p.sku,
    p.category ?? "",
    UNIT_LABELS[p.unit as Unit] ?? p.unit,
    p.totalQty,
    p.minQuantity,
    p.optimalQuantity,
    p.pricePurchase,
    p.vatRate,
    p.value.toFixed(2),
    p.defaultSupplierName ?? "",
    p.expired ? "Expirováno" : p.belowMin ? "Dochází" : p.expiringSoon ? "Brzy expiruje" : "OK",
  ]);

  return csvResponse("produkty.csv", toCsv(header, rows));
}
