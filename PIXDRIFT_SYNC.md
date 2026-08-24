# Pixdrift sync kit (TYRA → Pixdrift)

Målet: flytta in “TYRA” som **white‑label funktionalitet** i Pixdrift, där Pixdrift redan har en **API core**. Den här filen listar vad som kan synkas 1:1, och vilka tydliga integrationspunkter som ska mappas mot Pixdrift core.

## 1) Vad som är “portabelt” (synka 1:1)

- **Domänlogik (framework‑fri)**
  - `src/lib/domain/*`
  - Innehåller: case/workflow, afterflow, CRM-kort, däckhälsa + varningar, prissättning.
- **Migrations + schema**
  - `migrations/*.sql`
  - `scripts/migrate.ts`
  - (Om Pixdrift core har egen migreringsmotor: flytta SQL-filerna och kör i er pipeline.)
- **UI-kernel (instrument-look)**
  - `src/components/ui/*` (+ CSS-variabler i `src/app/globals.css`)
  - Detta är “design-synk”: Buttons/Cards/StatusBadge/StatusBanner/Rows/TaskRow/WorkCard.

## 2) Funktionella ytor (kan flyttas eller re-implementeras mot Pixdrift core)

- **Ops**
  - `src/app/ops/*`
  - Server actions: `src/app/ops/**/serverActions.ts`
  - Case UI: `src/app/ops/cases/*`
  - Inspektion UI: `src/app/ops/inspections/*`
  - Integration health UI: `src/app/ops/integrations/*`
  - Settings: `src/app/ops/settings/*`
- **Customer Tire Hub**
  - `src/app/hub/[token]/*`
  - Server-side view builder: `src/lib/server/hub.ts`
- **Cron / reminders / outbox**
  - Vercel cron endpoint: `src/app/api/cron/reminders/route.ts`
  - Reminder motor: `src/lib/server/cron/reminders.ts`
  - Outbox + escalation i DB (migrations 0011–0012).
- **Supplier gateway**
  - `src/lib/server/suppliers/*`
  - `src/lib/suppliers/*` (typer + interface)

## 3) De viktigaste integrationspunkterna mot Pixdrift “API core”

I den här repo:n är “API core” representerat av moduler under `src/lib/server/*`. I Pixdrift bör ni i praktiken ersätta/adaptera:

- **DB access**
  - Nu: `src/lib/server/db.ts` (`query`, `withTransaction`)
  - I Pixdrift: ersätt med er DB/ORM/transaction primitives.
- **Auth + session**
  - Nu: NextAuth v4 + `src/lib/server/session.ts` (`requireActiveOrg`)
  - I Pixdrift: koppla `requireActiveOrg` mot er auth/session (ex. JWT/BetterAuth/etc).
- **Messaging**
  - Nu: outbox-tabeller + “enqueue” i `src/lib/server/cron/reminders.ts`
  - I Pixdrift: er SMS/email provider tar `reminder_outbox` eller motsvarande jobb-kö.
- **Multi-tenant**
  - Nu: `organization_id` på allt
  - I Pixdrift: mappa direkt mot er tenant-modell.

## 4) White-label default (krav)

- Kundnära innehåll ska använda **organisationens namn** som avsändare.
  - Implementerat i reminders (signatur `/ <org.name>`).
- UI/metadata ska vara neutralt. Tyra är “powered by” (om alls) och kan ligga bakom feature flag.

## 5) Rekommenderad portningsstrategi (minst risk)

1. **Synka domän + migrations** först (ger datamodell + logik).
2. Bygg en **Pixdrift adapter‑layer** som uppfyller samma behov som `src/lib/server/*`:
   - DB + transaktion
   - session/tenant
   - outbox delivery
3. Flytta in UI-kernel, och migrera ops/hub stegvis.

## 6) Checklista vid inflytt i Pixdrift

- [ ] DB schema applicerat (alla `migrations/*.sql`)
- [ ] Tenant isolation bekräftad (alla queries scope: organization/tenant)
- [ ] Auth/session ersatt (`requireActiveOrg`)
- [ ] Cron kopplat (Vercel cron eller Pixdrift scheduler)
- [ ] Outbox leverans kopplad (sms/email/letter)
- [ ] White-label texter: inga “Tyra” i kundytor/utskick

