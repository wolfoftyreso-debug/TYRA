CREATE TABLE IF NOT EXISTS tyre_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sku text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  width integer NOT NULL,
  profile integer NOT NULL,
  rim_inches integer NOT NULL,
  load_index integer NOT NULL,
  speed_rating text NOT NULL,
  season text NOT NULL,
  segment text NOT NULL,
  unit_price_ore integer NOT NULL CHECK (unit_price_ore >= 0),
  cost_price_ore integer NOT NULL CHECK (cost_price_ore >= 0),
  stock integer NOT NULL DEFAULT 0,
  xl boolean NOT NULL DEFAULT false,
  ev_approved boolean NOT NULL DEFAULT false,
  eprel_url text,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, sku)
);

CREATE TABLE IF NOT EXISTS service_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  unit_price_ore integer NOT NULL CHECK (unit_price_ore >= 0),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, sku)
);

CREATE TABLE IF NOT EXISTS pricing_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  preferred_brands jsonb NOT NULL DEFAULT '[]',
  forbidden_product_ids jsonb NOT NULL DEFAULT '[]',
  minimum_margin_percent numeric(5,2) NOT NULL DEFAULT 0,
  never_budget_on_segments jsonb NOT NULL DEFAULT '[]',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS replacement_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wheel_set_id uuid NOT NULL REFERENCES wheel_sets(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS one_open_opportunity_per_set
  ON replacement_opportunities (wheel_set_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES replacement_opportunities(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'sent', 'opened', 'accepted', 'expired', 'rejected')),
  valid_until date NOT NULL,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (slot IN ('recommended', 'alternative', 'value')),
  tyre_product_id uuid NOT NULL REFERENCES tyre_products(id),
  rationale text NOT NULL,
  total_ore integer NOT NULL CHECK (total_ore >= 0),
  UNIQUE (quote_id, slot)
);

CREATE TABLE IF NOT EXISTS quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_option_id uuid NOT NULL REFERENCES quote_options(id) ON DELETE CASCADE,
  label text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_ore integer NOT NULL CHECK (unit_price_ore >= 0),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quote_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_org_status_idx ON quotes (organization_id, status);
CREATE INDEX IF NOT EXISTS quote_events_quote_created_idx ON quote_events (quote_id, created_at);
