-- 017 — Supprimer les policies qui rouvrent les tables à la clé publique.
-- À exécuter dans le SQL editor Supabase (prod), APRÈS la 016.
--
-- La 016 a activé RLS sur les 39 tables, mais 5 restaient lisibles avec la
-- seule clé anon (vérifié le 16/09/2026) : admin_config, briefs, import_jobs,
-- user_profiles et users — donc, de nouveau, les jetons Google. Activer RLS
-- ne suffit pas quand une policy permissive existe déjà : ces tables portent
-- une règle « lecture autorisée à tous », héritée de leur création via
-- l'interface Supabase, qui n'avait aucun effet visible tant que RLS était
-- désactivée.
--
-- Aucune policy n'est nécessaire à l'application : tout passe par
-- service_role, qui contourne RLS (voir la 016). On les supprime donc toutes,
-- plutôt que de trier — une policy conservée par erreur, c'est la faille qui
-- reste ouverte.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Contrôle 1 : doit renvoyer 0 ligne.
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Contrôle 2 : rls_active doit rester true partout.
SELECT tablename, rowsecurity AS rls_active
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;
