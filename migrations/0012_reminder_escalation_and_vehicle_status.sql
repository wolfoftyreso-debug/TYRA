-- Reminder escalation + operational flags (sold vehicle, forgotten wheels)

alter table vehicles
  add column if not exists lifecycle_status text not null default 'ACTIVE', -- ACTIVE|SOLD
  add column if not exists sold_at timestamptz;

alter table customers
  add column if not exists address_line1 text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists country text;

alter table wheel_sets
  add column if not exists disposition_status text not null default 'ACTIVE', -- ACTIVE|FORGOTTEN_LEFT_BEHIND|DISPOSED
  add column if not exists disposition_notes text;

create table if not exists reminder_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete cascade,
  wheel_set_id uuid references wheel_sets(id) on delete cascade,
  thread_key text not null, -- season:winter:2026 | law:winter:2026 | pickup:wheels:<wsid>
  status text not null default 'OPEN', -- OPEN|RESOLVED|STOPPED
  attempt_count int not null default 0,
  last_attempt_at timestamptz,
  escalated_at timestamptz,
  stopped_reason text,
  stopped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, thread_key)
);

create index if not exists reminder_threads_org_idx
  on reminder_threads (organization_id, status, updated_at desc);

