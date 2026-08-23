CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  registration text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  model_year integer,
  is_ev boolean NOT NULL DEFAULT false,
  UNIQUE (organization_id, registration)
);

CREATE TABLE IF NOT EXISTS wheel_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  season text NOT NULL CHECK (season IN ('summer', 'winter', 'all_season')),
  status text NOT NULL,
  replacement_recommended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wheels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wheel_set_id uuid NOT NULL REFERENCES wheel_sets(id) ON DELETE CASCADE,
  position text NOT NULL,
  serial_number text
);

CREATE TABLE IF NOT EXISTS tyres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wheel_id uuid NOT NULL REFERENCES wheels(id) ON DELETE CASCADE,
  brand text NOT NULL,
  model text NOT NULL,
  width integer NOT NULL,
  profile integer NOT NULL,
  rim_inches integer NOT NULL,
  load_index integer,
  speed_rating text,
  dot_code text,
  manufactured_year integer,
  xl boolean NOT NULL DEFAULT false,
  ev_approved boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS rims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wheel_id uuid NOT NULL REFERENCES wheels(id) ON DELETE CASCADE,
  kind text,
  diameter_inches integer,
  condition_note text
);

CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wheel_set_id uuid NOT NULL REFERENCES wheel_sets(id),
  inspected_by text REFERENCES "user"(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tread_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  wheel_id uuid REFERENCES wheels(id),
  depth_mm numeric(4,1) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS damage_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  wheel_id uuid REFERENCES wheels(id),
  severity text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wheel_set_id uuid NOT NULL REFERENCES wheel_sets(id),
  blob_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  zone text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS storage_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wheel_set_id uuid NOT NULL REFERENCES wheel_sets(id),
  location_id uuid NOT NULL REFERENCES storage_locations(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS one_open_stay_per_set
  ON storage_stays (wheel_set_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS one_set_per_location
  ON storage_stays (location_id) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS storage_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wheel_set_id uuid NOT NULL REFERENCES wheel_sets(id),
  from_location_id uuid REFERENCES storage_locations(id),
  to_location_id uuid REFERENCES storage_locations(id),
  kind text NOT NULL,
  performed_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pick_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  wheel_set_id uuid NOT NULL REFERENCES wheel_sets(id),
  status text NOT NULL CHECK (status IN ('QUEUED', 'PICKING', 'PICKED', 'DELIVERED')),
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES "user"(id),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS climate_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  zone text NOT NULL,
  temperature_c numeric(4,1) NOT NULL,
  humidity_percent integer NOT NULL,
  measured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_org_idx ON customers (organization_id);
CREATE INDEX IF NOT EXISTS vehicles_org_registration_idx ON vehicles (organization_id, registration);
CREATE INDEX IF NOT EXISTS wheel_sets_vehicle_idx ON wheel_sets (vehicle_id);
CREATE INDEX IF NOT EXISTS audit_org_created_idx ON audit_events (organization_id, created_at DESC);
