import "server-only";
import { Readable } from "node:stream";
import readXlsxFile from "read-excel-file/node";

// Jeden řádek hladin: aspoň jedno z (sku=M-kód, name=Název) + min/opt.
export type LevelRecord = { sku: string | null; name: string | null; min: number; opt: number };

const s = (v: unknown) => (v == null ? "" : String(v).trim());
const n = (v: unknown) => {
  const x = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

type Rows = (string | number | boolean | null)[][];

// Minimalistický CSV parser (podporuje uvozovky a oddělovač ; nebo ,).
function parseCsv(text: string): Rows {
  const src = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // oddělovač určíme z prvního řádku (víc ; než , → středník)
  const firstLine = src.slice(0, src.indexOf("\n") >= 0 ? src.indexOf("\n") : src.length);
  const delim = (firstLine.split(";").length > firstLine.split(",").length) ? ";" : ",";
  const rows: Rows = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQ = false;
      } else cell += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === delim) {
      row.push(cell); cell = "";
    } else if (c === "\n") {
      row.push(cell); rows.push(row); row = []; cell = "";
    } else {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

// Z tabulky (xlsx i csv) vytáhne hladiny podle hlaviček sloupců (robustně).
function extractRecords(rows: Rows): LevelRecord[] {
  if (!rows || rows.length < 2) return [];
  const H = rows[0].map((x) => s(x).toLowerCase());
  const find = (...w: string[]) => {
    const ww = w.map((x) => x.toLowerCase());
    let i = H.findIndex((h) => ww.includes(h));
    if (i < 0) i = H.findIndex((h) => ww.some((x) => h.includes(x)));
    return i;
  };
  const iSku = find("m-kód", "m-kod", "m_kod", "sku", "kód", "kod");
  const iName = find("název", "nazev", "name", "produkt");
  const iMin = find("minimum", "min");
  const iOpt = find("optimum", "opt");
  if (iSku < 0 && iName < 0) return [];

  const out: LevelRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const sku = iSku >= 0 ? s(row[iSku]) : "";
    const name = iName >= 0 ? s(row[iName]) : "";
    if (!sku && !name) continue;
    out.push({
      sku: sku || null,
      name: name || null,
      min: iMin >= 0 ? n(row[iMin]) : 0,
      opt: iOpt >= 0 ? n(row[iOpt]) : 0,
    });
  }
  return out;
}

// Načte hladiny z .xlsx nebo .csv: sloupce Název a/nebo M-kód + Minimum + Optimum.
export async function parseLevelsFile(buffer: Buffer): Promise<LevelRecord[]> {
  // xlsx je ZIP (začíná "PK"); jinak to bereme jako textové CSV.
  const isXlsx = buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  let rows: Rows;
  if (isXlsx) {
    const res = await readXlsxFile(Readable.from(buffer) as never);
    rows =
      Array.isArray(res) && res[0] && typeof res[0] === "object" && "data" in (res[0] as object)
        ? ((res[0] as { data: Rows }).data)
        : (res as unknown as Rows);
  } else {
    rows = parseCsv(buffer.toString("utf8"));
  }
  return extractRecords(rows);
}
