import { requireRole } from "@/lib/dal";
import { getConsumption } from "@/lib/stock";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  await requireRole("MANAGER");
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")! + "T23:59:59") : undefined;
  const ordinaceId = searchParams.get("ordinace") || undefined;

  const result = await getConsumption({ from, to, ordinaceId });

  const header = ["Položka", "Množství", "Hodnota bez DPH"];
  const rows = result.byProduct.map((p) => [p.name, p.qty, p.value.toFixed(2)]);
  rows.push(["CELKEM", "", result.totalValue.toFixed(2)]);

  return csvResponse("spotreba.csv", toCsv(header, rows));
}
