-- Some wheels are filled with nitrogen (N2) instead of air

alter table tire_inspection_positions
  add column if not exists fill_gas text; -- AIR|N2|null (unknown)

