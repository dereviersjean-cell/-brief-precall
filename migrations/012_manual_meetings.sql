-- 012 — Rendez-vous ajoutés manuellement.
-- À exécuter manuellement dans le SQL editor Supabase (prod) AVANT de
-- déployer le code qui référence cette table, puis committer ici.

-- Un rendez-vous qui n'existe pas dans l'agenda Google/Microsoft synchronisé
-- (oublié à la création, posé par téléphone, agenda tiers non connecté...).
-- Sert UNIQUEMENT à préparer/consulter un brief — contrairement à un
-- événement de calendrier réel, Recall n'en a jamais connaissance : pas de
-- lien visio, pas de bot d'enregistrement automatique. Cohérent avec le
-- reste de l'app où l'enregistrement suit toujours le vrai agenda connecté.
create table if not exists manual_meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  -- Titre affiché (« Point Salesforce »), distinct du nom d'entreprise —
  -- même distinction que briefs.meeting_title / briefs.company_name
  -- (migration 010).
  title text not null,
  -- Saisi explicitement par l'utilisateur, jamais deviné depuis un domaine
  -- email : contrairement aux événements de calendrier, il n'y a pas
  -- toujours de contact renseigné, et deviner à tort partirait sur un
  -- mauvais brief.
  company_name text not null,
  contact_email text,
  meeting_time timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists manual_meetings_user_time_idx
  on manual_meetings (user_id, meeting_time);

alter table manual_meetings enable row level security;
