import "server-only";
import { Readable } from "node:stream";
import readXlsxFile from "read-excel-file/node";

export type LevelRecord = { sku: string; min: number; opt: number };

const s = (v: unknown) => (v == null ? "" : String(v).trim());
const n = (v: unknown) => {
  const x = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

type Rows = (string | number | boolean | null)[][];

// Načte xlsx s hladinami: sloupce M-kód + Minimum + Optimum (názvy hlaviček, robustní).
export async function parseLevelsFile(buffer: Buffer): Promise<LevelRecord[]> {
  const res = await readXlsxFile(Readable.from(buffer) as never);
  const rows: Rows =
    Array.isArray(res) && res[0] && typeof res[0] === "object" && "data" in (res[0] as object)
      ? ((res[0] as { data: Rows }).data)
      : (res as unknown as Rows);
  if (!rows || rows.length < 2) return [];

  const H = rows[0].map((x) => s(x).toLowerCase());
  const find = (...w: string[]) => {
    const ww = w.map((x) => x.toLowerCase());
    let i = H.findIndex((h) => ww.includes(h));
    if (i < 0) i = H.findIndex((h) => ww.some((x) => h.includes(x)));
    return i;
  };
  const iSku = find("m-kód", "m-kod", "sku", "kód");
  const iMin = find("minimum", "min");
  const iOpt = find("optimum", "opt");
  if (iSku < 0) return [];

  const out: LevelRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const sku = s(row[iSku]);
    if (!sku) continue;
    out.push({ sku, min: iMin >= 0 ? n(row[iMin]) : 0, opt: iOpt >= 0 ? n(row[iOpt]) : 0 });
  }
  return out;
}
