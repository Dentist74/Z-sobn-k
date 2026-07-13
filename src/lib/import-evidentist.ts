import "server-only";
import { Readable } from "node:stream";
import readXlsxFile from "read-excel-file/node";
import { parseCsv } from "./csv";

export type ImportRecord = {
  name: string;
  manufacturerCode: string | null;
  distributorCode: string | null; // DL-kód (kód distributora)
  sku: string; // M-kód (interní) — může být prázdný (položky bez M-kódu)
  barcodes: string[];
  stockQty: number; // Aktuálně skladem (ks)
  priceExclVat: number;
  vatRate: number;
  supplierName: string | null;
  packaged: boolean;
  piecesPerPackage: number;
};

function s(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}
function n(v: unknown): number {
  if (v == null || v === "") return 0;
  const x = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

// "Nespecifikováno" apod. = bez dodavatele.
function cleanSupplier(v: unknown): string | null {
  const c = s(v);
  if (!c) return null;
  const low = c.toLowerCase();
  if (low === "nespecifikováno" || low === "nespecifikovano" || low === "-") return null;
  return c;
}

// Vyčistí kód: zahodí prázdné, URL a zjevné nesmysly; ponechá scanner/GS1 kódy.
function cleanCode(v: unknown): string | null {
  const c = s(v);
  if (c.length < 3) return null;
  if (/^https?:/i.test(c)) return null;
  return c;
}

type Rows = (string | number | boolean | null)[][];

// Najde index sloupce podle názvu hlavičky (přesně, jinak částečně).
function colFinder(header: Rows[number]) {
  const norm = (x: unknown) => s(x).toLowerCase();
  const heads = header.map(norm);
  return (label: string, ...alts: string[]): number => {
    const wanted = [label, ...alts].map((x) => x.toLowerCase());
    let i = heads.findIndex((h) => wanted.includes(h));
    if (i === -1) i = heads.findIndex((h) => wanted.some((w) => h.includes(w)));
    return i;
  };
}

export async function parseEvidentistFile(buffer: Buffer): Promise<ImportRecord[]> {
  // xlsx je ZIP (začíná "PK"); jinak to bereme jako textové CSV.
  const isXlsx = buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  let rows: Rows;
  if (isXlsx) {
    const res = await readXlsxFile(Readable.from(buffer) as never);
    // read-excel-file může vrátit buď rows[][], nebo [{sheet, data}]
    rows = Array.isArray(res) && res[0] && typeof res[0] === "object" && "data" in (res[0] as object)
      ? ((res[0] as { data: Rows }).data)
      : (res as unknown as Rows);
  } else {
    rows = parseCsv(buffer.toString("utf8"));
  }

  if (!rows || rows.length < 2) return [];

  const header = rows[0];
  const find = colFinder(header);
  const iName = find("Název produktu", "název", "nazev", "name");
  const iRef = find("Kód výrobce (REF)", "kód výrobce", "ref");
  const iDl = find("DL-kód", "dl-kod", "dl_kod", "kód distributora", "distributor");
  const iSku = find("M-kód", "m-kod", "m_kod", "sku");
  const iEans = [
    find("EAN"),
    find("EAN2"),
    find("EAN3"),
    find("EAN4"),
    find("EAN5"),
  ].filter((x) => x >= 0);
  const iStock = find("Aktuálně skladem (ks)", "skladem", "ks skladem");
  const iPrice = find("Výchozí nákupní cena bez DPH", "cena bez dph", "cena");
  const iVat = find("Sazba DPH (%)", "dph");
  const iSupplier = find("Výchozí dodavatel", "dodavatel");
  const iType = find("Typ skladování", "skladování");
  const iPpp = find("Počet ks v balení", "ks v balení", "balení");

  const out: ImportRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = s(row[iName]);
    const sku = iSku >= 0 ? s(row[iSku]) : "";
    if (!name) continue; // řádek musí mít aspoň název (M-kód nemusí)

    const barcodes: string[] = [];
    for (const ix of iEans) {
      const c = cleanCode(row[ix]);
      if (c && !barcodes.includes(c)) barcodes.push(c);
    }

    const ppp = iPpp >= 0 ? Math.max(1, Math.round(n(row[iPpp]))) : 1;
    const typeStr = iType >= 0 ? s(row[iType]).toLowerCase() : "";
    const packaged = ppp > 1 || typeStr.includes("balen");

    out.push({
      name,
      manufacturerCode: iRef >= 0 ? s(row[iRef]) || null : null,
      distributorCode: iDl >= 0 ? s(row[iDl]) || null : null,
      sku,
      barcodes,
      stockQty: iStock >= 0 ? Math.max(0, n(row[iStock])) : 0,
      priceExclVat: iPrice >= 0 ? n(row[iPrice]) : 0,
      vatRate: iVat >= 0 ? n(row[iVat]) || 21 : 21,
      supplierName: iSupplier >= 0 ? cleanSupplier(row[iSupplier]) : null,
      packaged,
      piecesPerPackage: packaged ? ppp : 1,
    });
  }
  return out;
}
