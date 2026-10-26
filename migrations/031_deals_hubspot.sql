-- 031 — Brancher les deals sur HubSpot (chantier Deal Execution, étape 3), 27/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Un deal de Brief se rattache au deal HubSpot du prospect (retrouvé par
-- l'email du contact, sinon par le domaine de son entreprise). On garde
-- l'identifiant et une photo de ce qu'on y a lu (nom, étape, montant, date de
-- clôture), relue à chaque fiche générée.

alter table deals
  add column if not exists hubspot_deal_id text,
  add column if not exists hubspot_snapshot jsonb,
  add column if not exists hubspot_synced_at timestamptz;

create index if not exists deals_organization_hubspot_idx on deals (organization_id, hubspot_deal_id);

-- Où écrire chaque champ de la fiche dans le HubSpot du client : { "<champ
-- de la fiche>": "<nom interne de la propriété de deal HubSpot>" }. Réglé au
-- setup avec le manager (Brief s'adapte au HubSpot du client, pas l'inverse).
alter table organizations
  add column if not exists hubspot_field_mapping jsonb not null default '{}'::jsonb;

-- Dernier envoi de la fiche dans HubSpot.
alter table call_deal_memory
  add column if not exists hubspot_pushed_at timestamptz;
