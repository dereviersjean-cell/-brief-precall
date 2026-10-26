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

## Réponses de Hubert (reçues le 26/10/2026)

Hubert a répondu à 8 des 17 questions (n° 1, 5, 6, 8, 10, 11, 12, 13). Restent sans réponse : 2, 3, 4, 7, 9, 14, 15, 16, 17.

- **1. Pilote** : pas d'avis arrêté. Jean proposait un HubSpot de test rempli avec un export du HubSpot d'Oliverlist. Hubert propose de ne laisser aucune trace dans le HubSpot d'Oliverlist : exporter des rendez-vous et des calls depuis Claap et s'en servir comme base de travail, sans passer par HubSpot au début. **À trancher par Jean.**
- **5. Call sans deal** : il existe toujours quelque chose dans HubSpot dès qu'un rendez-vous est pris (chez Oliverlist : un contact et une entreprise). On rattache le call à ce qui existe déjà, aidé par le titre du rendez-vous (chez Oliverlist, R1 ≈ « Présentation Oliverlist », R2 ≈ « Oliverlist x <société> »). **On ne crée pas de deal automatiquement au premier call.**
- **6. Ce que Brief écrit dans HubSpot** : remplir les champs de qualification selon la méthode du client (BANT, MEDDIC, MEDDPICC…) et dans les propriétés que le client utilise déjà ; une synthèse claire du call ; les prochaines étapes mises en avant ; les points de friction, objections et points d'attention. Brief s'adapte au HubSpot du client, pas l'inverse. Référence : https://www.coffee.ai/articles/implement-meddic-hubspot-crm-2026/
- **8. Configuration du parcours** : définie obligatoirement au setup, avec nous et le manager (cycle de vente, proposition de valeur, process commercial, règles qui varient d'une étape à l'autre). Ensuite, le manager doit pouvoir modifier les règles lui-même dans l'application.
- **10. Règles de risque** : les 6 règles proposées sont une bonne base. Hubert ajoute : concurrent évoqué ; objection cachée ou mal traitée ; besoin d'apporter de la preuve sociale ; besoin de faire entrer un autre interlocuteur (finance, cofondateur, DSI…). Seuils propres au playbook de chaque client.
- **11. Canaux et rythme des alertes** : d'accord avec la reco.
- **12. Le manager « reprend la main »** : jamais dans Brief. Brief alerte le manager ; il fait ce qu'il veut ensuite (parler au commercial, rejoindre un call, rien). Le commercial reste propriétaire du deal.
- **13. Page d'accueil du commercial** : Hubert demande de quelle vue on parle (réponse à lui faire, voir plus bas).

### Tranché par Jean le 26/10/2026 (soir)

