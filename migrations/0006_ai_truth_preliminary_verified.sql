-- AI suggests, technician verifies: store both values + inspection PRELIMINARY/VERIFIED states.
create extension if not exists "pgcrypto";

alter table tire_inspections
  add column if not exists inspection_status text not null default 'PRELIMINARY', -- PRELIMINARY | VERIFIED
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by_user_id uuid references users(id) on delete set null;

alter table tire_inspection_positions
  add column if not exists ai_tread_depth_mm numeric(3,1),
  add column if not exists ai_tread_depth_source text, -- AI_ESTIMATE | IMAGE_RECOGNITION | ...
  add column if not exists ai_confidence numeric,
  add column if not exists ai_model_version text,
  add column if not exists ai_suggested_at timestamptz,
  add column if not exists ai_tyre_brand text,
  add column if not exists ai_tyre_model text,
  add column if not exists ai_tyre_dimension text,
  add column if not exists ai_dot_week int,
  add column if not exists ai_dot_year int;

