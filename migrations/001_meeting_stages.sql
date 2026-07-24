-- 001 — Étapes de rendez-vous (R1/R2/R3)
-- À exécuter manuellement dans le SQL editor Supabase (prod), puis committer
-- ici — premier fichier du dossier migrations/ recommandé par l'audit du
-- 21 juillet 2026 (bug #14 : migration non passée = page plantée).

-- Titre du meeting (issu de l'agenda via les metadata du bot Recall) et
-- étape détectée à l'ingestion. NULL pour tous les calls antérieurs — le
-- titre n'était pas transmis au webhook avant cette migration, pas de
-- backfill possible.
alter table calls add column if not exists meeting_title text;
alter table calls add column if not exists meeting_stage text
  check (meeting_stage in ('r1', 'r2', 'r3'));

-- Configuration par organisation : motifs de titre par étape + consignes
-- d'évaluation spécifiques injectées dans l'analyse. Shape :
-- { "r1": { "patterns": ["rencontre oliverlist"], "guidance": "..." }, "r2": ..., "r3": ... }
-- NULL = défauts du code (lib/meeting-stage.ts), aucun motif → analyse générique.
alter table organizations add column if not exists meeting_stage_config jsonb;
