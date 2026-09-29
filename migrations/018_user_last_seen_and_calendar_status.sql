-- 018 — Dernière connexion d'un utilisateur, et état réel de son agenda.
-- À exécuter dans le SQL editor Supabase (prod). Le code déployé fonctionne
-- AVANT la migration (les deux lectures et les écritures échouent en
-- silence) : il ne s'en sert qu'une fois les colonnes présentes.

-- Dernière connexion. L'écran Équipe n'affichait que la « dernière
-- activité » (dernier brief, dernier call) : un commercial qui se connecte
-- sans rien générer semblait absent depuis des semaines (constaté le
-- 29/09/2026). Mise à jour au plus toutes les 10 minutes par lib/auth.ts.
alter table users
  add column if not exists last_seen_at timestamptz;

-- État de l'agenda chez Recall, relevé par la synchronisation des 5 minutes.
-- Brief tenait un agenda pour « connecté » dès que recall_calendar_id était
-- renseigné, sans jamais demander à Recall : celui d'un commercial est resté
-- coupé du 27/07 au 29/09/2026 (jeton Google expiré), affiché « connecté »,
-- sans aucun call enregistré. Valeurs : celles de Recall (connected,
-- connecting, disconnected). recall_calendar_status_at = date du dernier
-- CHANGEMENT d'état, pas du dernier relevé : c'est la date de la coupure.
alter table users
  add column if not exists recall_calendar_status text,
  add column if not exists recall_calendar_status_at timestamptz;
