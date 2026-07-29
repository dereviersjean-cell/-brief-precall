-- 006 — Playbook d'objections du manager (catégories) + métriques de
-- conversation précalculées (onglet Performance > Analytics).
-- À exécuter manuellement dans le SQL editor Supabase (prod) AVANT de
-- déployer le code qui référence ces tables/colonnes, puis committer ici.
-- Toutes les lectures passent par supabaseAdmin (service_role) : RLS activé
-- sans policies, comme partout ailleurs.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. objection_categories — les objections « qui reviennent le plus souvent »
--    définies par le manager, avec la façon de les traiter. Par organisation
--    (comme le playbook, pas par user : un junior bénéficie de ce que
--    l'équipe a déjà formalisé). Alimentée à la main ou par import de
--    document (même pattern que l'import playbook).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists objection_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  label text not null,
  -- Ce qui caractérise l'objection — sert AUSSI de définition au classifieur
  -- sémantique (lib/objection-classifier.ts), pas seulement d'aide à l'UI.
  description text not null default '',
  -- « De quelle manière il faut la traiter » : la référence contre laquelle
  -- la réponse réellement apportée par le commercial est évaluée.
  handling_guidance text not null default '',
  -- Formulations typiques entendues en call — améliorent nettement le
  -- rattachement quand le libellé de la catégorie est abstrait.
  example_phrasings text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists objection_categories_org_idx
  on objection_categories (organization_id, position);

alter table objection_categories enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. call_objections — rattachement à une catégorie + évaluation de la
--    réponse apportée. Toutes les colonnes sont nullables / ont un défaut :
--    les lignes déjà en base restent lisibles telles quelles (elles
--    remontent en « Non classées » tant que le backfill n'a pas tourné).
-- ─────────────────────────────────────────────────────────────────────────
alter table call_objections
  add column if not exists category_id uuid references objection_categories(id) on delete set null,
  -- null = pas encore évaluée (ligne antérieure au classifieur, ou aucune
  -- catégorie définie par le manager au moment de l'analyse).
  add column if not exists handling_quality text,
  add column if not exists handling_comment text,
  -- true = la note vient d'une comparaison au handling_guidance du manager ;
  -- false = évaluation générique (aucune consigne disponible). L'UI le dit
  -- explicitement plutôt que de faire passer les deux pour la même chose.
  add column if not exists evaluated_against_playbook boolean not null default false,
  add column if not exists classified_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'call_objections_handling_quality_check'
  ) then
    alter table call_objections
      add constraint call_objections_handling_quality_check
      check (handling_quality is null or handling_quality in ('bien_traitee', 'partiellement', 'non_traitee'));
  end if;
end $$;

create index if not exists call_objections_category_idx
  on call_objections (organization_id, category_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. call_analytics — métriques d'interaction par call, précalculées à
--    l'ingestion depuis calls.transcript_json (lib/call-analytics.ts).
--    Précalculé et non recalculé à la volée : l'onglet Analytics agrège tous
--    les calls de l'organisation, charger chaque transcript_json à chaque
--    affichage de page serait ingérable.
--    Les métriques d'ACTIVITÉ (durée, volume, temps total) ne sont PAS ici —
--    elles se calculent directement depuis `calls` (duration_seconds,
--    started_at) et restent donc disponibles même sans transcript exploitable.
--    user_id / organization_id / occurred_at sont dénormalisés depuis `calls`
--    pour que l'agrégation par commercial sur une période reste un seul
--    select à plat.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists call_analytics (
  call_id uuid primary key references calls(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  occurred_at timestamptz,
  duration_ms bigint not null default 0,
  commercial_talk_ms bigint not null default 0,
  prospect_talk_ms bigint not null default 0,
  -- null quand aucun speaker n'a pu être rattaché au commercial avec
  -- certitude — afficher un ratio construit sur une supposition serait pire
  -- que ne rien afficher (même règle que computeConversationAnalytics).
  talk_ratio_pct real,
  longest_monologue_ms bigint not null default 0,
  longest_prospect_story_ms bigint not null default 0,
  commercial_questions_count int not null default 0,
  question_rate real not null default 0,
  interactivity_score real not null default 0,
  patience_ms bigint,
  turns_count int not null default 0,
  computed_at timestamptz not null default now()
);

create index if not exists call_analytics_org_idx
  on call_analytics (organization_id, occurred_at desc);
create index if not exists call_analytics_user_idx
  on call_analytics (user_id, occurred_at desc);

alter table call_analytics enable row level security;
