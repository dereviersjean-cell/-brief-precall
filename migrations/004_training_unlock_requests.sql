-- 004 — Demandes de déblocage du module Entraînement (CTA "Je veux
-- débloquer ce module" sur la page verrouillée). Trace durable en base,
-- en complément de l'email envoyé à l'admin — si l'email échoue ou est
-- manqué, la demande reste visible/interrogeable.

create table if not exists training_unlock_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  user_id uuid not null references users(id) on delete cascade,
  user_name text,
  user_email text not null,
  organization_name text,
  created_at timestamptz not null default now()
);

create index if not exists training_unlock_requests_org_idx
  on training_unlock_requests (organization_id);

alter table training_unlock_requests enable row level security;
