# Nasazení online přes Railway (doporučeno)

Spravovaná platforma, automatické HTTPS, nasazení z GitHubu. **SQLite zůstává** (na trvalém
disku), takže žádná migrace databáze a lokální testování zůstává stejné.

## 1. Kód na GitHub
Založ (soukromý) repozitář na github.com a nahraj projekt:
```bash
cd /Users/jantr/Storage/sklad
git init && git add -A && git commit -m "Zásobník"
git branch -M main
git remote add origin https://github.com/TVUJ-UCET/zasobnik.git
git push -u origin main
```
> `.env`, `dev.db`, `data/`, `backups/` se nenahrávají (jsou v .gitignore) — to je správně,
> produkční databáze vznikne čistá na serveru (otevře se registrace majitele).

## 2. Railway projekt
1. Účet na **railway.app** → **New Project → Deploy from GitHub repo** → vyber repozitář.
2. Railway appku sám sestaví (Next.js). Po prvním buildu ji ještě dolaď (kroky 3–5).

## 3. Trvalý disk (aby SQLite + faktury přežily restart)
- V projektu → **Variables/Volumes → Add Volume**, mount path: **`/app/data`**.

## 4. Proměnné prostředí (Variables)
```
DATABASE_URL = file:./data/prod.db
APP_URL      = https://<tvoje-railway-adresa>      # doplň po vygenerování domény
ANTHROPIC_API_KEY = sk-...        # volitelné (AI sken)
AI_MODEL     = claude-opus-4-8
CRON_SECRET  = nahodny-tajny-retezec
# SMTP_URL / MAIL_FROM — volitelně, až budeš chtít e-maily
```

## 5. Start command + doména
- **Settings → Deploy → Custom Start Command:** `npm run start:prod`
  (spustí `prisma db push` = vytvoří/aktualizuje schéma na disku, pak server).
- **Settings → Networking → Generate Domain** → dostaneš `https://…railway.app`.
  Tu adresu vlož do `APP_URL` a re-deploy. (Vlastní doménu lze přidat později.)

## 6. První spuštění
1. Otevři adresu → **Vytvoř účet majitele** (jméno, e-mail, heslo, PIN).
2. Nastavení → Uživatelé → pozvi tým (odkaz pro vedoucí / běžnou sestru).
3. Import produktů, doplnění hladin.

## Zálohy
Railway disk je perzistentní, ale stejně si dělej zálohy:
- ručně/cronem `npm run backup` (uloží do `data/backups` — uprav SKLAD_BACKUP_DIR),
- nebo občas stáhni `prod.db` přes Railway CLI a ulož mimo.

## Aktualizace
`git push` → Railway automaticky znovu nasadí. Schéma se srovná samo (`prisma db push` ve startu).
