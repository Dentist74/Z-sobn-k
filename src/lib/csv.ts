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
