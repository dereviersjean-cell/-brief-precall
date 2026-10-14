-- Connexion et création de compte sans SSO (14/10/2026) : email + mot de
-- passe, ou code à usage unique envoyé par email.
--
-- Le mot de passe n'est jamais stocké : seule son empreinte scrypt
-- (lib/password.ts). Un compte Google/Microsoft n'en a pas ; il peut en
-- définir un en passant par un code (preuve qu'il reçoit les emails).
alter table users add column if not exists password_hash text;

-- Codes à 6 chiffres, valables 10 minutes, 5 essais au plus, à usage unique.
-- Le code lui-même n'est pas stocké, seulement son empreinte.
create table if not exists auth_email_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_email_codes_email_created_idx on auth_email_codes (email, created_at desc);

-- Comme toutes les tables : RLS sans policy, accès par service_role seulement.
alter table auth_email_codes enable row level security;
