-- 015 — Qui était en face, et pour quelle entreprise.
-- À exécuter dans le SQL editor Supabase (prod) avant de déployer le code qui
-- lit ces colonnes, puis committer ici.

-- La liste des calls affichait « Dereviersjean · Théa » : un nom déduit de
-- l'adresse email et une entreprise saisie au rendez-vous, tous deux faux sur
-- un vrai call. L'information juste existait déjà — dans l'analyse, en toutes
-- lettres : « rendez-vous entre Guislain (Oliverlist) et Théa et Marin
-- (Vasco/Gamma) » — mais en prose, donc inexploitable par une liste.
--
-- Ces deux colonnes portent cette identité, extraite UNE FOIS après l'analyse
-- (lib/call-identity.ts) plutôt qu'à chaque affichage. Le nom du commercial
-- n'y figure pas : c'est le prospect qu'on cherche à nommer, et le commercial
-- n'est pas toujours le propriétaire du compte (sur le call ci-dessus, c'est
-- Guislain alors que le compte est celui de Jean).
--
-- Null pour tous les calls existants tant que le backfill n'a pas tourné
-- (scripts/backfill-call-identity.ts) : l'affichage retombe alors sur ce
-- qu'il faisait avant, jamais sur du vide.
alter table calls
  add column if not exists prospect_company text;

-- Les noms des personnes d'en face, dans l'ordre où l'analyse les cite.
-- Toujours un sous-ensemble des noms réellement relevés en visio : le modèle
-- choisit parmi une liste fournie, il n'en invente pas (même principe
-- d'ancrage que les verbatims d'objection).
alter table calls
  add column if not exists prospect_contacts jsonb;
