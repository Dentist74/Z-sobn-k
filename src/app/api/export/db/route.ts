import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import Database from "better-sqlite3";

// Stažení konzistentní zálohy SQLite databáze přes HTTPS (off-site záloha).
// Chráněno tokenem: /api/export/db?token=CRON_SECRET
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return new Response("Neautorizováno.", { status: 401 });
  }

  const dbPath = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
  const tmp = join(process.cwd(), `backup-${Date.now()}.db`);

  try {
    const src = new Database(dbPath, { readonly: true });
    await src.backup(tmp); // konzistentní snapshot i za běhu
    src.close();
    const buf = await readFile(tmp);
    await unlink(tmp).catch(() => {});
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="zasobnik-${stamp}.db"`,
      },
    });
  } catch (e) {
    return new Response("Záloha selhala: " + (e instanceof Error ? e.message : ""), { status: 500 });
  }
}
