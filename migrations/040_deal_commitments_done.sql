-- 040 — Engagements cochés « fait » sur la vue Deal (chantier Deal Execution), 03/11/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- La vue Deal (synthèse produit du 03/11/2026) liste les engagements du
-- dernier call avec un statut fait / à faire / en retard. Un rendez-vous
-- convenu se constate tout seul (le call suivant a eu lieu ou non) ; le reste
-- (« envoyer les deux propositions lundi ») se coche à la main. Une ligne par
-- engagement coché : le call qui l'a convenu, sa place dans la fiche et son
-- texte (une fiche régénérée qui réordonne ses engagements ne coche pas le
-- mauvais). Sans cette table, la vue s'affiche sans case à cocher.

create table if not exists deal_commitment_done (
  call_id uuid not null references calls(id) on delete cascade,
  item_index int not null,
  item_text text not null,
  deal_id uuid not null references deals(id) on delete cascade,
  done_by uuid references users(id) on delete set null,
  done_at timestamptz not null default now(),
  primary key (call_id, item_index)
);

create index if not exists deal_commitment_done_deal_idx on deal_commitment_done (deal_id);

alter table deal_commitment_done enable row level security;
