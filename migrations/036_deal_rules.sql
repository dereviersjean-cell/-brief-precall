-- 036 — Règles des deals réglables par le manager (chantier Deal Execution), 27/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Réponse 8 de Hubert (le manager modifie les règles lui-même), réponse 6
-- (Brief suit la méthode de qualification du client : socle, MEDDIC, BANT,
-- MEDDPICC), question 9 (critères de passage par étape, indicatifs). Un seul
-- document par organisation (lib/deal-rules.ts) ; vide = règles par défaut.

alter table organizations add column if not exists deal_rules jsonb;
