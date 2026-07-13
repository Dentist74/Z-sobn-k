// CSV pro české Excel: oddělovač ";", UTF-8 BOM, CRLF.

function cell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(header: string[], rows: (unknown[])[]): string {
  const lines = [header, ...rows].map((r) => r.map(cell).join(";"));
  return "﻿" + lines.join("\r\n");
}

export function csvResponse(filename: string, content: string): Response {
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// Načtení CSV → pole řádků (buňky jako stringy). Podporuje uvozovky a oddělovač ";" nebo ",".
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const nl = src.indexOf("\n");
  const firstLine = src.slice(0, nl >= 0 ? nl : src.length);
  const delim = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows: string[][] = [];
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
