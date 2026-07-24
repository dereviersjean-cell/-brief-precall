-- 003 — Entraînement devient un module additionnel (upsell), désactivé par
-- défaut. À exécuter manuellement dans le SQL editor Supabase (prod) AVANT
-- de déployer le code qui référence cette colonne — repli fail-closed
-- (verrouillé) côté code si la colonne n'existe pas encore, donc rien ne
-- casse, mais le module reste verrouillé pour tout le monde tant que ce
-- n'est pas exécuté.

alter table organizations add column if not exists training_enabled boolean not null default false;

-- Oliverlist reste débloqué pour continuer à tester le module en interne.
update organizations set training_enabled = true where id = '5a90c843-b6c2-4be2-ab64-7469216253d0';
