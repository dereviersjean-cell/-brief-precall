-- 035 — HubSpot mis à jour automatiquement après chaque call (chantier Deal Execution), 27/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Demande de Jean du 27/10/2026 (« très important ») : après chaque call, les
-- propriétés du deal HubSpot sont mises à jour sans bouton à cliquer. Allumé
-- par défaut ; le manager peut le couper dans « Champs HubSpot » (en bas de
-- la fiche deal). Garde-fou : si quelqu'un connecte un HubSpot où Brief ne
-- doit rien écrire, on coupe ici.

alter table organizations add column if not exists hubspot_auto_push boolean not null default true;
