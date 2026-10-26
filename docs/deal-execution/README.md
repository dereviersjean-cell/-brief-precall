# Brief → Deal Execution System — point de reprise (26 octobre 2026)

**Statut : phase de réflexion. Rien n'est codé, et rien ne doit l'être sans feu vert explicite de Jean.**

Source : le deck « From meeting assistant to Deal Execution System » (Hubert × Jean, oct. 2026), fichier local `~/Downloads/Brief_Product_Strategy_Jean.pptx` — hors repo.
Quatre briques : **Stage Coach** (à renommer : on dit « expert », jamais « coach »), **Deal Memory**, **Next Best Action**, **Manager Intervention**. HubSpot uniquement en V1.

Les deux pages construites pendant la discussion sont ici, à ouvrir dans un navigateur :
- `questions-hubert.html` — les 17 questions envoyées à Hubert, avec une reco pour chacune (bouton « Copier le texte »).
- `propositions-vue-manager.html` — les propositions A / B / C de vue manager et la recommandation retenue.

Les pages publiées sur claude.ai ont été supprimées le 26/10 ; ces fichiers en sont la source.

## Déjà décidé avec Jean (23-26/10/2026)

- V1 sur HubSpot uniquement : deals, étapes et emails lus dans HubSpot.
- Le parcours de vente est propre à chaque organisation, nombre d'étapes libre. **Conséquence code** : R1/R2/R3 sont aujourd'hui figés dans `lib/meeting-stage.ts` (motifs sur le titre du rendez-vous + consignes par étape) ; il faudra le généraliser en parcours par org, étapes lues dans le pipeline HubSpot du client.
- Vue manager : **A** (les interventions du jour) en page d'accueil, **C** (le parcours étape par étape) en bandeau au-dessus, **B** (l'équipe, commercial par commercial) en second onglet. Pas de tableau en colonnes façon CRM (il refait HubSpot).
  - A : file des deals où le manager doit intervenir, triée par risque puis montant, chaque carte avec ses preuves tirées des calls et une intervention proposée ; boutons « Je m'en occupe » / « Confier » / « Plus tard » ; les deals qui avancent restent repliés. Même contenu par email le matin.
  - C : une ligne de chiffres par étape (nombre de deals, durée moyenne, taux de passage) ; un clic sur une étape filtre A.
  - B : une ligne par commercial (deals, à risque, part avec prochaine étape datée, point à travailler récurrent, avec les calls qui le prouvent).
- Le commercial reçoit les alertes sur ses deals en même temps que le manager.
- Aucune limite au nombre d'interventions affichées.
- Onglet Équipe : un commercial ne voit que sa propre ligne ; le manager voit toute l'équipe.
- Facturation des pilotes : mise de côté pour l'instant.

Jean peut revenir sur A + C + B ; tant qu'il ne l'a pas dit, c'est la cible.

## Questions ouvertes (transmises à Hubert le 26/10) — en attente de réponse

Format de réponse proposé à Hubert : « OK pour les recos sauf le n° X ».

### Bloquant pour démarrer

**Périmètre**
1. **Premier client pilote ?** Il faut un vrai HubSpot avec deals et calls enregistrés. — Reco : Oliverlist d'abord.
2. **Fonctionnalités actuelles** (scoring des calls, entraînement, devis, tâches, onglets Performance) : garder, geler ou retirer ? — Reco : on garde sans investir ; les tâches servent de base aux actions recommandées.
3. **Clients Pipedrive ou sans CRM** : restent sur le Brief actuel ? — Reco : oui, V1 réservée à HubSpot.

**Données et rattachement des calls aux deals**
4. **Comment les commerciaux enregistrent-ils leurs rendez-vous dans HubSpot ?** (synchro agenda, extension, rien.) C'est ce qui rend fiable ou non le lien call → deal. — Reco : le mesurer en lecture seule sur le HubSpot d'Oliverlist plutôt que le supposer. *Proposé à Jean, pas encore validé : ne pas lancer sans son feu vert.*
5. **Call sans deal dans HubSpot** (typiquement le 1er rendez-vous) ? — Reco : proposer au commercial de créer le deal en un clic.
6. **Ce que Brief écrit dans HubSpot en V1** ? — Reco : les notes (comme aujourd'hui) + la propriété « prochaine étape » ; les champs de qualification après.

**Méthode**
7. **Champs de la mémoire d'un deal** ? — Reco : socle fixe (besoin, impact, budget, décideur, processus de décision, échéance, concurrents, objections, engagements) + champs propres à chaque client.
8. **Qui configure le parcours et les critères de passage** ? — Reco : nous au setup en V1 (c'est le service vendu), puis le manager ajuste.
9. **Les critères de passage bloquent-ils quelque chose** ? — Reco : non, indicatifs, ils déclenchent une alerte.
10. **Règles de risque V1 et seuils** ? — Reco : 5-6 règles par défaut, seuils réglables par client : X jours sans prochaine étape datée ; décideur jamais rencontré à partir de la 2e étape ; deal à une étape plus longtemps que la moyenne ; objection qui revient sans réponse ; sentiment du prospect en baisse ; aucune activité depuis X jours.

### Peut attendre

11. **Canaux et rythme des alertes** — Reco : commercial après chaque call ; manager par email le matin, immédiatement si risque élevé ; Slack en plus si connecté.
12. **Effet des boutons « Je m'en occupe » / « Confier » / « Plus tard »** — Reco : chaque choix enregistré (alimente le ROI « deals remis en mouvement ») ; « Confier » prévient le commercial.
13. **Page d'accueil du commercial** — Reco : la page Brief actuelle devient « Aujourd'hui » (rendez-vous du jour, actions, alertes).
14. **Contrôle qualité au début** — Reco : deux semaines « à blanc », tout est généré et relu dans l'admin avant envoi.
15. **Mesure de réussite du pilote** — Reco : part des deals avec prochaine étape datée, délai moyen entre deux étapes, part des alertes suivies d'une action, comparés à une base tirée de l'historique HubSpot.
16. **RGPD** (emails des prospects, mémoire des deals : information, conservation, accord de traitement) — Reco : pas bloquant pour Oliverlist, bloquant avant tout pilote externe.
17. **Nom du produit** — Reco : on construit sous « Brief », le nom se tranche à part.

## Ce qui existe déjà dans le code et servira

- Intégration HubSpot par utilisateur (OAuth) : enrichissement des briefs, notes poussées après rendez-vous (cascade rendez-vous → deal → contact, par email du contact), tâches poussées + cron de synchro de statut, import des tâches HubSpot, import des deals gagnés comme références.
- `deal_outcomes` (win/loss) est vide et n'a jamais fonctionné — ne pas compter dessus.
- Analyse des calls (Recall), scoring, playbook, objections catégorisées : matière première des preuves et du « point à travailler ».

## Pour reprendre

1. Récupérer les réponses de Hubert aux 17 questions (au minimum les 10 bloquantes).
2. Les reporter ici et dans la mémoire Claude (`project-brief-deal-execution`).
3. Seulement ensuite, et sur feu vert de Jean : proposer un plan de V1 (pas de code avant).
