# Jeu de référence — détection et rattachement des objections

Ce dossier contient la **vérité terrain** : ce que le pipeline *devrait* trouver
sur de vrais calls. C'est le seul moyen de savoir si un réglage de prompt
améliore ou dégrade les choses.

Sans lui, on juge sur des captures d'écran isolées — c'est ainsi qu'on a
desserré puis resserré la définition d'une objection en une journée, sans
jamais pouvoir dire lequel des deux réglages valait mieux. Passer de 30 à 11
objections peut aussi bien vouloir dire « on a retiré le bruit » que « on a
perdu la moitié du signal ». Ces fiches tranchent.

## Annoter une fiche (une heure, une fois)

```bash
# 1. Créer les fiches (pré-remplies avec ce que le pipeline trouve aujourd'hui)
node --env-file=.env.local --experimental-strip-types \
  --import ./scripts/lib/register-loader.mjs \
  scripts/eval-objections-scaffold.ts

# 2. Éditer chaque .json à la main (voir ci-dessous)

# 3. Mesurer
node --env-file=.env.local --experimental-strip-types \
  --import ./scripts/lib/register-loader.mjs \
  scripts/eval-objections.ts
```

Dans chaque fiche :

1. **Ouvre le call** (`/feedback/<callId>`) et lis-le vraiment. Le champ
   `transcriptPreview` ne contient que le début.
2. **Retire de `expected`** ce qui n'est pas une objection : une objection est
   une réticence qui s'oppose à la vente, reformulable en « oui mais… ». Une
   question d'information (« vos équipes sont où ? ») n'en est pas une, même si
   le commercial y répond longuement.
3. **Ajoute les objections ratées.** C'est la partie la plus importante et la
   seule qui mesure le rappel — le pré-remplissage ne peut évidemment pas te la
   donner.
4. **Corrige `category`** : le libellé exact d'une catégorie de
   `availableCategories`, ou `null` si aucune ne convient vraiment. `null` est
   une réponse juste, pas un aveu d'échec.
5. **Passe `reviewed` à `true`.**

Tant que `reviewed` vaut `false`, la fiche est ignorée par l'évaluation : une
fiche non relue n'est que la sortie du pipeline recopiée, la compter
reviendrait à mesurer le pipeline contre lui-même et à afficher 100 % partout.

## Attention au biais d'ancrage

Les fiches sont pré-remplies pour t'épargner la saisie, pas pour te faire
valider l'existant. La tentation est réelle d'approuver ce qui est déjà écrit :
relis le transcript avant de regarder `expected`, pas l'inverse.

## Lire les résultats

| Indicateur | Ce qu'il mesure | Ce qu'une baisse signifie |
|---|---|---|
| **Rappel** | part des vraies objections retrouvées | on rate du signal — définition trop restrictive |
| **Précision** | part des objections remontées qui en sont vraiment | du bruit — questions prises pour des objections |
| **Rattachement** | part des objections bien appariées rangées dans la bonne catégorie | le classifieur force des rapprochements, ou il manque des catégories |

L'appariement entre attendu et obtenu se fait par similarité sémantique
(embeddings Voyage, seuil dans `lib/objection-eval.ts`) : deux formulations de
la même objection ne se ressemblent pas mot pour mot. C'est le bon usage des
embeddings — reconnaître deux paraphrases — à ne pas confondre avec le
rattachement à une catégorie, où la proximité thématique induit en erreur.

## Faire évoluer le jeu

Ajoute une fiche à chaque fois qu'un cas te surprend en production : c'est ce
qui empêche une régression de revenir. Le jeu n'a pas besoin d'être gros, il a
besoin d'être **représentatif** et **honnête**.
