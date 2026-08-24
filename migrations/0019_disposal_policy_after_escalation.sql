-- Workshop policy: how long forgotten wheel sets remain after escalation before disposal

alter table organizations
  add column if not exists forgotten_dispose_after_days int not null default 60;

