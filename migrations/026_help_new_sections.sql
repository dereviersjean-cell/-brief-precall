-- Aide : Playbook, Objections et Références ont quitté Performance et les
-- Paramètres pour leurs propres pages (15/10/2026). Les articles citaient les
-- anciens emplacements.
update help_articles set content = replace(content, '**Performance → Playbook**', '**Playbook & objections → Grille de notation**')
  where content like '%**Performance → Playbook**%';
update help_articles set content = replace(content, 'Dans Performance → Objections', 'Dans Playbook & objections → Objections rencontrées')
  where content like '%Dans Performance → Objections%';
update help_articles set content = replace(content, 'dans Paramètres → Objections', 'dans Playbook & objections → Réponses aux objections')
  where content like '%dans Paramètres → Objections%';
update help_articles set content = replace(content, 'dans Paramètres → Références', 'dans Références clients (menu de gauche)')
  where content like '%dans Paramètres → Références%';
