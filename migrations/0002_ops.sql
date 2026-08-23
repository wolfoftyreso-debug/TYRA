-- Core ops schema: tenant + identity + wheel storage.
-- Designed to be extended slice-by-slice.

create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null default 'private', -- private | company | fleet
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  registration_number text not null,
  vin text,
  make text,
  model text,
  model_year int,
  created_at timestamptz not null default now(),
  unique (organization_id, registration_number)
);

create table if not exists wheel_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  season text not null, -- winter | summer | all-season
  wheel_count int not null default 4,
  status text not null default 'REGISTERED',
  storage_status text not null default 'UNKNOWN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wheel_sets_org_vehicle_idx on wheel_sets (organization_id, vehicle_id);

create table if not exists wheel_set_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_set_id uuid not null references wheel_sets(id) on delete cascade,
  public_code text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, public_code),
  unique (wheel_set_id)
);

create table if not exists wheels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_set_id uuid not null references wheel_sets(id) on delete cascade,
  position text, -- LF | RF | LR | RR | unknown
  created_at timestamptz not null default now()
);

create table if not exists tyres (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_id uuid not null references wheels(id) on delete cascade,
  manufacturer text,
  model text,
  width int,
  profile int,
  diameter int,
  load_index int,
  speed_rating text,
  dot_week int,
  dot_year int,
  season text,
  studded boolean,
  run_flat boolean,
  xl boolean,
  created_at timestamptz not null default now()
);

create table if not exists rims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_id uuid not null references wheels(id) on delete cascade,
  manufacturer text,
  model text,
  oem boolean,
  diameter numeric,
  width numeric,
  et numeric,
  bolt_pattern text,
  center_bore numeric,
  material text,
  finish text,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_id uuid not null references wheels(id) on delete cascade,
  inspected_at timestamptz not null default now(),
  replacement_recommended boolean not null default false,
  notes text,
  created_by_user_id uuid references users(id) on delete set null
);

create table if not exists tread_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_id uuid not null references wheels(id) on delete cascade,
  measured_at timestamptz not null default now(),
  depth_mm numeric(3,1) not null,
  source text not null default 'MEASURED', -- MEASURED | IMPORTED | ESTIMATED
  created_by_user_id uuid references users(id) on delete set null
);

create table if not exists damage_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_id uuid not null references wheels(id) on delete cascade,
  found_at timestamptz not null default now(),
  description text not null,
  confidence numeric,
  source text not null default 'HUMAN',
  human_confirmed boolean not null default true,
  photo_url text
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists storage_zones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists storage_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  zone_id uuid not null references storage_zones(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists storage_stays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_set_id uuid not null references wheel_sets(id) on delete cascade,
  position_id uuid not null references storage_positions(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists storage_stays_open_idx on storage_stays (organization_id, wheel_set_id) where ended_at is null;

create table if not exists storage_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_set_id uuid not null references wheel_sets(id) on delete cascade,
  from_position_id uuid references storage_positions(id) on delete set null,
  to_position_id uuid references storage_positions(id) on delete set null,
  moved_at timestamptz not null default now(),
  moved_by_user_id uuid references users(id) on delete set null
);

create table if not exists pick_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_set_id uuid not null references wheel_sets(id) on delete cascade,
  scheduled_at timestamptz,
  status text not null default 'QUEUED',
  created_at timestamptz not null default now()
);

create table if not exists sensors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  site_id uuid references sites(id) on delete set null,
  zone_id uuid references storage_zones(id) on delete set null,
  type text not null,
  external_id text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sensor_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sensor_id uuid not null references sensors(id) on delete cascade,
  measured_at timestamptz not null,
  temperature_c numeric,
  humidity_percent numeric
);

create table if not exists portal_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  token_hash text not null,
  kind text not null, -- portal | offer
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (token_hash)
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  data jsonb,
  created_at timestamptz not null default now()
);

-- Minimal quote/opportunity placeholders so seed can create "Erik i offertkön".
create table if not exists replacement_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_set_id uuid not null references wheel_sets(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

