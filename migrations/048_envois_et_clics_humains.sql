-- 048 — Envois de campagne, et la vue qui en déduit les vrais clics.
-- À exécuter dans le SQL editor Supabase (prod). Suite de 047.
--
-- Pourquoi (26/11/2026, le jour même) : dès la mise en service de /go,
-- 9 clics sont arrivés en 9 minutes, tous marqués « humains ». Ils ne
-- l'étaient pas :
--   - la même fiche cliquait deux fois à 4 secondes d'écart, avec DEUX
--     versions de Chrome différentes (151 puis 155) ;
--   - Chrome 113, 151, 153, 154 et 155 mélangés sur du Windows, ce qu'un
--     groupe de sept personnes ne produit jamais ;
--   - exactement trois clics par campagne, là où l'humain est grumeleux ;
--   - tout dans les neuf minutes suivant l'envoi.
-- Ce sont les passerelles de sécurité des messageries, qui ouvrent les liens
-- à la place du destinataire. Elles se présentent comme un Chrome ordinaire :
-- aucune liste de robots ne les attrapera. Le seul signal qui les trahit est
-- le DÉLAI depuis l'envoi — d'où cette table.

create table if not exists email_sends (
  id uuid primary key default gen_random_uuid(),
  contact_ref text not null,     -- la ligne de l'onglet Contacts, comme email_clicks.contact_ref
  campaign text,
  mail_step smallint,
  sent_at timestamptz not null,  -- l'heure d'envoi vue par le séquenceur
  created_at timestamptz not null default now()
);

create index if not exists email_sends_lookup_idx
  on email_sends (contact_ref, campaign, mail_step, sent_at desc);

alter table email_sends enable row level security;

-- Les clics qu'on peut raisonnablement attribuer à une personne.
--
-- Trois filtres, du plus sûr au plus grossier :
--   1. `automated` : le user-agent se déclare robot ou passerelle connue ;
--   2. moins de 2 minutes après l'envoi : une personne n'ouvre pas sa
--      messagerie, ne lit pas et ne clique pas en deux minutes. Une passerelle,
--      si. Sans envoi connu, on garde le clic plutôt que de le jeter ;
--   3. deux clics de la même fiche à moins d'une minute avec des user-agents
--      différents : une seule personne n'a pas deux navigateurs. Les deux sont
--      écartés — on ne sait pas lequel serait le bon, et se tromper coûte plus
--      cher ici que de perdre une ligne.
--
-- `security_invoker` : la vue ne doit pas contourner la RLS de ses tables.
create or replace view clics_humains
with (security_invoker = on) as
select c.id,
       c.created_at,
       c.contact_ref,
       c.campaign,
       c.mail_step,
       c.user_agent,
       s.sent_at,
       round(extract(epoch from (c.created_at - s.sent_at))) as delai_secondes
from email_clicks c
left join lateral (
  select e.sent_at
  from email_sends e
  where e.contact_ref = c.contact_ref
    and e.campaign is not distinct from c.campaign
    and e.mail_step is not distinct from c.mail_step
    and e.sent_at <= c.created_at
  order by e.sent_at desc
  limit 1
) s on true
where c.automated is false
  and (s.sent_at is null or c.created_at >= s.sent_at + interval '2 minutes')
  and not exists (
    select 1
    from email_clicks d
    where d.contact_ref = c.contact_ref
      and d.id <> c.id
      and d.user_agent is distinct from c.user_agent
      and d.created_at between c.created_at - interval '60 seconds'
                           and c.created_at + interval '60 seconds'
  );
