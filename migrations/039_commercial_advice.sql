-- 039 — Conseil de Brief sur un commercial, rédigé par Haiku (chantier Deal Execution), 28/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Le bandeau qui s'affiche quand le manager clique sur un commercial dans
-- l'onglet Équipe de « Deals de l'équipe » : ce qui revient sur ses deals,
-- cité deal par deal, et les questions pour le prochain point avec lui
-- (lib/person-advice-ai.ts). Une ligne par commercial, réécrite après chacun
-- de ses calls. Sans cette table, le bandeau garde les règles fixes
-- (lib/deal-coaching.ts, personAdvice).

create table if not exists commercial_advice (
  user_id uuid primary key references users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  advice jsonb not null,
  model text,
  generated_at timestamptz not null default now()
);

create index if not exists commercial_advice_org_idx on commercial_advice (organization_id);

alter table commercial_advice enable row level security;
