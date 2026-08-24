-- Afterflow: return-to-storage tasks, temporary positions, assigned vs verified location, customer-ready vs internal complete.
create extension if not exists "pgcrypto";

alter table storage_positions
  add column if not exists kind text not null default 'PERMANENT'; -- PERMANENT | TEMPORARY

alter table wheel_sets
  add column if not exists assigned_storage_position_id uuid references storage_positions(id) on delete set null,
  add column if not exists readiness_status text not null default 'UNKNOWN'; -- READY_FOR_NEXT_SEASON | ACTION_REQUIRED | ...

alter table tire_cases
  add column if not exists customer_ready boolean not null default false,
  add column if not exists customer_ready_at timestamptz,
  add column if not exists internal_complete boolean not null default false,
  add column if not exists internal_complete_at timestamptz;

create table if not exists return_to_storage_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_set_id uuid not null references wheel_sets(id) on delete cascade,
  from_position_id uuid references storage_positions(id) on delete set null,
  assigned_to_position_id uuid references storage_positions(id) on delete set null,
  verified_to_position_id uuid references storage_positions(id) on delete set null,
  status text not null default 'QUEUED', -- QUEUED | RETURNING | STORED | BLOCKED | CANCELLED
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists return_tasks_open_idx
  on return_to_storage_tasks (organization_id, status, updated_at desc);

