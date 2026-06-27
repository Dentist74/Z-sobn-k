// Záloha databáze (SQLite) s rotací. Spouštěj přes `npm run backup`.
// Bezpečné i za běhu aplikace (používá SQLite backup API).
import Database from "better-sqlite3";
import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const DB_FILE = process.env.SKLAD_DB ?? "dev.db";
const BACKUP_DIR = process.env.SKLAD_BACKUP_DIR ?? "backups";
const KEEP = Number(process.env.SKLAD_BACKUP_KEEP ?? 30); // kolik posledních záloh nechat

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

mkdirSync(BACKUP_DIR, { recursive: true });
const target = join(BACKUP_DIR, `sklad-${stamp()}.db`);

const db = new Database(DB_FILE, { readonly: true });
await db.backup(target);
db.close();
console.log("Záloha vytvořena:", target);

// rotace — nech jen posledních KEEP záloh
const files = readdirSync(BACKUP_DIR)
  .filter((f) => f.startsWith("sklad-") && f.endsWith(".db"))
  .map((f) => ({ f, t: statSync(join(BACKUP_DIR, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);

for (const old of files.slice(KEEP)) {
  unlinkSync(join(BACKUP_DIR, old.f));
  console.log("Smazána stará záloha:", old.f);
}
