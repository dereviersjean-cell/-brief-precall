-- 010 — Titre du rendez-vous sur les briefs.
-- À exécuter dans le SQL editor Supabase (prod). Le code fonctionne AVANT
-- comme APRÈS : l'écriture retombe sur l'ancienne forme si la colonne est
-- absente, et la lecture traite null comme « pas de titre » en affichant le
-- nom d'entreprise, comme aujourd'hui.

alter table briefs
  -- Le titre de l'événement d'agenda (« Luc / Jean Weekly »), tel que
  -- l'utilisateur le reconnaît. Jusqu'ici un brief n'était identifié que par
  -- son company_name, deviné depuis le domaine email du participant. Pour un
  -- prospect sur Gmail cette déduction est impossible : l'application
  -- demandait alors de saisir un nom à la main, d'où des briefs enregistrés
  -- sous « Test » et illisibles dans la liste des briefs récents.
  --
  -- company_name est CONSERVÉ : c'est lui qui alimente la génération (Pappers,
  -- actualités, recherche d'entreprise). Le titre ne sert qu'à l'affichage.
  -- Null = brief antérieur à cette migration, affiché comme avant.
  add column if not exists meeting_title text;
