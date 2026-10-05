-- 024 — Niveau d'accès par organisation (inscription libre, 05/10/2026).
-- À exécuter dans le SQL editor Supabase (prod) AVANT de déployer le code :
-- sans la colonne, une personne qui s'inscrit seule ne peut pas terminer
-- l'onboarding (la création de son entreprise échoue, volontairement — on ne
-- lui ouvre jamais l'accès complet par défaut).
--
-- 'full'   = client accompagné : socle complet + modules ouverts par l'account
--            manager. Toutes les organisations existantes.
-- 'briefs' = inscription libre : uniquement les briefs, 10 par jour et par
--            utilisateur. L'account manager passe le client en 'full' depuis
--            l'admin (fiche client → Parcours).
alter table organizations
  add column if not exists access_level text not null default 'full'
  check (access_level in ('full', 'briefs'));
