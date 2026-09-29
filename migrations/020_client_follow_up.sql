-- 020 — Suivi d'un client par l'account manager (espace « Suivi clients »,
-- 29/09/2026). À exécuter dans le SQL editor Supabase (prod). Le code déployé
-- fonctionne AVANT la migration : ces champs restent simplement vides et
-- non modifiables.

-- Qui suit ce client (Jean ou son associé) : texte libre, pas une
-- référence vers users — les account managers n'ont pas de compte dans
-- Brief, ils passent par l'admin.
alter table organizations
  add column if not exists account_manager text,
  -- Date et heure du prochain point hebdomadaire.
  add column if not exists next_review_at timestamptz,
  -- Début du parcours de 8 semaines : la semaine en cours s'en déduit, et
  -- donc le module qu'on devrait déjà avoir ouvert. NULL = client hors
  -- parcours (antérieur, comme Oliverlist).
  add column if not exists parcours_started_at date;
