-- Death handling: wheels belong to the estate (dödsbo)

alter table customers
  add column if not exists lifecycle_status text not null default 'ACTIVE', -- ACTIVE|DECEASED
  add column if not exists deceased_at timestamptz;

-- wheel_sets.disposition_status is already a free-text status (see 0012), we will use:
-- ACTIVE | FORGOTTEN_LEFT_BEHIND | DISPOSED | ESTATE

