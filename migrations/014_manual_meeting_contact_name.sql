-- 014 — Nom du contact sur un rendez-vous ajouté manuellement.
-- À exécuter dans le SQL editor Supabase (prod) avant de déployer le code
-- qui lit cette colonne, puis committer ici.

-- Le formulaire d'ajout ne demandait qu'une adresse email. Or l'annuaire de
-- contacts a besoin du NOM pour retrouver quelqu'un : une adresse absente de
-- sa base ne remonte rien, alors qu'un nom accompagné de l'entreprise rend le
-- profil complet (mesuré le 04/09/2026). Sans ce champ, un rendez-vous créé à
-- la main n'avait donc aucune chance d'obtenir une fiche contact enrichie —
-- constaté sur un vrai test, où seul l'email était connu.
--
-- Null pour les rendez-vous existants : l'enrichissement retombe alors sur
-- l'email seul, comme avant.
alter table manual_meetings
  add column if not exists contact_name text;