- **Pilote** : d'abord des tests sur des extraits de calls Claap, ensuite sur un compte HubSpot de test. Rien sur le HubSpot d'Oliverlist.
- **3. Clients Pipedrive ou sans CRM** : restent sur le Brief actuel. V1 réservée à HubSpot.
- **4. Rattachement call → deal** : Brief connaît le rendez-vous par l'agenda connecté. Le lien au deal se fait déjà dans le code (`findHubSpotDealForEmail`, `lib/crm/hubspot.ts`) : email du prospect → contact HubSpot → deals ouverts associés, le plus récent retenu. Les commerciaux n'ont donc rien à saisir dans HubSpot. Cas qui restent à traiter : prospect absent de HubSpot ou invité sous une autre adresse, contact lié à plusieurs deals ouverts (le plus récent n'est pas forcément le bon), pas encore de deal (repli sur l'entreprise, cf. réponse 5).
- **7. Champs de la mémoire d'un deal** : le socle proposé + les champs MEDDIC de l'article envoyé par Hubert (fusionnés, voir la liste ci-dessous).
- **9. Critères de passage** : indicatifs, ils ne bloquent rien (l'article recommande des étapes bloquantes ; on ne le suit pas sur ce point).
- **2. Fonctionnalités actuelles** (validé par Jean) : on ne supprime rien de visible. Garder et réutiliser : brief avant rendez-vous (devient une partie de « Aujourd'hui »), analyse des calls, objections, références clients (règle « preuve sociale »). Garder sans investir : email de suivi, Performance. Geler : Entraînement. Retirer : devis (déjà masqués) ; les tâches servent de base aux actions à faire. La synthèse hebdo est remplacée par l'email du matin au manager. Calibrage toujours en pause.
- **Boutons de la vue A** (validé par Jean) : « Vu » / « Plus tard », chaque choix enregistré pour mesurer l'effet des alertes. « Je m'en occupe » et « Confier » sont abandonnés.
- **Matière de test disponible** (vérifié en base le 26/10) : 5 transcripts importés dans l'organisation Oliverlist — Antoine (Katell), Théa (Guislain, en double : une copie attribuée à Jean), Julien (Guislain), Zenaide (Dorian, parsé par l'ancien parseur bogué : à réimporter) — plus 6 calls réels enregistrés par Recall en juillet sur le compte de Hubert. Chaque prospect n'a qu'un seul call : ça teste l'extraction de la mémoire et les règles tirées du contenu, pas l'évolution d'un deal d'un call à l'autre (il faudra 2-3 calls Claap successifs sur un même prospect).

**Champs de la mémoire d'un deal (V1)** :

| Champ | MEDDIC (article) | Type proposé |
|---|---|---|
| Douleur identifiée | Identified Pain | texte |
| Impact chiffré / ROI attendu | Metrics | nombre + texte |
| Décideur économique | Economic Buyer | contact |
| Champion | Champion | contact |
| Critères de décision | Decision Criteria | texte |
| Processus de décision | Decision Process | texte |
| Budget | — (BANT) | texte |
| Échéance | — (BANT) | date |
| Concurrents évoqués | — | liste |
| Objections | — | liste (depuis l'analyse des calls) |
| Engagements et prochaines étapes | — | liste datée |
| Interlocuteurs manquants | — (règle de Hubert) | liste |

L'article propose aussi un score de santé (Economic Buyer 25 %, Metrics 20 %, Decision Criteria 15 %, Decision Process 15 % — son total fait 75 %) et des exigences par étape (Découverte : douleur ; Qualification : décideur + métriques ; Proposition : critères + processus ; Négociation : champion + tout le reste). À reprendre comme modèle par défaut, réglable par client.

### Ce que ces réponses changent

- **Les boutons de la vue A** (« Je m'en occupe » / « Confier » / « Plus tard ») ne collent plus à la réponse 12 : « Confier » suppose une reprise en main. À revoir avec Jean, par exemple « Vu » / « Plus tard », en gardant la trace de ce qui a été vu pour mesurer l'effet.
- **Deux familles de règles de risque** : celles d'Hubert (concurrent, objection mal traitée, preuve sociale, interlocuteur manquant) se lisent dans le contenu des calls ; les 6 premières se lisent dans les données du deal (dates, étapes, activité). Les premières reposent sur l'analyse des calls qui existe déjà ; les secondes ont besoin de HubSpot.
- **Pilote sur des exports Claap** : le banc d'essai existant (`/settings/import-call`, `app/api/calls/import-transcript`) sait déjà analyser un transcript collé à la main. Ça suffit pour tester les règles tirées des calls et la synthèse, pas ce qui dépend des deals (étapes, durées, activité, écriture dans HubSpot).
- **Champs de qualification** : Brief demande déjà le droit d'écrire sur les deals (`crm.objects.deals.write`, `lib/crm/hubspot.ts`). Il faudra au setup lire les propriétés de deal du client et les associer aux critères de sa méthode.
- **Titres des rendez-vous** : le commentaire de `lib/meeting-stage.ts` donne « Rencontre Oliverlist » = R1 et « Présentation Oliverlist » = R2 ; Hubert dit R1 ≈ « Présentation Oliverlist ». À vérifier dans la configuration réelle d'Oliverlist avant de s'appuyer dessus.

## Questions ouvertes (transmises à Hubert le 26/10) — réponses partielles reçues, voir ci-dessus

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

1. Réponses de Hubert (26/10) et de Jean (26/10 soir) reportées ci-dessus. Toutes les questions bloquantes sont tranchées.
2. **Étape 1 codée le 26/10/2026 (feu vert de Jean)** : fiche deal tirée d'un call, en test, visible des seuls managers d'Oliverlist (onglet « Fiche deal » de la page d'un call). Migration 029. Détail technique dans CLAUDE.md, section « Deal Execution ». Simulations sur les calls Antoine (Katell) et Velbrun (Hubert) : fiches justes, chaque élément cité.
3. Prochaine étape, sur feu vert : Jean et Hubert relisent les fiches des calls existants. Puis étape 2 (suivre un deal d'un call à l'autre) avec les extraits Claap successifs que Jean doit envoyer, puis étape 3 (compte HubSpot de test), puis étape 4 (vue manager et alertes).
