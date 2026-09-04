-- 013 — Date et heure réelles du rendez-vous sur le brief.
-- À exécuter dans le SQL editor Supabase (prod) avant de déployer le code
-- qui lit cette colonne, puis committer ici.

-- La page du brief affichait `new Date()` — l'heure à laquelle on ouvrait la
-- page, pas celle du rendez-vous. Sur un RDV de 9h00 consulté à 16h56, elle
-- annonçait 16h56 (constaté le 04/09/2026). La date n'était stockée nulle
-- part : les événements d'agenda vivent chez Google/Microsoft, et
-- `meetingStartsAt` ne servait qu'à l'email de notification, sans être
-- conservé.
--
-- Null pour tous les briefs existants : l'affichage n'écrit alors aucune
-- date, plutôt que d'en inventer une.
alter table briefs
  add column if not exists meeting_starts_at timestamptz;
