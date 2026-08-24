## TYRA UX Audit (operativt instrument)

Syfte: göra TYRA mindre “verkstadssystem” och mer **operativt instrument** med minimal visuell friktion, stora handlingar, omedelbar statuskommunikation och konsekvent återkoppling.

Detta dokument är en nulägesaudit av nuvarande repo (UI/routes) + en konkret plan (KEEP/REFINE/REDESIGN/MERGE/REMOVE).

---

### Routes / screens (nuvarande)

#### Ops (mörkt tema)
- `src/app/ops/page.tsx`: Ops home + CommandBar
- `src/app/ops/CommandBar.tsx`: kommandofält + resultatkort (fordon/position/hjulset)
- `src/app/ops/cases/page.tsx`: ärendelista
- `src/app/ops/cases/[id]/page.tsx`: ärendedetalj + steg + events
- `src/app/ops/cases/[id]/WorkControls.tsx`: “Nästa handling” + blockera
- `src/app/ops/pick/page.tsx`: plockkö
- `src/app/ops/quotes/page.tsx`: “offerter”/opportunities
- `src/app/ops/inspections/[id]/page.tsx`: inspektionsvy wrapper
- `src/app/ops/inspections/[id]/ui.tsx`: inspektionsreview (AI→verifiera)

#### Customer Hub (ljust tema)
- `src/app/hub/[token]/page.tsx`: hub-huvudsida (status, däckhälsa, livealternativ, order, “på hotellet”)
- `src/app/hub/[token]/ui.tsx`: orderinteraktion (välj → verifiera reg → beställ)
- `src/app/hub/[token]/relationship.tsx`: påminnelser + bokning

#### Auth
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`

---

### Design-/UI-nuläge (problem som skapar friktion)

- **Ingen gemensam komponentkärna**: “Card/knapp/statusbanner” skapas lokalt i varje fil.
  - Ex: `CommandBar` har en lokal `Card`-komponent som skiljer sig från övriga “cards”.
- **Inkonsekvent knapphierarki**:
  - Primary/secondary/tertiary definieras inte systematiskt (olika bakgrund/ram/typografi per vy).
- **Inkonsekvent feedback**:
  - Vissa actions visar error banner (ops), andra visar liten text under (hub), success states är ofta bara text (“Sparat.”).
- **Statuskommunikation är text-tung**:
  - Steps visar `status` som rå text och visar även `kind` som teknisk metadata (noise).
- **Touchytor och typografi**:
  - Ops UI använder `text-sm` överallt även för kritiskt “nästa handling”, och knappar har relativt små ytor.
- **Progressive disclosure saknas i ops**:
  - Ärendesidan visar event-typer + JSON prev/new direkt (bra för dev, men ger “system-arkitektur” i ytan).
- **Dubbletter i spacing & styling**:
  - Upprepade Tailwind-klasser: `rounded-2xl border border-white/10 bg-white/5 p-4` och varianter för ljus/mörk.

---

### Klassificering: KEEP / REFINE / REDESIGN / MERGE / REMOVE

#### KEEP (rätt riktning, justera presentation)
- **Command-first UX** (`/ops` + `CommandBar`): bra som operativ “snabbnavigering”.
- **Case workflow + steg** (`/ops/cases/[id]`): domänstater finns, bra för “nästa handling”.
- **AI suggests – technician verifies** (`/ops/inspections/[id]`): rätt princip, behöver bättre instrument-känsla.
- **Customer Hub**: tydlig, enkel, redan “konsumentkänsla”.

#### REFINE (standardisera + minska friktion)
- **Ops home**: gör “nästa jobb”-kortet primärt; sekundärt innehåll längre ned.
- **Case detail**: lyft upp “work card” (reg, bil, status, nästa) och göm dev-event/JSON bakom “Visa mer”.
- **WorkControls**: större primary action + tydliga success/error states + ett “ActionSheet”-mönster för blockering.
- **Pick/Quotes queue**: gör list-items mer “task rows” med tydlig next action.
- **Inspection UI**: större mät-input, “Spara” som tydlig primary per position eller “Bekräfta nästa”.

#### REDESIGN (kräver ny layout/mönster)
- **Ops /cases/[id] events**: ska bli en “Timeline” med mänskliga verb + detaljer vid behov.
- **Customer Hub live-options**: behöver “beautiful by default” (kort med mer whitespace + tydligare call-to-action).

#### MERGE
- “Card”/“Row” mönster från `CommandBar` → flytta till gemensam UI-kärna och använd överallt.

#### REMOVE
- Visa inte tekniska fält (`step.kind`, rå `event_type`) på operativa ytor som default.

---

### Standardiseringsplan (bygg först, utöka sen)

#### 1) Tokens + UI-kärna (minsta gemensamma)
- **Typography**: `display`, `title`, `section`, `body`, `meta`
- **Spacing**: 4/8/12/16/24/32/48/64 (via konsekvent komponentpadding/margins)
- **Component library (v1)**:
  - `Button` (primary/secondary/tertiary/destructive + large touch targets)
  - `Card`
  - `StatusBadge` + `StatusBanner` (green/yellow/red/neutral; färg + ikonform + text)
  - `WorkCard` (för teknikerns “var är jag?”)
  - `TaskRow` (list-item i köer)
  - `Confirmation` (stora success states där det behövs)

#### 2) Refaktorera ops-flöden till instrumentläge
- `/ops/cases/[id]`: “work card” överst, en tydlig primary action, success/error states som del av ytan.
- `/ops/CommandBar`: samma Card/Row/Button, konsekvent output.
- `/ops/pick` + `/ops/quotes`: `TaskRow` + statusbadge.
- `/ops/inspections/[id]`: fokus på “nästa mätning”, massconfirm + tydlig spar-feedback.

#### 3) Tyre Supplier Gateway (plattform)
- Introducera **canonical supplier interface** + capabilities + tenant-supplier-account.
- Separera:
  - `TireProductIdentity` (canonical)
  - `SupplierOffer` (supplier-specifikt pris/lager/leverans)
- Implementera caching policy (pris-snapshot med `retrievedAt`/`expiresAt`) och revalidation vid order.

#### 4) Flöde-för-flöde
Efter kärnan: förbättra ett verkligt flöde i taget (Technician next job → pick → staging → swap → inspection → verify → return to storage → hub → order → procurement → management).

