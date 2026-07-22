// Zvolí typ kódu a hodnotu pro produkt: existující EAN, jinak Code128 z M-kódu (SKU).

export type BarcodeSpec = { text: string; bcid: string };

// Kontrolní číslice EAN-13 / EAN-8 (modulo 10).
function eanChecksumOk(d: string): boolean {
  const n = d.length;
  if (n !== 13 && n !== 8) return false;
  let sum = 0;
  // od pravé číslice (mimo kontrolní) střídavě váhy 3 a 1
  for (let i = n - 2; i >= 0; i--) {
    const w = (n - 1 - i) % 2 === 1 ? 3 : 1;
    sum += Number(d[i]) * w;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(d[n - 1]);
}

export function barcodeForProduct(p: {
  sku: string;
  codes?: string[];
  barcode?: string | null;
}): BarcodeSpec {
  const code =
    (p.codes && p.codes.find((c) => c.trim())) || p.barcode || null;
  if (code) {
    const digits = code.replace(/\s/g, "");
    // EAN jen pokud sedí kontrolní číslice, jinak Code128 (vyhneme se chybě generování)
    if (/^\d{13}$/.test(digits) && eanChecksumOk(digits)) {
      return { text: digits, bcid: "ean13" };
    }
    if (/^\d{8}$/.test(digits) && eanChecksumOk(digits)) {
      return { text: digits, bcid: "ean8" };
    }
    return { text: code, bcid: "code128" };
  }
  // bez EAN → vlastní interní kód z SKU
  return { text: p.sku, bcid: "code128" };
}

// Spec pro KONKRÉTNÍ kód (výběr kódu při tisku štítku).
export function specForCode(code: string): BarcodeSpec {
  const digits = code.replace(/\s/g, "");
  if (/^\d{13}$/.test(digits) && eanChecksumOk(digits)) return { text: digits, bcid: "ean13" };
  if (/^\d{8}$/.test(digits) && eanChecksumOk(digits)) return { text: digits, bcid: "ean8" };
  return { text: code, bcid: "code128" };
}

export function barcodeUrl(
  spec: BarcodeSpec,
  opts?: { scale?: number; height?: number; includetext?: boolean },
): string {
  const params = new URLSearchParams({
    text: spec.text,
    bcid: spec.bcid,
    scale: String(opts?.scale ?? 3),
    height: String(opts?.height ?? 12),
    includetext: opts?.includetext === false ? "0" : "1",
  });
  return `/api/barcode?${params.toString()}`;
}
