-- 009 — Niveau de confiance, restitution en puces, et position dans le call.
-- À exécuter dans le SQL editor Supabase (prod) AVANT de déployer.

alter table call_objections
  -- « certaine » | « incertaine ». Décision du 31/07/2026 : seules les
  -- objections certaines sont affichées — mieux vaut en manquer une que d'en
  -- montrer une qui n'en est pas. Mais les incertaines sont STOCKÉES quand
  -- même : le filtre est appliqué à la lecture, pas à l'extraction. On peut
  -- ainsi déplacer le curseur sans tout ré-analyser, et le calibrage peut
  -- chiffrer ce qu'on écarte à tort. Null = ligne antérieure à cette
  -- migration, traitée comme certaine pour ne rien faire disparaître.
  add column if not exists confidence text,
  -- Restitution en puces courtes, ce que le manager lit en premier. Le
  -- verbatim complet reste disponible d'un clic (prospect_verbatim /
  -- commercial_verbatim, migration 007).
  add column if not exists prospect_bullets text[] not null default '{}',
  add column if not exists commercial_bullets text[] not null default '{}',
  -- Position du passage dans l'enregistrement, pour positionner la vidéo
  -- directement sur le moment de l'objection. Null quand le transcript n'a pas
  -- d'horodatage (import manuel de texte brut) — le bouton vidéo est alors
  -- simplement absent.
  add column if not exists start_ms bigint,
  add column if not exists end_ms bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'call_objections_confidence_check'
  ) then
    alter table call_objections
      add constraint call_objections_confidence_check
      check (confidence is null or confidence in ('certaine', 'incertaine'));
  end if;
end $$;

create index if not exists call_objections_confidence_idx
  on call_objections (organization_id, confidence);
