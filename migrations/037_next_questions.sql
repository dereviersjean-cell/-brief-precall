-- 037 — Questions du prochain call (chantier Deal Execution), 27/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Après chaque fiche, Brief compare le call aux objectifs du rendez-vous fixés
-- par le manager (lib/call-objectives.ts) et fait rédiger par Haiku une
-- question par information encore à aller chercher (lib/objective-questions.ts,
-- décision de Jean : questions Haiku, fiche Sonnet). Elles sont gardées sur la
-- fiche du call : { rank, questions: { <champ>: "« … »" }, model, generatedAt }.
-- Sans cette colonne, les écrans retombent sur les questions fixes.

alter table call_deal_memory add column if not exists next_questions jsonb;
