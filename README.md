# Sklad kliniky – skladový systém (WMS)

Skladová aplikace pro zubní kliniku se 6 ordinacemi. Nahrazuje Evidentist.
Naskladnění / výdej (FEFO) / inventura, šarže + expirace, více skladů,
minimální zásoby a upozornění.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (komponenty na bázi Base UI)
- **Prisma 7** + **SQLite** (vývoj) / PostgreSQL (produkce – plán)
- Vlastní auth (e-mail + heslo, bcrypt, session v DB + httpOnly cookie)

## Rychlý start

Vyžaduje Node.js 20+ (ověřeno na Node 26).

```bash
npm install
npx prisma migrate dev      # vytvoří DB a tabulky
npm run db:seed             # naplní testovací data + účty
npm run dev                 # http://localhost:3000
```

### Testovací účty (ze seedu)

| Role  | E-mail              | Heslo     |
|-------|---------------------|-----------|
| ADMIN | admin@klinika.cz    | admin123  |
| STAFF | sestra@klinika.cz   | staff123  |

> ⚠️ Hesla změň před nasazením do produkce.

## Užitečné příkazy

```bash
npm run dev          # vývojový server
npm run build        # produkční build
npm run db:migrate   # nová migrace (prisma migrate dev)
npm run db:seed      # seed
npm run db:studio    # Prisma Studio (GUI nad DB)
npm run db:reset     # smaže a znovu vytvoří DB + seed
```

## Architektura

```
src/
├─ app/
│  ├─ (app)/              # chráněná část (sdílený layout se sidebarem)
│  │  ├─ dashboard/       # přehled + upozornění (min. zásoba, expirace)
│  │  ├─ produkty/        # skladové karty (CRUD, detail, šarže)
│  │  ├─ sklady/          # sklady (CRUD)
│  │  ├─ naskladneni/     # příjem (RECEIPT)
│  │  ├─ vydej/           # výdej s FEFO náhledem
│  │  └─ inventura/       # inventura (ADJUSTMENT)
│  ├─ login/              # přihlášení
│  └─ actions/            # server actions (auth, products, warehouses, stock, inventory)
├─ components/            # UI komponenty + formuláře
├─ lib/
│  ├─ db.ts               # Prisma client (driver adapter)
│  ├─ dal.ts              # auth / role (requireUser, requireRole)
│  ├─ session.ts          # session management
│  ├─ movements.ts        # FEFO logika, naskladnění/výdej (transakce)
│  ├─ stock.ts            # výpočet zásob, hodnota, expirace
│  ├─ enums.ts            # enum hodnoty + české popisky
│  └─ format.ts           # formátování (CZK, datum, jednotky)
├─ generated/prisma/      # vygenerovaný Prisma client (gitignored)
└─ proxy.ts               # optimistické přesměrování (Next 16 náhrada middleware)
```

### Klíčová business logika

- **FEFO výdej** (`lib/movements.ts`): výdej odebírá ze šarže s nejbližší
  expirací; šarže bez expirace až nakonec. Vše v transakci + audit (`StockMovement`).
- **Audit trail**: `StockMovement` se nikdy nemaže (dohledatelnost ZP).
- **Role**: ADMIN (vše), MANAGER (objednávky, inventura, karty), STAFF
  (naskladnění/výdej, čtení bez cen).

## Poznámky k prostředí (důležité)

- **Prisma 7** odstranila Rust engine → vyžaduje **driver adapter**
  (`@prisma/adapter-better-sqlite3`). Klient se konstruuje s `{ adapter }`.
- **npm 11** na tomto stroji blokuje postinstall skripty (allowlist v
  `package.json` → `allowScripts`). Po instalaci nativních balíčků může být
  potřeba `npm approve-scripts <pkg>`.
- **Next.js 16**: `middleware` se přejmenoval na `proxy.ts`; `cookies()` a
  `params`/`searchParams` jsou **async** (nutno `await`).
- SQLite nepodporuje nativní enumy → ukládají se jako `String`, validace v
  `lib/enums.ts`. Při migraci na PostgreSQL lze povýšit na nativní enum.

## Inspirace Evidentistem (zapracováno)

Po analýze stávajícího Evidentistu doplněno:
- **Více identifikátorů produktu**: M-kód (interní `sku`), kód výrobce (REF),
  DL-kód, a více čárových kódů (EAN) na položku (`ProductBarcode`).
- **Sazba DPH** per produkt, ceny vedené **bez DPH**.
- **Ordinace** jako dimenze spotřeby — výdej se připisuje ordinaci, statistiky
  „Spotřeba materiálu" rozpadené po ordinacích (`/spotreba`).
