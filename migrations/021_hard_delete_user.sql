-- 021 — Suppression définitive d'un utilisateur, en UNE transaction.
-- À exécuter dans le SQL editor Supabase (prod). Tant qu'elle n'est pas
-- passée, « Supprimer définitivement » refuse proprement (sans rien effacer)
-- au lieu de supprimer à moitié.
--
-- Pourquoi (29/09/2026) : hardDeleteUser (lib/db.ts) supprimait table par
-- table depuis l'application, sans transaction, et n'en traitait que 10 sur
-- les 26 qui référencent un utilisateur — tâches, calls d'entraînement,
-- préférences, devis, rendez-vous manuels, statistiques de calls oubliés, et
-- des contacts effacés avant les tâches et devis qui y renvoient. Selon les
-- contraintes, la suppression échouait au milieu (calls et briefs déjà
-- effacés, compte toujours là) ou laissait des orphelins.
--
-- Ici tout se fait dans la fonction, donc dans une seule transaction : une
-- erreur n'importe où annule tout. Ordre : enfants avant parents. Les
-- données d'ORGANISATION créées par l'utilisateur (modèles d'email,
-- playbooks, connexion Notion, annotations de calibrage) sont conservées,
-- seule la référence à leur auteur est vidée.

create or replace function hard_delete_user(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  -- Calls et tout ce qui en dépend.
  delete from call_analysis where call_id in (select id from calls where user_id = p_user_id);
  delete from call_objections where call_id in (select id from calls where user_id = p_user_id);
  delete from objection_eval_annotations where call_id in (select id from calls where user_id = p_user_id);
  delete from call_analytics where user_id = p_user_id
    or call_id in (select id from calls where user_id = p_user_id);
  delete from calls where user_id = p_user_id;

  -- Devis.
  delete from quote_lines where quote_id in (select id from quotes where user_id = p_user_id)
    or offer_id in (select id from quote_offers where user_id = p_user_id);
  delete from quotes where user_id = p_user_id;
  delete from quote_offers where user_id = p_user_id;
  delete from quote_settings where user_id = p_user_id;

  -- Tâches, puis leurs modèles.
  delete from tasks where user_id = p_user_id;
  delete from task_templates where user_id = p_user_id;

  -- Entraînement.
  delete from training_sessions where user_id = p_user_id;
  delete from training_unlock_requests where user_id = p_user_id;

  -- Briefs (un call d'un AUTRE utilisateur qui y renverrait perd juste le lien).
  update calls set brief_id = null where brief_id in (select id from briefs where user_id = p_user_id);
  delete from briefs where user_id = p_user_id;

  -- Contacts (idem pour les tâches et devis d'autres utilisateurs).
  update tasks set contact_id = null where contact_id in (select id from contacts where user_id = p_user_id);
  update quotes set contact_id = null where contact_id in (select id from contacts where user_id = p_user_id);
  delete from contacts where user_id = p_user_id;

  -- Réglages et données propres à l'utilisateur.
  delete from client_references where user_id = p_user_id;
  delete from crm_connections where user_id = p_user_id;
  delete from digest_preferences where user_id = p_user_id;
  delete from notification_preferences where user_id = p_user_id;
  delete from email_template_overrides where user_id = p_user_id;
  delete from import_jobs where user_id = p_user_id;
  delete from manual_meetings where user_id = p_user_id;
  delete from scheduled_meetings where user_id = p_user_id;
  delete from user_profiles where user_id = p_user_id;
  delete from admin_impersonation_logs where target_user_id = p_user_id;

  -- Données d'organisation : on garde, on efface l'auteur.
  update email_templates set created_by = null where created_by = p_user_id;
  update playbooks set created_by = null where created_by = p_user_id;
  update playbook_notion_connections set connected_by_user_id = null where connected_by_user_id = p_user_id;
  update objection_eval_annotations set reviewed_by = null where reviewed_by = p_user_id;

  -- Liens d'équipe et invitations.
  delete from manager_commercial_links where manager_id = p_user_id or commercial_id = p_user_id;
  update users set invited_by = null where invited_by = p_user_id;

  delete from users where id = p_user_id;
end;
$$;

-- Appelable seulement avec la clé service (l'admin de Brief), jamais depuis
-- le navigateur d'un utilisateur.
revoke execute on function hard_delete_user(uuid) from public, anon, authenticated;
