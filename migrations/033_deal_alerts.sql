-- 033 — Alertes par email sur les deals (chantier Deal Execution, étape 5), 27/10/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Décisions du 26/10/2026 (reco 11, validée par Hubert) : le commercial reçoit
-- les alertes de son call dès que la fiche deal est prête ; le manager reçoit
-- la file des deals chaque matin, et tout de suite quand le risque est élevé.
--
-- Interrupteur séparé de deal_memory_enabled : la fiche peut se générer
-- après chaque call sans qu'aucun email ne parte. Éteint par défaut, partout
-- (Oliverlist compris) : on l'allume à la main quand les destinataires sont
-- les bons.

alter table organizations add column if not exists deal_alerts_enabled boolean not null default false;
