-- Cron reminders: season reminders, law-deadline warnings, swap-not-done alerts

create table if not exists reminder_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null, -- season|law|all
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb
);

create table if not exists reminder_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  channel text not null, -- sms|email|letter
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'PENDING', -- PENDING|SENT|FAILED|CANCELLED
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text
);

create index if not exists reminder_outbox_org_status_idx
  on reminder_outbox (organization_id, status, created_at desc);

create table if not exists reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  reminder_key text not null, -- idempotency key e.g. season:winter:2026
  outbox_id uuid references reminder_outbox(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, vehicle_id, reminder_key)
);

create index if not exists reminder_deliveries_org_idx
  on reminder_deliveries (organization_id, created_at desc);

