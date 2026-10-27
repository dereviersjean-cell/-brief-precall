-- 034 — Parcours mesuré sur l'historique HubSpot (chantier Deal Execution, étape 6), 27/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Chaque matin (cron Inngest refresh-deal-pipelines, 7 h), Brief lit
-- l'historique des étapes des deals HubSpot de l'année et en tire, par étape
-- ouverte de chaque pipeline : la durée médiane d'un passage et la part des
-- deals qui vont plus loin (lib/deal-pipeline-stats.ts). Un seul document par
-- organisation, remplacé à chaque calcul : pas d'historique des mesures.

alter table organizations add column if not exists hubspot_pipeline_stats jsonb;
