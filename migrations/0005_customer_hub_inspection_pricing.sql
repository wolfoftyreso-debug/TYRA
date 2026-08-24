-- Customer Tire Hub + inspection model + minimal tire products/pricing snapshots/acceptance.
create extension if not exists "pgcrypto";

create table if not exists customer_hub_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  unique (token_hash),
  unique (organization_id, customer_id)
);

create table if not exists tire_inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  wheel_set_id uuid references wheel_sets(id) on delete set null,
  tire_case_id uuid references tire_cases(id) on delete set null,
  captured_at timestamptz not null default now(),
  captured_by_user_id uuid references users(id) on delete set null,
  source text not null default 'PHYSICAL_INSPECTION',
  created_at timestamptz not null default now()
);

create table if not exists tire_inspection_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  inspection_id uuid not null references tire_inspections(id) on delete cascade,
  position text not null, -- LF | RF | LR | RR
  tread_depth_mm numeric(3,1),
  tread_depth_source text, -- MEASURED | IMPORTED | ESTIMATED | IMAGE_RECOGNITION | DIGITAL_TREAD_SCANNER
  confidence numeric,
  verified boolean not null default false,
  verified_by_user_id uuid references users(id) on delete set null,
  verified_at timestamptz,
  condition_score int, -- 0-100
  condition_state text, -- green|yellow|red + human label via UI
  wear_pattern text,
  damage_types text[],
  tyre_brand text,
  tyre_model text,
  tyre_dimension text,
  dot_week int,
  dot_year int,
  notes text,
  created_at timestamptz not null default now(),
  unique (inspection_id, position)
);

create table if not exists tire_inspection_images (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  inspection_id uuid not null references tire_inspections(id) on delete cascade,
  position text, -- LF/RF/LR/RR or null
  kind text not null, -- front|sidewall|tread|damage
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists tire_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  supplier text,
  supplier_product_id text,
  brand text not null,
  model text not null,
  width int not null,
  profile int not null,
  rim_diameter int not null,
  load_index int,
  speed_rating text,
  season text not null,
  run_flat boolean,
  ev_optimized boolean,
  oem_marking text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists tire_products_dim_idx
  on tire_products (organization_id, width, profile, rim_diameter)
  where active = true;

create table if not exists tire_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tire_product_id uuid not null references tire_products(id) on delete cascade,
  supplier text,
  supplier_price_ore int not null,
  supplier_price_timestamp timestamptz not null,
  stock_status text,
  estimated_delivery text,
  generated_at timestamptz not null default now()
);

create index if not exists tire_price_snapshots_latest_idx
  on tire_price_snapshots (organization_id, tire_product_id, generated_at desc);

create table if not exists tire_offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  wheel_set_id uuid references wheel_sets(id) on delete set null,
  tire_case_id uuid references tire_cases(id) on delete set null,
  status text not null default 'draft', -- draft|ready|sent|accepted|expired|rejected
  created_at timestamptz not null default now()
);

create table if not exists tire_offer_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  offer_id uuid not null references tire_offers(id) on delete cascade,
  slot text not null, -- recommended|alternative|value
  tire_product_id uuid not null references tire_products(id) on delete restrict,
  quantity int not null default 4,
  pricing_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (offer_id, slot)
);

create table if not exists tire_offer_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  offer_id uuid not null references tire_offers(id) on delete cascade,
  option_id uuid not null references tire_offer_options(id) on delete restrict,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  tire_case_id uuid references tire_cases(id) on delete set null,
  accepted_at timestamptz not null default now(),
  acceptance_method text not null default 'hub',
  pricing_snapshot jsonb not null
);

