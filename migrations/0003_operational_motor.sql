-- Operational motor: canonical services, DMS event idempotency, and Tire Lifecycle Cases.
create extension if not exists "pgcrypto";

create table if not exists dms_systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null, -- e.g. "DMS_A"
  name text not null,
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table if not exists dms_code_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  dms_system_key text not null,
  dms_code text not null,
  description text,
  canonical_operation text not null,
  mapping_version int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, dms_system_key, dms_code, mapping_version)
);

create index if not exists dms_code_mappings_active_idx
  on dms_code_mappings (organization_id, dms_system_key, dms_code)
  where active = true;

create table if not exists dms_external_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_system_key text not null,
  external_event_id text not null,
  external_order_id text,
  external_booking_id text,
  external_line_id text,
  occurred_at timestamptz not null,
  payload jsonb,
  processing_status text not null default 'RECEIVED', -- RECEIVED | PROCESSED | IGNORED | ERROR
  error_message text,
  created_at timestamptz not null default now(),
  unique (organization_id, source_system_key, external_event_id)
);

create table if not exists tire_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  intent text not null default 'MIXED',
  case_status text not null default 'OPEN',
  work_status text not null default 'READY',
  wheel_status text not null default 'UNKNOWN',
  commercial_status text not null default 'NOT_REQUIRED',
  documentation_status text not null default 'NOT_REQUIRED',
  source_state jsonb not null default '{}'::jsonb,
  target_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tire_cases_org_status_idx on tire_cases (organization_id, case_status, updated_at desc);

create table if not exists tire_case_wheel_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tire_case_id uuid not null references tire_cases(id) on delete cascade,
  wheel_set_id uuid not null references wheel_sets(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (tire_case_id, wheel_set_id)
);

create table if not exists tire_case_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tire_case_id uuid not null references tire_cases(id) on delete cascade,
  canonical_operation text not null,
  source_system_key text,
  external_order_id text,
  external_line_id text,
  created_at timestamptz not null default now()
);

create table if not exists tire_case_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tire_case_id uuid not null references tire_cases(id) on delete cascade,
  step_kind text not null,
  title text not null,
  status text not null default 'TODO', -- TODO | DOING | DONE | BLOCKED
  required boolean not null default true,
  requires jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tire_case_steps_case_idx on tire_case_steps (organization_id, tire_case_id, sort_order);

create table if not exists tire_case_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tire_case_id uuid not null references tire_cases(id) on delete cascade,
  event_type text not null, -- TIRE_CASE_CREATED, DMS_ORDER_RECEIVED, SERVICE_CODE_MAPPED, ...
  data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tire_case_external_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tire_case_id uuid not null references tire_cases(id) on delete cascade,
  source_system_key text not null,
  external_order_id text,
  external_booking_id text,
  created_at timestamptz not null default now(),
  unique (organization_id, source_system_key, external_order_id)
);

