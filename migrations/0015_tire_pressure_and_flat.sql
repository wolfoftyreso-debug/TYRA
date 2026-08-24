-- Tyre pressure / inflation state (e.g. flat after storage)

alter table tire_inspection_positions
  add column if not exists tyre_pressure_kpa int,
  add column if not exists inflation_state text, -- OK|LOW|FLAT|UNKNOWN
  add column if not exists inflation_notes text;

