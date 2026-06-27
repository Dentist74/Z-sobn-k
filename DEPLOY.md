# Nasazení online (VPS + HTTPS)

Doporučená cesta pro jednu kliniku: **VPS + ponechání SQLite** (žádná migrace databáze)
+ **Caddy** pro automatické HTTPS. HTTPS odemkne i **skenování telefonem** a instalaci PWA.

## Co potřebuješ
- **VPS** (např. Hetzner CX22 ~5 €/měs, nebo český Forpsi/Wedos) — Ubuntu 22.04+.
- **Doménu** nebo poddoménu (např. `sklad.klinikasvetusmevu.cz`) s **A záznamem** na IP serveru.

## 1. Příprava serveru
```bash
# Node.js 20+, Caddy, pm2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs caddy
sudo npm i -g pm2
```

## 2. Aplikace
```bash
# nahraj projekt na server (git clone / scp), pak:
cd /opt/zasobnik          # nebo kam jsi to dal
npm install
cp .env.example .env      # a vyplň (hlavně APP_URL, ANTHROPIC_API_KEY, CRON_SECRET)

# vytvoř prázdnou databázi (BEZ demo dat → registrace majitele se otevře)
npx prisma db push
npx prisma generate

npm run build
pm2 start npm --name zasobnik -- run start   # naslouchá na 127.0.0.1:3000
pm2 save
pm2 startup                                   # vypíše příkaz pro start po rebootu — spusť ho
```

> **Důležité:** nespouštěj `npm run db:seed` — ten zakládá demo admina. Když DB necháš
> prázdnou, první návštěva `https://tvojedomena/registrace` umožní vytvořit účet majitele.

## 3. HTTPS (Caddy)
Uprav `Caddyfile` (doplň svou doménu) a:
```bash
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl restart caddy
```
Caddy si sám vyžádá certifikát. Hotovo — appka běží na `https://tvojedomena`.

## 4. Zálohy a cron
```bash
crontab -e
# záloha DB každý večer ve 20:00
0 20 * * * cd /opt/zasobnik && /usr/bin/npm run backup >> backups/backup.log 2>&1
# kontrola expirací (denně 7:00) — pošle e-mail, je-li nastavený SMTP
0 7 * * * curl -s "https://tvojedomena/api/cron/expiry-check?token=TVUJ_CRON_SECRET&send=1" >/dev/null
```
Složku `backups/` občas zkopíruj i mimo server (NAS/cloud).

## 5. První spuštění
1. Otevři `https://tvojedomena` → klikni „Vytvoř účet majitele".
2. Založ si admin účet (jméno, e-mail, heslo, PIN).
3. V Nastavení → Uživatelé pozvi tým (odkaz pro vedoucí / běžnou sestru).
4. Naimportuj produkty (Nastavení → Import) a doplň hladiny.

## Aktualizace appky později
```bash
cd /opt/zasobnik && git pull && npm install && npx prisma db push && npm run build && pm2 restart zasobnik
```

---

## Alternativa: Vercel + Postgres (bezúdržbové, ~500 Kč/měs)
Pokud bys chtěl spravované řešení místo VPS, je potřeba přepnout z SQLite na Postgres
(Neon/Supabase) a soubory faktur dát do úložiště (S3/R2). To je o něco větší zásah —
řekni a připravím to.
