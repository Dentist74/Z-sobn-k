"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProtocolRow = {
  productName: string;
  lotNumber: string | null;
  systemQty: number;
  countedQty: number;
  diff: number;
};

export function InventoryProtocolButton({
  rows,
  userName,
  dateLabel,
}: {
  rows: ProtocolRow[];
  userName: string;
  dateLabel: string;
}) {
  function print() {
    const body = rows
      .map((r) => {
        const color = r.diff === 0 ? "#64748b" : r.diff > 0 ? "#16a34a" : "#dc2626";
        return `<tr>
          <td>${r.productName}</td>
          <td>${r.lotNumber ?? "—"}</td>
          <td style="text-align:right">${r.systemQty}</td>
          <td style="text-align:right">${r.countedQty}</td>
          <td style="text-align:right;color:${color}">${r.diff > 0 ? "+" : ""}${r.diff}</td>
        </tr>`;
      })
      .join("");
    const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8">
      <title>Protokol o inventuře</title>
      <style>
        body{font-family:system-ui,Arial,sans-serif;color:#0f172a;padding:24px;font-size:12px}
        h1{font-size:18px;margin:0 0 4px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left}
        th{background:#f1f5f9}
        .sig{margin-top:40px;display:flex;justify-content:space-between}
      </style></head><body>
      <h1>Protokol o inventuře</h1>
      <div>Svět úsměvů – Zásobník &middot; Datum: ${dateLabel} &middot; Provedl/a: ${userName}</div>
      <table><thead><tr>
        <th>Položka</th><th>Šarže</th>
        <th style="text-align:right">Systém</th><th style="text-align:right">Napočítáno</th><th style="text-align:right">Rozdíl</th>
      </tr></thead><tbody>${body}</tbody></table>
      <div class="sig"><div>Podpis odpovědné osoby: ______________________</div><div>Razítko:</div></div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Button variant="outline" size="sm" onClick={print}>
      <Printer className="size-4" /> Protokol
    </Button>
  );
}
