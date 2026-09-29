-- 023 — Aide : l'email de suivi n'utilise pas de modèle par type de call (29/09/2026)
--
-- Les modèles de Paramètres › Templates emails ne servaient qu'aux emails des
-- tâches (masquées), jamais à l'email de suivi après un call. Décision de
-- Jean : on retire la promesse plutôt que de brancher les modèles. L'onglet
-- Templates emails a quitté les Paramètres dans le même changement.
-- Appliqué directement le 29/09/2026 ; fichier conservé pour l'historique.

update help_articles set content = $md$
Après chaque rendez-vous analysé, Brief rédige un email de suivi pour le prospect : un rappel des points qui comptent pour lui et la prochaine étape convenue, signé de votre prénom.

Ouvrez le call dans « Analyse rendez-vous », onglet **Email de suivi** : relisez, modifiez si besoin, puis envoyez-le directement depuis votre boîte Gmail ou Outlook.

Pour que l'email porte le bon nom d'entreprise, renseignez votre nom commercial dans Paramètres → Général.
$md$
where title = 'L''email de suivi après chaque call';
