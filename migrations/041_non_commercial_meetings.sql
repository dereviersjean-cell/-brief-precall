-- 041 — Rendez-vous non commerciaux (questionnaire du 05/11/2026, réponse de Jean à C1).
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Brief préparait et enregistrait tout rendez-vous avec un participant
-- externe : un entretien de recrutement ou un « Case study » recevait le
-- robot d'enregistrement et une analyse, comme un prospect. Désormais Brief
-- les repère aux mots de leur titre, n'y envoie pas le robot, et le dit sur
-- la carte du rendez-vous ; un bouton force l'analyse.
--
-- 1. Réglage par organisation : null = détection allumée avec la liste de
--    mots par défaut (lib/meeting-kind.ts). { "enabled": false } l'éteint ;
--    { "keywords": [...] } remplace la liste.
alter table organizations add column if not exists non_commercial_config jsonb;

-- 2. Les rendez-vous dont l'utilisateur a forcé l'analyse, par l'identifiant
--    de l'événement chez l'agenda (le même que briefs.calendar_event_id et
--    que le platform_id de Recall).
create table if not exists meeting_analysis_overrides (
  user_id uuid not null references users(id) on delete cascade,
  calendar_event_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, calendar_event_id)
);

alter table meeting_analysis_overrides enable row level security;
