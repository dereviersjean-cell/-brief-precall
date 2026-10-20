-- 028 — Abonnement activé manuellement (accès offert), 20/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Quand `billing_exempt` est vrai, l'organisation garde l'accès à Brief quel
-- que soit `billing_status` (résilié, impayé…). Les webhooks Stripe continuent
-- d'écrire `billing_status`, qui reste le reflet fidèle de Stripe ; seule la
-- décision d'accès change. Interrupteur dans l'admin : fiche client →
-- Facturation. Remplace le « déblocage manuel » qui écrivait `active` et se
-- faisait réécraser par le webhook suivant.
alter table organizations
  add column if not exists billing_exempt boolean not null default false;
