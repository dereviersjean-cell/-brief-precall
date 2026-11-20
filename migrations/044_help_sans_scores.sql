-- Base de connaissance : fin de la note sur 5, du playbook de scoring et des
-- sections Performance / Équipe (20/11/2026).
--
-- Le site public a été remis à jour sur le produit les 18 et 19/11/2026 ; les
-- articles d'aide, eux, décrivaient encore l'app d'octobre : un score par
-- étape et un score global sur 5 (retirés le 05/11/2026), la grille du
-- playbook (remplacée par la page Méthode le 05/11/2026), les entrées
-- « Performance » et « Équipe » de la barre latérale (sorties le 27/10/2026)
-- et un accès « uniquement sur invitation » (inscription libre depuis le
-- 05/10/2026).
--
-- Même méthode que les migrations 022, 023 et 026 : des `replace` sur des
-- fragments précis, gardés par un `like`. Les articles sont éditables depuis
-- l'admin — une réécriture complète de `content` écraserait une édition de
-- Jean, donc on ne remplace en bloc que l'article dont le sujet lui-même a
-- disparu.

-- 1. Analyse d'un call : plus de score, l'avancement du deal à la place.
update help_articles set content = replace(
  content,
  '**Un score par étape du rendez-vous**, et un score global sur 5',
  '**Où en est le deal** : l''étape atteinte, et ce qui manque pour avancer')
  where content like '%et un score global sur 5%';
update help_articles set content = replace(content, 'ni compté dans vos moyennes', 'ni compté dans vos statistiques')
  where content like '%ni compté dans vos moyennes%';

-- 2. Entraînement : il n'est plus sous un onglet « Performance ».
update help_articles set content = replace(
  content,
  '**Performance → Entraînement** vous met face',
  'L''**entraînement** vous met face')
  where content like '%**Performance → Entraînement** vous met face%';

-- 3. Gérer son équipe : activité et deals, plus de scores moyens.
update help_articles set content = replace(
  content,
  'Voir l''activité et les scores moyens de chaque commercial',
  'Voir l''activité de chaque commercial : ses rendez-vous et ses deals en cours')
  where content like '%les scores moyens de chaque commercial%';
update help_articles set content = replace(
  content,
  'Ouvrir le détail d''un commercial : ses calls, ses scores par étape',
  'Ouvrir le détail d''un commercial : ses calls et l''avancement de ses deals')
  where content like '%ses calls, ses scores par étape%';

-- 4. « Configurer le playbook de scoring » : le sujet a disparu avec la
--    grille. L'article devient celui de la page Méthode (sous-titre de
--    app/methode/page.tsx). Seul cas de réécriture complète.
update help_articles set
  title = 'Régler la méthode de vente de l''équipe',
  content = '
  La page **Méthode** dit ce que l''équipe doit obtenir à chaque étape, comment répondre aux objections, et quels clients citer. C''est la référence sur laquelle Brief s''appuie pour analyser un rendez-vous.

  - **Les objectifs par étape commerciale** : ce qu''un rendez-vous doit avoir obtenu pour que le deal avance, étape par étape. Brief reconnaît le rang du rendez-vous (R1, R2 et plus) à son titre et à l''historique du deal.
  - **Les objections** : celles que l''équipe rencontre vraiment, et la réponse attendue pour chacune.
  - **Les références clients** : les clients que vos commerciaux peuvent citer, avec le niveau de preuve de chacun.

  La méthode est commune à toute l''équipe ; seuls les managers la modifient. La changer s''applique aux prochains rendez-vous analysés.
  '
  where id = 'fe23a554-2302-4262-a252-905a699d3e36' and content like '%grille sur laquelle chaque call%';

-- 5. Qu'est-ce que Brief : plus de scores, et l'inscription est libre.
update help_articles set content = replace(
  content,
  'résumé, points clés, scores, prochaines étapes',
  'résumé, points clés, prochaines étapes, et l''avancement du deal')
  where content like '%points clés, scores, prochaines étapes%';
update help_articles set content = replace(
  content,
  'Brief est accessible uniquement sur invitation.',
  'L''inscription est libre : tout nouveau compte prépare ses briefs (10 par jour). L''analyse des rendez-vous et le suivi des deals se mettent en place avec l''équipe Brief.')
  where content like '%accessible uniquement sur invitation%';

-- 6. Navigation : la barre latérale du 27/10/2026, sans Performance ni Équipe.
update help_articles set content = '
  La barre latérale à gauche donne accès à :

  - **Brief** — vos prochains rendez-vous et leur brief
  - **Analyse rendez-vous** — vos calls passés, avec le détail de chacun
  - **Deals** — vos deals en cours, leur état et la prochaine action à mener
  - **Suivi des deals** — pour les managers : les deals de l''équipe, ceux à reprendre d''abord
  - **Méthode** — ce que l''équipe doit obtenir à chaque étape, les objections, les références clients
  - **Aide** — cette page
  - **Paramètres** — votre profil commercial, vos connexions (agenda, CRM…) et, pour les managers, la facturation

  Le menu ne montre que ce qui est ouvert pour votre organisation : un nouveau compte n''y voit d''abord que Brief.

  La cloche en haut de l''écran règle ce que vous recevez, et par quel canal.
  '
  where id = '957b7ac5-8dd4-4072-993e-92fbf0ac1dab' and content like '%**Performance** — l''évolution de vos scores%';

-- 7. Insights : plus de scores par critère, plus de chemin « Performance → ».
update help_articles set content = replace(
  content,
  '**Équipe → Insights** montre',
  'Les **insights de l''équipe** montrent')
  where content like '%**Équipe → Insights** montre%';
update help_articles set content = replace(
  content,
  '**Les scores moyens** de l''équipe, critère par critère',
  '**Les réponses attendues** à écrire dans la Méthode pour toute l''équipe')
  where content like '%**Les scores moyens** de l''équipe%';
update help_articles set content = replace(
  content,
  '**Performance → Analytics** complète la lecture',
  'Les **analytics** complètent la lecture')
  where content like '%**Performance → Analytics** complète la lecture%';

-- 8. Bilan de la semaine : les deals, plus les scores.
update help_articles set content = replace(
  content,
  'un résumé de vos calls et de l''évolution de vos scores',
  'un résumé de vos calls et de l''avancement de vos deals')
  where content like '%l''évolution de vos scores%';

-- 9. Objections : la section s'appelle Méthode depuis le 05/11/2026.
update help_articles set content = replace(
  content,
  '**Dans Playbook & objections → Objections rencontrées**',
  '**Dans Méthode, section Objections**')
  where content like '%Playbook & objections → Objections rencontrées%';
update help_articles set content = replace(
  content,
  'dans Playbook & objections → Réponses aux objections',
  'dans Méthode, section Objections')
  where content like '%Playbook & objections → Réponses aux objections%';

-- 10. Catégorie : « Playbook » n'existe plus comme section.
update help_articles set category = 'Équipe & Méthode' where category = 'Équipe & Playbook';

-- 11. Les tâches automatiques ont été retirées du produit le 03/11/2026 et le
--     module `tasks` n'existe plus dans lib/modules.ts : l'article n'était
--     plus affiché à personne (le filtre par module l'écartait toujours).
delete from help_articles where id = '5705c3ff-663b-490f-8363-684c14050fd5' and module = 'tasks';
