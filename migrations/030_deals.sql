-- 030 — Suivre un deal d'un call à l'autre (chantier Deal Execution, étape 2), 27/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Tant que HubSpot n'est pas branché (étape 3), un deal regroupe les calls
-- d'un même prospect, reconnu au domaine de son email ou au nom de son
-- entreprise (lib/deal-grouping.ts). L'étape 3 y ajoutera l'identifiant du
-- deal HubSpot.

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  -- Nom normalisé (minuscules, sans accents ni forme juridique) et domaine de
  -- l'email du prospect : les deux repères du rattachement.
  name_key text,
  domain text,
  created_at timestamptz not null default now()
);

create index if not exists deals_organization_name_key_idx on deals (organization_id, name_key);
create index if not exists deals_organization_domain_idx on deals (organization_id, domain);

alter table deals enable row level security;

-- La fiche d'un call sait à quel deal elle appartient, à quelle date le call
-- a eu lieu (l'ordre du deal) et quelle entreprise le modèle a relevée.
alter table call_deal_memory
  add column if not exists deal_id uuid references deals(id) on delete set null,
  add column if not exists call_at timestamptz,
  add column if not exists prospect_company text;

create index if not exists call_deal_memory_deal_idx on call_deal_memory (deal_id, call_at);
