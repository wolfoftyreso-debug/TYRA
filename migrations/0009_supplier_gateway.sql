-- TYRA Supplier Gateway (canonical interface + tenant-specific accounts)

create table if not exists tenant_supplier_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  supplier_id text not null,
  external_customer_id text,
  credentials_reference text,
  currency text not null default 'SEK',
  enabled boolean not null default true,
  priority int not null default 100,
  pricing_enabled boolean not null default true,
  ordering_enabled boolean not null default false,
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, supplier_id)
);

-- Price cache improvements for live pricing + freshness
alter table tire_price_snapshots
  add column if not exists supplier_id text,
  add column if not exists supplier_account_id uuid references tenant_supplier_accounts(id) on delete set null,
  add column if not exists retrieved_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz;

-- Backfill for existing rows (best-effort)
update tire_price_snapshots
set retrieved_at = generated_at
where retrieved_at is null;

update tire_price_snapshots
set supplier_id = supplier
where supplier_id is null and supplier is not null;

update tire_price_snapshots
set expires_at = retrieved_at + interval '24 hours'
where expires_at is null;

create index if not exists tenant_supplier_accounts_org_idx
  on tenant_supplier_accounts (organization_id, enabled, priority asc);

create index if not exists tire_price_snapshots_supplier_latest_idx
  on tire_price_snapshots (organization_id, supplier_id, tire_product_id, retrieved_at desc);

