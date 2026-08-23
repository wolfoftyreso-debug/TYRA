# TYRA Däckhotell

En spelbar, svensk vertikal grund för Däckhotellet och dess deterministiska
offertmotor. Projektet är byggt för Next.js App Router och Vercel och kan senare
flyttas in i Pixdrift utan att domänlogiken behöver skrivas om.

## Starta lokalt

```bash
npm install
npm run dev
```

Appen startar i demoläge utan databas. Testlänkar:

- Personal: `/`
- Fordon: `/vehicles/ABC123`
- Plock: `/pick`
- Offertbyggare: `/quotes/builder`
- Kundportal: `/portal/demo-anna-portal`
- Kundoffert: `/offer/demo-xc60-offert`

## Databas och autentisering

För beständig drift används Postgres (Neon fungerar bra på Vercel) och Better
Auth. Kopiera `.env.example` till `.env.local`, fyll i nycklarna och kör:

```bash
npm run db:migrate
npm run db:seed
```

`BETTER_AUTH_SECRET` ska vara ett långt slumpmässigt värde. Första inloggade
användaren utan medlemskap får organisationen **Werkstad Tyresö** och grunddata.
Alla operativa tabeller har `organization_id`. Serverkod härleder organisation
från session → membership; klienten skickar aldrig organisationens id.

## Arkitektur

- `src/lib/domain/` — ramverksfri statusmaskin och offertmotor.
- `src/lib/server/` — auth, databas, org-scope och token-hashning.
- `migrations/0002_ops.sql` — fysisk hjul- och lagerdomän.
- `migrations/0003_quote_engine.sql` — katalog, prispolicy och offerter.
- `src/app/portal/[token]` och `src/app/offer/[token]` — ljusa kundytor.
- Övriga routes — mörka personalflöden.

Offertmotorn filtrerar kompatibilitet före ranking. Belopp kommer enbart från
produkt- och servicepriser, lagras i öre och totalsumman räknas från raderna.
Opaque kundtokens lagras som SHA-256-hash i databasen med expiry och revoke.

## Vercel

1. Importera repot i Vercel.
2. Anslut Neon och lägg in variablerna från `.env.example`.
3. Kör migration och seed mot produktionsdatabasen.
4. Deploy-kommandot är `npm run build`; ingen specialkonfiguration krävs.

Node.js runtime används för Postgres och auth. Inga hemligheter exponeras som
`NEXT_PUBLIC_*`.

## Kontroll

```bash
npm test
npm run lint
npm run build
```

## Avgränsning v1

E-post/SMS, EPREL-hämtning, bildanalys och livekoppling till
Fortnox/Visma/AutoMaster är **inte startade**. Roller sparas men enforce:as inte
per funktion ännu. UI-flöden kan granskas i demo; beständiga mutationer kräver
ansluten Postgres och motsvarande server action/route.
