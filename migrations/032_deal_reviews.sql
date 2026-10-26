-- 032 — Vue manager : « Vu » / « Plus tard » sur un deal (chantier Deal Execution, étape 4), 27/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Chaque choix est gardé (décision du 26/10/2026 : il servira à mesurer
-- l'effet des alertes). « Vu » retire le deal de la file jusqu'à sa
-- prochaine fiche ; « Plus tard » jusqu'au lendemain. Une ligne par deal et
-- par manager, remplacée à chaque clic ; l'historique des clics reste dans
-- deal_review_events.

create table if not exists deal_reviews (
  deal_id uuid not null references deals(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('seen', 'later')),
  reviewed_at timestamptz not null default now(),
  primary key (deal_id, user_id)
);

create table if not exists deal_review_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('seen', 'later')),
  alert_rules text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table deal_reviews enable row level security;
alter table deal_review_events enable row level security;