- **Min. a optimální hladina per sklad** (`ProductWarehouseLevel`) + globální
  výchozí na produktu; upozornění na dashboardu počítají per sklad.
- **Dodavatel a pozice (řada/regál/police) u každé šarže.**
- **Vícepoložkové doklady** — příjemka (`/naskladneni`) i výdejka (`/vydej`)
  jako košík položek se sdílenou poznámkou, dokladem a u příjmu vedlejšími
  náklady rozpočítanými do cen (`StockDocument`).
- **Balení vs. kusy** — produkt má `piecesPerPackage` (např. 50 ks/balení).
  Zásoba se vede vždy v **kusech**; na kartě lze zadat cenu „za kus / za
  balení" a při příjmu i výdeji zadat množství „kusy / balení" — systém
  přepočítá na kusy a cenu za kus. (Artikain: kupuje se po balení 50 ks,
  vydává po kusech.)

## Fáze 2 (částečně hotovo)

- ✅ **Dodavatelé** (CRUD vč. kontaktů) — `/dodavatele`
- ✅ **Objednávky** — automatické **návrhy (DRAFT)** z docházejících položek
  seskupené dle dodavatele, úprava množství, **odeslání jen po potvrzení
  člověkem** (mailto / e-shop odkaz, nikdy se neodesílá automaticky) — `/objednavky`
- ✅ Rychlá úprava zásoby v seznamu (+/−), sloupce Min./Opt.

- ✅ **Čárové kódy** — generování (`bwip-js`, Code128 z M-kódu nebo EAN), náhled
  na kartě, **tisk štítků** (`/stitek/[id]`) s volbou velikosti (mm) a počtu kusů
  přes systémový tiskový dialog → libovolná štítková tiskárna. Čtení = čtečka
  jako klávesnice (vyhledávací pole + Enter).
- ✅ **Export do CSV** (Excel, UTF-8 BOM, `;`) — produkty i spotřeba
- ✅ **Přeskladnění** mezi sklady (`/preskladneni`) — TRANSFER, FEFO ze zdroje,
  zachování šarže/expirace v cíli
- ✅ **Evidence zařízení** (`/zarizeni`) — přístroje, revize
- ✅ **Upozornění na expiraci e-mailem** — cron endpoint
  `/api/cron/expiry-check` (viz níže)

## AI sken dodacího listu (Claude vision)

Na stránce **Naskladnění** lze vyfotit/nahrát dodací list — Claude z něj přečte
položky a ceny, napáruje je na skladové karty a **zvýrazní změnu nákupní ceny**
proti uložené (přepočet na cenu za kus bez DPH). Napárované položky jdou jedním
klikem přidat do příjemky. Nic se nemění automaticky — je to návrh ke kontrole.

Vyžaduje API klíč (placené volání; ~0,1–1 Kč za stránku dle modelu). Bez klíče
appka funguje, sken jen ohlásí, že není nakonfigurován.

```bash
ANTHROPIC_API_KEY="sk-ant-..."   # z console.anthropic.com → Settings → API keys
AI_MODEL="claude-opus-4-8"        # volitelné: claude-sonnet-4-6 (levnější) | claude-haiku-4-5
```

Implementace: `src/lib/ai-extract.ts` (vision + structured output přes
`@anthropic-ai/sdk`), `src/app/actions/ai.ts` (párování + porovnání cen).

## Upozornění e-mailem (cron)

Endpoint `GET /api/cron/expiry-check?token=$CRON_SECRET&send=1` spočítá souhrn
(docházející + expirace) a při nastaveném SMTP ho pošle na `NOTIFY_EMAIL`.
Env proměnné:

```bash
CRON_SECRET="…"                  # bez něj je endpoint vypnutý
SMTP_URL="smtp://user:pass@host:587"   # nebo SMTP_HOST/PORT/USER/PASS/SMTP_SECURE
MAIL_FROM="Sklad kliniky <sklad@klinika.cz>"
NOTIFY_EMAIL="prijemce@klinika.cz"
```

Naplánuj např. denně přes cron / systemd timer:
`0 7 * * * curl -s "https://app/api/cron/expiry-check?token=…&send=1"`

## Další fáze (dle specifikace)

- **Zbývá**: přílohy souborů k dokladům (sken dodacího listu — potřebuje
  úložiště), nativní tisk štítků přes Zebra/Dymo SDK (one-click), jemnější
  práva, Docker + zálohy pro produkci.
- **Fáze 3**: převody mezi sklady, skladové pozice, e-mailová upozornění na
  expiraci, nativní tisk štítků (Zebra/Dymo), jemnější práva.
