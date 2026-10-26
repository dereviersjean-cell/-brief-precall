-- 029 — Fiche deal tirée d'un call (chantier Deal Execution, étape 1), 26/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Étape « à blanc » : la fiche n'est visible que des managers des
-- organisations où `deal_memory_enabled` est vrai (Oliverlist seulement), le
-- temps de vérifier sur de vrais calls que ce qu'elle retient est juste.
-- Rien ne sort de Brief (ni HubSpot, ni email) à cette étape.

alter table organizations
  add column if not exists deal_memory_enabled boolean not null default false;

update organizations set deal_memory_enabled = true
  where id = '5a90c843-b6c2-4be2-ab64-7469216253d0'; -- Oliverlist

-- Une fiche par call, remplacée à chaque régénération. `fields` et `alerts`
-- portent le texte ET la phrase exacte du transcript qui le justifie (extraite
-- par le code à partir de numéros de ligne, jamais recopiée par le modèle).
create table if not exists call_deal_memory (
  call_id uuid primary key references calls(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  fields jsonb not null default '{}'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  model text,
  generated_at timestamptz not null default now()
);

create index if not exists call_deal_memory_organization_idx on call_deal_memory (organization_id);

-- RLS activé sans policy : seul le service_role (lib/db.ts) y accède.
alter table call_deal_memory enable row level security;
