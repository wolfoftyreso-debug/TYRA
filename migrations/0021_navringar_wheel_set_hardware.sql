-- Hub centric rings (navringar) for certain wheel sets

alter table wheel_set_hardware
  add column if not exists has_hub_rings boolean,
  add column if not exists hub_ring_dimensions text,
  add column if not exists hub_ring_notes text;

