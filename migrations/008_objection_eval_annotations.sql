-- 008 — Annotations de référence pour le calibrage de la détection d'objections.
-- À exécuter dans le SQL editor Supabase (prod) AVANT de déployer.
--
-- Remplace les fiches JSON de evals/objections/ : l'annotation est faite par le
-- directeur commercial, qui a l'expertise métier mais n'ouvre pas un éditeur de
-- code ni un terminal. La base devient la source unique — deux sources de
-- vérité concurrentes (fichiers + base) finiraient forcément par diverger.

create table if not exists objection_eval_annotations (
  call_id uuid primary key references calls(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  -- [{ objection: text, category: text|null }] — ce que le pipeline DEVRAIT
  -- trouver sur ce call, tel que l'expert métier l'a établi. `category` porte
  -- le LIBELLÉ et non l'id : une catégorie renommée ou supprimée ne doit pas
  -- corrompre silencieusement la référence, et le libellé reste lisible.
  expected jsonb not null default '[]'::jsonb,
  -- Tant que false, le call est ignoré par la mesure : une fiche non relue
  -- n'est que la sortie du pipeline recopiée, la compter reviendrait à
  -- mesurer le pipeline contre lui-même et à afficher 100 % partout.
  reviewed boolean not null default false,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists objection_eval_annotations_org_idx
  on objection_eval_annotations (organization_id, reviewed);

alter table objection_eval_annotations enable row level security;
