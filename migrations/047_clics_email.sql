-- 047 — Clics des liens de campagne, 26/11/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Pourquoi une table plutôt que l'outil d'analyse d'audience : les liens des
-- campagnes Brief portent `?utm_campaign=c1&utm_content=mail2&r=<id du
-- contact>` (séquenceur Apps Script, .claude/scripts/briefsend/gas/Code.js).
-- Vercel Web Analytics ne filtre les UTM qu'avec l'option payante « Plus »,
-- et ne retient AUCUN paramètre libre : `r` y disparaît, donc impossible de
-- savoir QUI a cliqué — ce qui est précisément ce qu'on cherche.
--
-- La route /go écrit une ligne ici puis redirige vers la page d'accueil. Le
-- prospect ne voit rien, et l'identifiant de contact ne suit pas dans son
-- navigateur.
--
-- Pas d'adresse IP : on sait qui est le contact par `contact_ref`, l'IP
-- n'apprendrait rien de plus et alourdirait le traitement. `user_agent` est
-- gardé pour une raison précise : les passerelles de sécurité des messageries
-- ouvrent les liens à la place du destinataire. Sans lui, un mail jamais lu
-- compterait comme un clic, et Jean rappellerait quelqu'un qui n'a rien fait.

create table if not exists email_clicks (
  id uuid primary key default gen_random_uuid(),
  -- `r` du lien : l'identifiant de la ligne dans l'onglet Contacts du
  -- classeur « Brief · séquenceur ». Texte et non entier : le jour où le
  -- séquenceur change de clé, rien à migrer.
  contact_ref text,
  campaign text,          -- c1 | c2 | c3
  mail_step smallint,     -- 1 | 2 | 3, extrait de utm_content
  utm_source text,
  utm_medium text,
  referrer text,
  user_agent text,
  -- Vrai quand le user_agent trahit une passerelle de sécurité ou un robot
  -- (lib/campaign-click.ts, looksAutomated). La ligne est gardée et marquée,
  -- jamais jetée : un faux positif effacerait un vrai clic. Pour ne compter
  -- que les humains : « where automated is false ».
  automated boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists email_clicks_contact_ref_idx on email_clicks (contact_ref);
create index if not exists email_clicks_created_at_idx on email_clicks (created_at desc);

-- Rien de ce qui est ici ne doit être lisible par le client anon : la table
-- n'est écrite et lue que par le service role (lib/db.ts).
alter table email_clicks enable row level security;
