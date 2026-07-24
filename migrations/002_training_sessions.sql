-- 002 — Bloc Entraînement (roleplay IA sur les objections mal traitées)
-- À exécuter manuellement dans le SQL editor Supabase (prod) AVANT de
-- déployer le code qui référence cette table, puis committer ici.

-- Une session = un scénario (l'objection travaillée + le persona du prospect
-- IA), le transcript du roleplay, et le débrief noté généré à la fin.
-- Accès service_role uniquement (RLS activé sans policies, comme partout).
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  scenario jsonb not null,
  transcript jsonb not null default '[]'::jsonb,
  debrief jsonb,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists training_sessions_user_idx
  on training_sessions (user_id, created_at desc);
create index if not exists training_sessions_org_idx
  on training_sessions (organization_id);

alter table training_sessions enable row level security;
