# TYRA

## Lokalt

Förutsätter Postgres och `DATABASE_URL`.

Skapa `.env`:

```bash
DATABASE_URL="postgres://..."
AUTH_SECRET="en-lång-slump-sträng"
```

Kör:

```bash
npm install
npm run migrate
npm run dev
```

Öppna `http://localhost:3000` → skapa konto → du hamnar i `Werkstad Tyresö` med seedad demo-data.
