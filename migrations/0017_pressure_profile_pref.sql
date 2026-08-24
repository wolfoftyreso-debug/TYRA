-- Customer preference: desired tyre pressure profile (no load / normal / full load)

alter table customer_communication_preferences
  add column if not exists pressure_profile text not null default 'normal'; -- light|normal|full

