-- Expiration du jeton d'accès Google (15/10/2026). Le renouvellement coûte
-- ~1 s (mesuré) et se faisait dans le callback de session, donc sur la page
-- ou l'API qui tombait dessus, une fois par heure — et plusieurs fois quand
-- plusieurs appels partaient en même temps. Avec la date d'expiration en
-- base, un jeton renouvelé par un appel sert à tous les autres.
alter table users add column if not exists google_token_expires_at timestamptz;
