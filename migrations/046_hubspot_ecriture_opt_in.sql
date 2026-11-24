-- 046 — L'écriture dans le HubSpot du client devient un choix, 24/11/2026.
-- À exécuter dans le SQL editor Supabase (prod).
--
-- Demande de Jean : un client qui branche son HubSpot ne doit RIEN voir
-- s'écrire tant qu'il ne l'a pas décidé. Or `hubspot_auto_push` valait vrai
-- à la création de l'organisation, et l'envoi automatique, même sans aucune
-- propriété réglée, déposait quand même la note de synthèse sur le deal après
-- chaque call. Autrement dit : connecter suffisait à écrire.
--
-- Deux temps :
--   1. le défaut passe à faux — une nouvelle organisation n'écrit rien ;
--   2. les organisations qui n'ont JAMAIS rien réglé repassent à l'arrêt.
--      Elles n'avaient rien choisi. Celles qui ont réglé un mapping de
--      propriétés ou activé la mise à jour automatique, elles, ont décidé :
--      on ne leur retire pas ce qu'elles ont demandé.
--
-- Le réglage se donne ensuite dans Paramètres › Connexions, bloc « Écriture
-- dans votre HubSpot » (managers, fiche deal active).

alter table organizations alter column hubspot_auto_push set default false;

update organizations
   set hubspot_auto_push = false
 where coalesce(hubspot_auto_push, true)
   and (hubspot_field_mapping is null or hubspot_field_mapping::text in ('{}', 'null'))
   and (hubspot_autofill is null or coalesce((hubspot_autofill ->> 'active')::boolean, false) = false);
