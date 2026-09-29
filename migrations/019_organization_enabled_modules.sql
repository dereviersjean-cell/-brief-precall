-- 019 — Modules actifs par organisation (parcours client, 29/09/2026).
-- À exécuter dans le SQL editor Supabase (prod). Le code déployé fonctionne
-- AVANT la migration : sans la colonne, toutes les organisations gardent
-- tous leurs modules, comme aujourd'hui.

-- NULL = organisation antérieure au parcours : tout reste actif (sauf
-- Entraînement, qui suit toujours training_enabled). Une liste, même vide, =
-- l'account manager a réglé les modules de ce client, et elle seule fait foi.
-- Clés : voir lib/modules.ts (playbook, follow_up, objections, crm, tasks,
-- training, insights, weekly_digest, slack, references).
alter table organizations
  add column if not exists enabled_modules text[];
