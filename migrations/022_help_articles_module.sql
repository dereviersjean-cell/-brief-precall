-- 022 — Aide rattachée aux modules du parcours client (29/09/2026)
--
-- Un module fermé est invisible (lib/modules.ts) : l'aide ne doit donc ni le
-- nommer ni le décrire. Chaque article porte le module dont il parle ; NULL =
-- socle, toujours affiché. /help filtre selon les modules ouverts du client.
--
-- La migration réécrit aussi les articles existants :
--   - les articles mixtes (analyse d'un call, brief) sont recentrés sur le
--     socle ; objections, email de suivi, références et CRM ont leur article ;
--   - l'article Devis est supprimé (module masqué pour tous depuis juillet) ;
--   - Insights ne promet plus le win/loss (donnée vide, page reconstruite le
--     04/09) ; la navigation décrit la barre latérale actuelle ;
--   - les apostrophes doublées ('' au lieu de ') laissées par la saisie
--     initiale sont corrigées.
-- Rejouable sans doublon : colonne « if not exists », insertions gardées par
-- le titre.

alter table help_articles add column if not exists module text;

-- ─── Socle ──────────────────────────────────────────────────────────────────

update help_articles set category = 'Général', module = null, sort_order = 0, content = $md$
Brief prépare vos rendez-vous commerciaux et les débriefe à votre place, pour vous aider à conclure plus souvent.

- **Avant chaque rendez-vous** : un brief sur le prospect, son entreprise et vos échanges passés, prêt sans que vous ayez à le demander.
- **Après chaque rendez-vous en visio** : un assistant enregistre l'échange, puis Brief l'analyse — résumé, points clés, scores, prochaines étapes.

Brief est accessible uniquement sur invitation.
$md$ where id = '85ddad23-a838-45c8-b52e-26be90665bfb';

update help_articles set category = 'Général', module = null, sort_order = 1, content = $md$
La barre latérale à gauche donne accès à :

- **Brief** — vos prochains rendez-vous et leur brief
- **Analyse rendez-vous** — vos calls passés : scores, résumé, enregistrement, transcript
- **Performance** — l'évolution de vos scores
- **Équipe** — pour les managers : l'activité et les scores de chaque commercial
- **Aide** — cette page
- **Paramètres** — votre profil commercial, vos connexions (agenda…) et, pour les managers, la facturation

La cloche en haut de l'écran règle ce que vous recevez, et par quel canal.
$md$ where id = '957b7ac5-8dd4-4072-993e-92fbf0ac1dab';

update help_articles set module = null, sort_order = 0, content = $md$
Une fois votre agenda Google ou Microsoft connecté (Paramètres → Connexions), Brief repère vos rendez-vous externes à venir et prépare un brief pour chacun.

Le brief contient :

- Le contexte de l'entreprise du prospect : activité, actualités récentes, données légales
- Le contexte du contact : poste, parcours, historique de vos échanges si vous vous êtes déjà parlé
- Des arguments qui relient votre offre à ses besoins

Un rendez-vous absent de votre agenda ? Ajoutez-le depuis la page Brief avec « Ajouter un RDV ».

Pour des arguments vraiment ciblés, décrivez ce que vous vendez dans Paramètres → Général.
$md$ where id = '1284232e-97dd-47d1-b796-01cccfeca638';

update help_articles set module = null, sort_order = 0, content = $md$
Quand un rendez-vous en visio est enregistré par l'assistant, Brief l'analyse dans la foulée :

- **Un score par étape du rendez-vous**, et un score global sur 5
- **Un résumé** et le **ressenti** général de l'échange
- **Les points forts** et **les axes d'amélioration**
- **Les prochaines étapes** convenues
- **L'enregistrement et le transcript**, pour réécouter un passage

Retrouvez tout ça dans « Analyse rendez-vous », en cliquant sur un call. Un call sans parole (micro coupé, personne n'a parlé) n'est ni analysé ni compté dans vos moyennes.
$md$ where id = '51922e22-da21-4e53-a354-ebab2a5434e0';

update help_articles set module = null, sort_order = 1 where id = '7edee90d-bf39-4850-b1b5-0a129cf97a56';

update help_articles set module = null, sort_order = 0, content = $md$
Depuis **Équipe**, vous pouvez :

- Voir l'activité et les scores moyens de chaque commercial
- Ouvrir le détail d'un commercial : ses calls, ses scores par étape
- Réécouter ses calls pour le coacher
- Inviter un nouveau collaborateur
$md$ where id = 'ca15f819-9fe8-4b48-aa03-232b295ee9ee';

update help_articles set module = null, content = replace(content, '''''', '''')
where id = '0c5a2f4e-c614-4bdc-846d-c5f129a9f523';

-- ─── Modules du parcours ────────────────────────────────────────────────────

update help_articles set module = 'playbook', sort_order = 1, content = $md$
Le playbook est la grille sur laquelle chaque call de votre équipe est noté : découverte des besoins, qualification, traitement des objections… Il se trouve dans **Performance → Playbook**.

Chaque critère a :

- Un **libellé** et une **description**
- Un **poids**, son importance dans le score global
- Des **questions clés**, qui disent à l'IA ce qu'elle doit évaluer

Vous y définissez aussi les types de rendez-vous (R1, R2, R3) que Brief reconnaît à leur titre.

Le playbook est commun à toute l'équipe. Le modifier change la grille des prochains calls analysés ; les calls déjà notés gardent la grille de l'époque.
$md$ where id = 'fe23a554-2302-4262-a252-905a699d3e36';

update help_articles set title = 'Voir où l''équipe tient et où elle lâche', module = 'insights', sort_order = 0, content = $md$
**Équipe → Insights** montre ce que l'équipe maîtrise et ce qu'elle rate :

- **Ce qui bloque le plus** : les objections classées par nombre d'occasions ratées
- **Ce que l'équipe maîtrise** : les objections bien traitées, dont la réponse mérite d'être écrite dans le playbook
- **Les scores moyens** de l'équipe, critère par critère

**Performance → Analytics** complète la lecture avec la dynamique des échanges : temps de parole, questions posées, monologues.
$md$ where id = 'e267f394-5266-4918-99c4-d5ee983786c3';

update help_articles set category = 'Tâches', title = 'Comprendre les tâches automatiques', module = 'tasks', sort_order = 0, content = $md$
Brief crée des tâches de suivi après chaque call, et quand un email de suivi envoyé reste sans réponse.

Chaque tâche peut inclure un brouillon d'email, prêt à relire et envoyer. Si HubSpot est connecté, les tâches y sont créées aussi.
$md$ where id = '5705c3ff-663b-490f-8363-684c14050fd5';

-- Devis : module masqué pour tous depuis juillet 2026 (CLAUDE.md). S'il
-- revient, l'article sera à réécrire de toute façon.
delete from help_articles where id = '8843935d-360d-4c7b-be63-d8422ba85ac3';

insert into help_articles (category, title, visible_to, module, sort_order, content)
select 'Emails de suivi', 'L''email de suivi après chaque call', 'both', 'follow_up', 0, $md$
Après chaque rendez-vous analysé, Brief rédige un email de suivi pour le prospect : récapitulatif de l'échange et prochaines étapes, dans le ton de vos modèles.

Ouvrez le call dans « Analyse rendez-vous », onglet **Email de suivi** : relisez, modifiez si besoin, puis envoyez-le directement depuis votre boîte Gmail ou Outlook.

Les managers règlent les modèles par type de rendez-vous (découverte, présentation…) dans Paramètres → Templates emails.
$md$
where not exists (select 1 from help_articles where title = 'L''email de suivi après chaque call');

insert into help_articles (category, title, visible_to, module, sort_order, content)
select 'Objections', 'Les objections de vos prospects', 'both', 'objections', 0, $md$
Brief repère les objections soulevées par vos prospects pendant les calls, avec leur phrase exacte, et les range par catégorie.

- **Dans l'analyse d'un call** : chaque objection, la réponse apportée, et des cas similaires déjà traités par l'équipe.
- **Dans Performance → Objections** : les objections qui reviennent le plus, la façon dont elles sont traitées, et la réponse attendue par votre équipe.

Les managers définissent les catégories et les réponses attendues dans Paramètres → Objections.
$md$
where not exists (select 1 from help_articles where title = 'Les objections de vos prospects');

insert into help_articles (category, title, visible_to, module, sort_order, content)
select 'Brief pré-call', 'Les références clients dans vos briefs', 'both', 'references', 1, $md$
Brief cite dans chaque brief les clients de votre base les plus proches du prospect — même secteur, même problème — avec une phrase prête à dire en rendez-vous.

Votre base se gère dans Paramètres → Références : importez un document (PDF, Word, Excel) qui liste vos clients. Plus elle est complète, plus les rapprochements sont justes.
$md$
where not exists (select 1 from help_articles where title = 'Les références clients dans vos briefs');

insert into help_articles (category, title, visible_to, module, sort_order, content)
select 'CRM', 'Brief et votre CRM', 'both', 'crm', 0, $md$
Connectez HubSpot ou Pipedrive dans Paramètres → Connexions.

- **Après chaque call** : les points clés sont ajoutés dans votre CRM, sur le rendez-vous, l'affaire ou le contact correspondant.
- **Avant chaque rendez-vous** : le brief tient compte de ce que votre CRM sait déjà du prospect.
$md$
where not exists (select 1 from help_articles where title = 'Brief et votre CRM');

insert into help_articles (category, title, visible_to, module, sort_order, content)
select 'Entraînement', 'S''entraîner sur les objections', 'both', 'training', 0, $md$
**Performance → Entraînement** vous met face à un prospect virtuel qui reprend les objections réellement rencontrées par votre équipe. Vous répondez à voix haute (Chrome, Edge, Safari) ou par écrit, puis Brief vous débriefe.

Vous pouvez aussi lancer un entraînement depuis une objection, dans l'analyse d'un call. Vos sessions restent personnelles : votre manager ne voit que leur nombre et les résultats d'ensemble.
$md$
where not exists (select 1 from help_articles where title = 'S''entraîner sur les objections');

insert into help_articles (category, title, visible_to, module, sort_order, content)
select 'Notifications', 'Le bilan de la semaine par email', 'both', 'weekly_digest', 0, $md$
Chaque semaine, Brief vous envoie un résumé de vos calls et de l'évolution de vos scores — et, pour les managers, de ceux de l'équipe.

Choisissez de le recevoir le vendredi à 18 h ou le lundi à 8 h, ou de le couper, depuis la cloche en haut de l'écran.
$md$
where not exists (select 1 from help_articles where title = 'Le bilan de la semaine par email');

insert into help_articles (category, title, visible_to, module, sort_order, content)
select 'Notifications', 'Recevoir Brief sur Slack', 'both', 'slack', 1, $md$
Connectez Slack dans Paramètres → Connexions : vos briefs et vos analyses de calls arrivent en message privé.

Choisissez ce que vous y recevez depuis la cloche en haut de l'écran.
$md$
where not exists (select 1 from help_articles where title = 'Recevoir Brief sur Slack');
