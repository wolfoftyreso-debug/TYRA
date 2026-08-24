-- Valve stems / valve stock age + condition (can be older than tyres)

alter table tire_inspection_positions
  add column if not exists valve_age_years int,
  add column if not exists valve_condition text, -- ok|aging|cracked|leaking|unknown
  add column if not exists valve_notes text;

