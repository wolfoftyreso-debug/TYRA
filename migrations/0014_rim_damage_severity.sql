-- Rim damage: cosmetic vs traffic-safety risk

alter table tire_inspection_positions
  add column if not exists rim_severity text, -- OK|COSMETIC|SAFETY
  add column if not exists rim_damage_types text[],
  add column if not exists rim_notes text;

