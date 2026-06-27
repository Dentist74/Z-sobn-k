# Provoz skladu na klinice (lokální nasazení)

Aplikace běží na **jednom stále zapnutém počítači** (klidně levné mini-PC) a tablet
i ostatní počítače se k ní připojí přes klinickou WiFi.

## 1. Jednorázová příprava

```bash
# 1) Node.js 20+ (https://nodejs.org) a stažený projekt
npm install

# 2) .env (ve složce projektu) — vyplň:
#    DATABASE_URL="file:./dev.db"
#    ANTHROPIC_API_KEY="sk-..."         # AI sken faktur (volitelné)
#    CRON_SECRET="nejaky-tajny-retezec" # pro kontrolu expirací
#    SMTP_URL="smtp://user:pass@mail.domena:587"   # odesílání objednávek (volitelné)
#    MAIL_FROM="Sklad <sklad@klinika.cz>"

# 3) databáze
npx prisma migrate deploy   # nebo: npx prisma db push
npm run db:seed             # založí prvního admina (admin@klinika.cz / admin123 — hned změň!)
```

## 2. Ostrý provoz (ne `npm run dev`)

```bash
npm run serve     # build + start, naslouchá na všech adresách (port 3000)
```

Zjisti IP toho počítače:
- macOS: `ipconfig getifaddr en0`
- Linux: `hostname -I`
- Windows: `ipconfig` → IPv4

Z tabletu/ostatních PC pak otevři `http://IP:3000` (např. `http://192.168.1.50:3000`).
Ideálně dej tomu PC **pevnou IP** v routeru, ať se nemění.

## 3. Aby se to spouštělo samo (auto-start)

Nejjednodušší přes **pm2** (funguje na macOS i Linuxu):

```bash
npm install -g pm2
npm run build
pm2 start npm --name sklad -- run start
pm2 save
pm2 startup        # vypíše příkaz, který jednou spustíš (nastaví start po restartu)
```

Aktualizace appky později: `git pull` (nebo nové soubory) → `npm install` →
`npm run build` → `pm2 restart sklad`.

## 4. Zálohy (DŮLEŽITÉ!)

Záloha databáze (bezpečná i za běhu, drží posledních 30):

```bash
npm run backup     # vytvoří backups/sklad-RRRRMMDD-HHMMSS.db
```

Naplánuj automaticky každý večer (cron, macOS/Linux) — `crontab -e`:

```
0 20 * * * cd /cesta/k/projektu && /usr/local/bin/npm run backup >> backups/backup.log 2>&1
```

> **Doporučení:** složku `backups/` občas zkopíruj i mimo ten počítač
> (NAS, externí disk, cloud) — kdyby selhal disk. Obnova: zkopíruj zvolený
> `.db` soubor zpět jako `dev.db` a restartuj (`pm2 restart sklad`).

## 5. Poznámky
- **Foťák faktury** na tabletu funguje i přes `http` (otevírá fotoaparát přes systém).
- **Instalace jako appka (PWA)** na plochu tabletu vyžaduje `https` — na čistém `http`
  jde appka používat normálně přes prohlížeč, jen ji nedáš „na plochu" jako ikonu.
  (Pokud budeš chtít https na LAN, dá se to dořešit — řekni.)
- **Přechod do cloudu** (až přibude pobočka/lab): přepnout SQLite → Postgres a nasadit
  na VPS/Vercel. Migrace je připravená, stačí říct.
