-- 038 — Journal des écritures de Brief dans HubSpot (chantier Deal Execution), 27/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Chaque envoi d'une fiche dans un deal HubSpot laisse une ligne par propriété
-- reliée : écrite (avec l'ancienne et la nouvelle valeur) ou non écrite (avec
-- la raison : déjà remplie, encore floue, modifiée à la main…). Sert à
-- montrer au client ce que Brief a fait, à annuler, et au mode « mise à jour
-- sauf modification à la main » : on ne remplace une valeur que si c'est
-- Brief qui l'avait écrite (lib/hubspot-mapping.ts). Sans cette table, ce
-- mode n'écrase rien de ce qui est déjà rempli.

create table if not exists hubspot_writes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  call_id uuid references calls(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  hubspot_deal_id text not null,
  field text not null,
  property text not null,
  old_value text,
  new_value text,
  status text not null check (status in ('written', 'skipped')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists hubspot_writes_org_idx on hubspot_writes (organization_id, created_at desc);
create index if not exists hubspot_writes_deal_idx on hubspot_writes (hubspot_deal_id, property, created_at desc);

alter table hubspot_writes enable row level security;
