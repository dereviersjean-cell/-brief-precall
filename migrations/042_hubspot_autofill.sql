-- 042 — Mise à jour automatique des propriétés HubSpot (deal, contact, entreprise), 10/11/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Quand HubSpot est connecté, Brief lit les propriétés du client, propose
-- lui-même ce qu'il remplira après chaque call, et le manager valide une
-- fois (Paramètres › HubSpot). La liste validée vit dans
-- organizations.hubspot_autofill (lib/hubspot-autofill.ts) :
--   { active, links: [{ object, property, label, type, what, mode, enabled, check, example }], validatedAt, validatedBy }
-- Sans cette colonne, l'écran ne peut rien enregistrer et l'envoi garde
-- l'ancien réglage (hubspot_field_mapping).
--
-- Le journal (038) ne connaissait que le deal : il retient désormais l'objet
-- écrit (deal, contact, company) et son identifiant HubSpot.

alter table organizations add column if not exists hubspot_autofill jsonb;

alter table hubspot_writes add column if not exists object_type text not null default 'deal';
alter table hubspot_writes add column if not exists object_id text;
