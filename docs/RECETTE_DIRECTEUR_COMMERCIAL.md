# Recette Brief — Plan de test 2 jours (directeur commercial)

**Objectif** : dérouler chaque fonctionnalité de Brief comme un vrai commercial puis comme un manager, et noter chaque friction. **Pour chaque anomalie : un screenshot + l'heure précise** (indispensable pour retrouver les logs).

**Prérequis côté Jean avant de commencer :**
- Inviter le testeur via l'admin (Brief est sur invitation)
- Ajouter son compte Google aux "test users" de la console Google Cloud (OAuth encore en mode Testing)
- Lui donner accès à un HubSpot ou Pipedrive (réel ou sandbox)
- Prévoir un collègue qui joue le prospect (avec un email externe, hors domaine de l'entreprise)

---

## JOUR 1 — Parcours commercial (le cœur du produit)

### Matin — Setup (~1h)

| # | Quoi tester | Utilité de la fonctionnalité | Ce qui doit marcher |
|---|---|---|---|
| 1 | Connexion Google SSO sur brief-precall.vercel.app | Accès sécurisé sans mot de passe | Arrivée sur l'onboarding |
| 2 | Onboarding 4 étapes (produit, cible, secteur) | Personnalise TOUS les briefs et emails IA générés ensuite | Profil retrouvable dans Paramètres > Général |
| 3 | Connecter l'agenda (Paramètres > Connexions > Google) | Le bot rejoint automatiquement vos visios pour les enregistrer | Statut "connecté" ; sous 5 min, vos RDV visio à venir apparaissent sur la page Brief |
| 4 | Connecter le CRM (Paramètres > CRM) | Briefs enrichis des deals en cours + comptes-rendus poussés automatiquement dans le CRM | Statut connecté + proposition d'import des références |
| 5 | Connecter Slack + choisir ses canaux (Paramètres > Notifications) | Recevoir briefs et analyses là où on travaille déjà (email, agenda, CRM, Slack) | Toggles sauvegardés |
| 6 | Ajouter 3-5 vraies références clients (Paramètres > Références clients) | Le brief cite automatiquement le cas client le plus proche du prospect | Références listées, comptées |

### Matin — Avant le rendez-vous

| # | Quoi tester | Utilité | Ce qui doit marcher |
|---|---|---|---|
| 7 | Créer un vrai RDV Google Calendar (visio Meet) avec l'email du "prospect" | — | Le RDV apparaît sur la page Brief sous 5 min |
| 8 | Générer le brief | 2 min de lecture remplacent 30 min de recherche Google/LinkedIn/CRM avant chaque call | Contexte société, actualités récentes, infos contact, référence client similaire — contenu pertinent et sans invention |
| 9 | Vérifier la distribution du brief | Le brief arrive TOUT SEUL là où vous travaillez | Email reçu + description de l'événement Calendar enrichie + note CRM + DM Slack (selon canaux activés) |

### Midi — Le rendez-vous (jouer un VRAI call de 20-30 min)

Faire un call de vente réaliste avec le collègue-prospect : découverte, **2-3 objections explicites** ("c'est trop cher", "on a déjà un outil"), et des **prochaines étapes claires** en fin de call.

| # | Quoi tester | Utilité | Ce qui doit marcher |
|---|---|---|---|
| 10 | Le bot rejoint la visio (l'admettre dans Meet) | Enregistrement + transcription automatiques, zéro prise de notes | Bot présent, visible dans les participants |
| 11 | L'analyse (Analyse rendez-vous, ~5-10 min après la fin) | Debriefing objectif de chaque call, sans replay d'1h | Vérifier CHAQUE bloc — voir liste détaillée ci-dessous |
| 12 | Email de suivi IA : générer (tester un "Type de call"), éditer, envoyer | Le compte-rendu prospect part en 2 min, depuis VOTRE boîte Gmail | Email reçu côté prospect, visible dans le thread Gmail du commercial |
| 13 | Faire répondre le prospect, attendre ~30 min | Brief détecte la réponse et prépare une réponse threadée | Réponse détectée + "Suggérer une réponse" cohérente + envoi dans le même thread |

**Blocs de l'analyse à vérifier un par un (point de vigilance n°1 du test) :**
- 💡 Points clés (résumé structuré du call)
- Scores par dimension du playbook + score global + sentiment
- **Points forts / axes d'amélioration — vérifier NON VIDES** (dernier bug corrigé ici)
- Objections rencontrées, avec la réponse réellement apportée pendant le call (pas inventée)
- Prochaines étapes (doivent correspondre à ce qui a été dit)
- Transcript : bons noms de speakers (sinon tester la correction inline), recherche dans le texte, horodatage
- Analytics conversation : ratio de parole commercial/prospect, questions posées, monologues
- Vidéo : clic sur un tour de parole du transcript → la vidéo saute au bon moment

### Après-midi — Tasks et Devis

| # | Quoi tester | Utilité | Ce qui doit marcher |
|---|---|---|---|
| 14 | /tasks : la task post-call créée automatiquement | Aucun suivi oublié : chaque call/email/devis génère ses relances | Task "email de récap" présente, modale email IA fonctionnelle, la task se complète seule après envoi |
| 15 | /tasks — Paramètres : templates de relance | Cadence de relance configurable (J+2, J+7…) | Activer/désactiver/créer un template ; si HubSpot : activer le push et vérifier la task créée côté HubSpot, puis compléter côté Brief → statut HubSpot à jour |
| 16 | /quotes — Paramètres : entreprise (SIRET, logo, RIB) + 2-3 offres au catalogue | Devis pro en 2 min au lieu de 30 | PDF avec logo, mentions, numérotation |
| 17 | Nouveau devis sur le contact du call → "Pré-remplir avec l'IA" | Le devis se remplit tout seul depuis les échanges du call | Lignes proposées cohérentes avec ce qui a été discuté ; calculs HT/TVA/remise justes |
| 18 | Envoyer le devis (email IA + PDF joint), puis côté prospect : ouvrir la page publique et ACCEPTER | Signature simple en 1 clic + tracking | Statut "vu" puis "accepté", toast à la connexion + email de confirmation côté commercial |
| 19 | /contacts (Historique) : ouvrir le contact du jour | Toute la relation en un seul endroit | Timeline complète : brief + call + emails + devis |

---

## JOUR 2 — Parcours manager + robustesse

### Matin — Manager (compte manager fourni par Jean)

| # | Quoi tester | Utilité | Ce qui doit marcher |
|---|---|---|---|
| 20 | /dashboard vue manager | Pilotage équipe en temps réel, sans rien demander aux commerciaux | Stats réelles de l'équipe (calls, scores, tendance) |
| 21 | /team → un commercial → un de ses calls | Coaching sur du réel : réécouter et lire l'analyse de n'importe quel call de l'équipe | Vue en lecture seule (rien de modifiable), vidéo + transcript accessibles |
| 22 | /team/playbook : modifier une dimension, ajouter un critère, puis re-analyser un call | VOTRE méthode de vente devient la grille de scoring de l'IA | Les nouveaux critères apparaissent dans les scores du call suivant |
| 23 | Import playbook depuis un doc (PDF, Word ou Notion) | Le playbook existant de l'entreprise importé en 1 min | Extraction proposée fidèle au doc, validable avant application |
| 24 | /team/email-templates : créer un template avec un ton précis, puis côté commercial générer un email avec ce type | Emails de l'équipe homogènes, au ton de la boîte | Le ton demandé est respecté ; tester aussi l'override personnel (⚙️) |
| 25 | /team/insights | Savoir quelles objections font perdre des deals et quelles dimensions différencient les calls gagnés | S'affiche sans erreur (peu de données au début = normal) |
| 26 | Inviter un commercial (email), rattacher/détacher de l'équipe | Onboarding équipe self-serve | Email d'invitation reçu, liens fonctionnels |
| 27 | Digest hebdo : activer + "Recevoir un aperçu" (Paramètres > Notifications) | Le récap de la semaine dans votre boîte le lundi matin, sans ouvrir Brief | Email d'aperçu reçu, chiffres cohérents |
| 28 | /settings/billing (mode Test) : démarrer l'essai avec la carte 4242 4242 4242 4242 | Facturation par organisation, self-serve | Checkout OK, sièges = nombre d'users actifs, bannière "Essai actif", portal Stripe accessible |

### Après-midi — Mobile et cas limites

| # | Quoi tester | Ce qui doit marcher |
|---|---|---|
| 29 | Sur téléphone : dashboard, brief, analyse (transcript + vidéo), tasks | Menu hamburger OK, rien ne déborde horizontalement, tout est lisible |
| 30 | RDV 100% interne (aucun email externe) | Pas de bot programmé, libellé clair (pas une erreur) |
| 31 | Refuser le bot dans la salle d'attente Meet | Pas de crash ; le call n'apparaît pas ou statut explicite |
| 32 | Call très court (< 2 min) | Analyse propre ou message clair, pas de page cassée |
| 33 | Regénérer le brief du même RDV | Brief servi depuis le cache, pas de doublon |
| 34 | Isolation : avec 2 comptes commerciaux, vérifier que A ne voit JAMAIS les données de B | Contacts, calls, devis, tasks de B invisibles pour A |

---

## Restitution attendue

Pour chaque point : ✅ OK / ⚠️ friction (préciser) / ❌ cassé (screenshot + heure). En fin de test, un top 5 des frictions du point de vue d'un commercial qui découvre l'outil — c'est ce retour-là qui a le plus de valeur avant d'ouvrir à de vrais clients.
