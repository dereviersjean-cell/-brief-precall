-- Limitation de débit partagée entre instances.
--
-- Le limiteur de lib/rate-limit.ts vit en mémoire. Sur Vercel, chaque
-- invocation peut atterrir sur une instance neuve : deux appels consécutifs ne
-- voient pas le même compteur. Il protège d'une rafale sur une instance chaude,
-- pas d'un client qui boucle ni d'un trafic réparti — et chaque appel non
-- bloqué est une facture Anthropic.
--
-- Une ligne par événement plutôt qu'un compteur incrémenté : une fenêtre
-- glissante se lit alors par un simple count sur created_at, sans verrou ni
-- lecture-modification-écriture concurrente.
create table if not exists rate_limit_events (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

-- L'index porte la requête de comptage (bucket + fenêtre) ET la purge.
create index if not exists rate_limit_events_bucket_time
  on rate_limit_events (bucket, created_at desc);
