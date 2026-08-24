-- Supplier integration health + logs (human-readable, no stack traces)

create table if not exists supplier_integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  supplier_id text not null,
  supplier_account_id uuid references tenant_supplier_accounts(id) on delete set null,
  level text not null, -- ok|warning|error
  event_type text not null, -- SEARCH|PRICE|ORDER|AUTH|HEALTH|UNKNOWN
  message text not null,
  data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists supplier_integration_events_org_idx
  on supplier_integration_events (organization_id, supplier_id, created_at desc);

