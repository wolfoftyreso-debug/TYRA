-- Audit/Event layer + exception-first support for operational motor.
create extension if not exists "pgcrypto";

alter table tire_cases
  add column if not exists blocked_reason text,
  add column if not exists blocked_details jsonb,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by_user_id uuid references users(id) on delete set null;

alter table tire_case_events
  add column if not exists actor_user_id uuid references users(id) on delete set null,
  add column if not exists source text not null default 'SYSTEM', -- SYSTEM | TECHNICIAN | DMS | ADVISOR | ...
  add column if not exists previous_value jsonb,
  add column if not exists new_value jsonb,
  add column if not exists dms_external_event_id uuid references dms_external_events(id) on delete set null;

create index if not exists tire_case_events_case_idx
  on tire_case_events (organization_id, tire_case_id, created_at desc);

create table if not exists tire_case_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tire_case_id uuid not null references tire_cases(id) on delete cascade,
  exception_type text not null, -- WHEEL_SET_NOT_FOUND, WRONG_WHEEL_SET_SCANNED, MISSING_WHEEL, ...
  details jsonb not null default '{}'::jsonb,
  status text not null default 'OPEN', -- OPEN | RESOLVED | DISMISSED
  opened_by_user_id uuid references users(id) on delete set null,
  opened_at timestamptz not null default now(),
  resolved_by_user_id uuid references users(id) on delete set null,
  resolved_at timestamptz
);

create index if not exists tire_case_exceptions_open_idx
  on tire_case_exceptions (organization_id, tire_case_id)
  where status = 'OPEN';

