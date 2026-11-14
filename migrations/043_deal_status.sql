-- 043 — Clôture d'un deal depuis Brief (décision D8 du questionnaire, 13/11/2026).
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Boutons « Gagné / Perdu / Abandonné » sur la page d'un deal. Un deal clos
-- sort de « Mes deals » et du Suivi des deals ; il peut être rouvert.
-- status : null = en cours, sinon 'gagne' | 'perdu' | 'abandonne'.
-- HubSpot n'est pas modifié : un deal clos dans HubSpot reste clos dans Brief
-- comme avant, cette colonne ne fait que s'y ajouter.
-- Sans cette migration : les boutons répondent « indisponible » et rien
-- d'autre ne change (lib/db.ts lit ces colonnes à part, sans faire tomber les
-- pages).

alter table deals add column if not exists status text check (status in ('gagne', 'perdu', 'abandonne'));
alter table deals add column if not exists closed_at timestamptz;
alter table deals add column if not exists closed_by uuid references users(id) on delete set null;
