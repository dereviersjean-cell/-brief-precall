-- 007 — Verbatim des objections + reformulation attendue.
-- À exécuter dans le SQL editor Supabase (prod) AVANT de déployer.
--
-- Jusqu'ici call_objections ne stockait qu'un RÉSUMÉ à la troisième personne
-- (« Le prospect confirme que son marché est trop niche… »), produit par
-- l'extraction d'analyzeCall. Pour coacher, le manager a besoin des phrases
-- réellement prononcées, des deux côtés, et de ce qu'il aurait fallu répondre.
--
-- Nullable partout : les lignes déjà en base restent lisibles et l'UI retombe
-- sur le résumé, explicitement étiqueté comme tel, tant que le backfill n'a
-- pas tourné.

alter table call_objections
  -- Citations copiées MOT À MOT du transcript, jamais reformulées. Le code
  -- (lib/objection-classifier.ts) vérifie que la citation apparaît vraiment
  -- dans le transcript et la met à null sinon : mieux vaut ne rien afficher
  -- qu'un verbatim inventé, sur lequel un manager pourrait reprendre un
  -- commercial pour une phrase qu'il n'a pas dite.
  add column if not exists prospect_verbatim text,
  add column if not exists commercial_verbatim text,
  -- Ce qu'il aurait fallu répondre, dérivé du handling_guidance de la
  -- catégorie. Null quand l'objection a été bien traitée — il n'y a alors
  -- rien à corriger.
  add column if not exists suggested_response text;
