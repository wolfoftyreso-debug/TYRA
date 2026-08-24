-- TYRA commercial loop: live price (computed) + order snapshot + reg verification + SMS prefs + booking skeleton.
create extension if not exists "pgcrypto";

create table if not exists tire_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  wheel_set_id uuid references wheel_sets(id) on delete set null,
  tire_case_id uuid references tire_cases(id) on delete set null,
  tire_product_id uuid not null references tire_products(id) on delete restrict,
  supplier text,
  supplier_product_id text,
  quantity int not null,
  registration_verification_passed boolean not null default false,
  ordered_at timestamptz not null default now(),
  source text not null default 'CUSTOMER_TIRE_HUB',
  status text not null default 'ORDER_CONFIRMED', -- ORDER_CONFIRMED|PROCUREMENT_PENDING|PRODUCT_RESERVED|PRODUCT_ORDERED|READY_FOR_INSTALLATION|BOOKED|INSTALLED|COMPLETED|CANCELLED
  order_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists tire_orders_vehicle_idx on tire_orders (organization_id, vehicle_id, ordered_at desc);

create table if not exists customer_hub_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  attempt_count int not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  unique (token_hash)
);

create table if not exists customer_communication_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  level text not null default 'normal', -- fewer|normal|updated
  remind_worn_tires boolean not null default true,
  remind_prices boolean not null default true,
  remind_season boolean not null default true,
  remind_bookings boolean not null default true,
  remind_storage boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, customer_id)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  tire_case_id uuid references tire_cases(id) on delete set null,
  tire_order_id uuid references tire_orders(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'BOOKED', -- BOOKED|CANCELLED|COMPLETED
  requested_operations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

