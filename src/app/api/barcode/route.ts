import bwipjs from "bwip-js/node";
import { getCurrentUser } from "@/lib/dal";

// GET /api/barcode?text=RUK-NIT-M&bcid=code128&scale=3&height=12&includetext=1
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text")?.trim();
  if (!text) return new Response("Missing text", { status: 400 });

  const bcid = searchParams.get("bcid")?.trim() || "code128";
  const scale = Number(searchParams.get("scale")) || 3;
  const height = Number(searchParams.get("height")) || 12;
  const includetext = searchParams.get("includetext") !== "0";

  const base = {
    text,
    scale,
    height,
    includetext,
    textxalign: "center" as const,
    paddingwidth: 2,
    paddingheight: 2,
  };

  try {
    let png: Buffer;
    try {
      png = await bwipjs.toBuffer({ ...base, bcid });
    } catch {
      // fallback: když zvolený typ selže (např. neplatný EAN), zkus Code128
      png = await bwipjs.toBuffer({ ...base, bcid: "code128" });
    }
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return new Response(
      "Chyba generování kódu: " + (e instanceof Error ? e.message : "neznámá"),
      { status: 400 },
    );
  }
}
