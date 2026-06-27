import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;

  const doc = await db.stockDocument.findUnique({
    where: { id },
    select: { attachmentPath: true, attachmentName: true },
  });
  if (!doc?.attachmentPath) {
    return new Response("Doklad nemá přílohu.", { status: 404 });
  }

  try {
    const buf = await readFile(join(process.cwd(), doc.attachmentPath));
    const ext = doc.attachmentPath.split(".").pop()?.toLowerCase();
    const type =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${doc.attachmentName ?? "doklad"}"`,
      },
    });
  } catch {
    return new Response("Soubor nenalezen.", { status: 404 });
  }
}
