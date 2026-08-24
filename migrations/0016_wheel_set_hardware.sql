-- Wheel set hardware metadata (caps, locks, bolts), kept out of user-facing complexity.

create table if not exists wheel_set_hardware (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  wheel_set_id uuid not null references wheel_sets(id) on delete cascade,

  -- Some wheels (e.g. certain aftermarket) may lack center bore / require hub-centric rings
  has_center_bore boolean,
  center_bore_notes text,

  -- Caps and covers
  center_cap_type text, -- NONE|PLASTIC_CAP|LUG_COVERS|UNKNOWN
  cap_notes text,

  -- Wheel locks
  has_wheel_lock boolean,
  wheel_lock_key_present boolean,
  wheel_lock_key_location text,

  -- Different bolts/nuts for summer vs winter sets
  bolts_summer text,
  bolts_winter text,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, wheel_set_id)
);

create index if not exists wheel_set_hardware_org_idx
  on wheel_set_hardware (organization_id, updated_at desc);

