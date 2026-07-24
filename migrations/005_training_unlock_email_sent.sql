-- 005 — Flag de succès d'envoi sur les demandes de déblocage. Sans ça, la
-- déduplication 24h (hasRecentTrainingUnlockRequest) masquait un nouveau
-- clic même si le tout premier email n'était jamais parti (ex.
-- ADMIN_NOTIFICATION_EMAIL pas encore configurée au moment du 1er clic).
alter table training_unlock_requests add column if not exists email_sent boolean not null default false;
