-- 016 — Fermer la lecture des tables par la clé publique (anon).
-- À exécuter dans le SQL editor Supabase (prod). Aucun déploiement de code
-- n'est nécessaire : ce correctif est entièrement côté base.
--
-- Constat du 15/09/2026, vérifié par requête réelle avec la seule clé
-- NEXT_PUBLIC_SUPABASE_ANON_KEY (qui, par conception, se retrouve dans le
-- code envoyé au navigateur) : 14 tables répondaient avec leurs données,
-- dont `users` — donc `google_access_token` et `google_refresh_token`, qui
-- permettent d'envoyer des emails depuis le Gmail d'un utilisateur et de
-- modifier son agenda. Aussi lisibles : briefs, call_objections (les paroles
-- des prospects), tasks, user_profiles, admin_config (les prompts),
-- playbooks, playbook_dimensions, playbook_criteria, email_templates,
-- email_template_overrides, notification_preferences, billing_events,
-- import_jobs, help_articles.
--
-- Pourquoi activer RLS sans écrire une seule policy : tout l'accès applicatif
-- passe par `supabaseAdmin` (service_role), et le rôle service_role contourne
-- RLS. Le middleware interroge PostgREST avec cette même clé de service. Le
-- dernier appel qui utilisait encore le client anon (findSimilarReferences,
-- lib/embeddings.ts) est passé sur supabaseAdmin le 15/09/2026 — c'est
-- d'ailleurs la RLS de client_references qui lui renvoyait une liste vide.
-- Donc : RLS activée + aucune policy = plus rien pour anon, rien ne change
-- pour l'application.
--
-- Si une fonctionnalité future doit lire la base depuis le navigateur, elle
-- aura besoin d'une policy explicite — ce qui est justement le comportement
-- attendu, plutôt qu'une table ouverte par défaut.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Contrôle : la colonne rls_active doit valoir true sur TOUTES les lignes.
SELECT tablename, rowsecurity AS rls_active
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;
