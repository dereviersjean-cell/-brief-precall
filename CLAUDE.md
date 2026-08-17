# CLAUDE.md — Brief (Sales Enablement B2B)

## Contexte business
- **Produit** : Brief = conversation intelligence pour commerciaux B2B FR (PME/ETI)
- **Société** : Oliverlist — COO Jean de Reviers. Brief est le premier module d'un SaaS plus large.
- **Positionnement** : marché FR, données légales Pappers, prix accessible vs Gong/Sybill
- **Accès** : invitation uniquement, pas d'inscription libre

## Vision produit
- **Proposition de valeur unique (recentrage du 24 juillet 2026, décision du directeur commercial) : augmenter le taux de closing.** Pas d'éparpillement en features — tout ce qui ne sert pas directement « préparer / débriefer / progresser » est masqué (voir ci-dessous).
- Distribution in-context : Brief livre ses outputs (briefs, analyses) là où le commercial travaille déjà — HubSpot, Google Calendar, email. L'utilisateur ne doit pas venir sur Brief pour en bénéficier.

## Recentrage produit — 24 juillet 2026

- **Modules Tasks et Devis masqués, pas supprimés** : entrées retirées de la sidebar, `app/tasks/layout.tsx` et `app/quotes/layout.tsx` remplacés par un `redirect("/dashboard")` (les layouts d'origine sont dans le git log). Les routes API, crons Inngest et le signal win/loss des devis (`deal_outcomes` source `quote`, page publique `/q/[token]`) restent actifs. Le digest hebdo et son email ne mentionnent plus tâches/devis (prompts par défaut `admin_config` ajustés — si des versions éditées existent en base, les resetter).
- **Sidebar resserrée** : un seul groupe « Commercial » (`app/components/AppSidebar.tsx`) — Brief, Analyse rendez-vous, Performance, dans cet ordre. « Équipe » (manager) n'est plus qu'un lien unique, plus de menu déroulant.
- **« Performance » est une section à onglets, par thème de statistiques détaillées** (`app/components/PerformanceTabs.tsx`, même pattern que `TeamTabs`/`SettingsTabs`) : **Vue d'ensemble** (`/dashboard`), **Scores** (`/dashboard/scores`), **Analytics** (`/dashboard/analytics`), **Objections** (`/dashboard/objections`), **Playbook** (`/dashboard/playbook`), **Entraînement** (`/training`) — Analytics et Playbook ajoutés le 29/07/2026, voir la section dédiée plus bas. Décision du 25/07/2026 : pas d'onglet Historique (`/contacts` reste une page à part, atteinte via un lien « Tout l'historique → » depuis Vue d'ensemble, pas un onglet persistant) — les onglets suivent des *thèmes de stats*, pas des types de page bruts. Les blocs qui n'étaient que des cartes résumées dans Vue d'ensemble (« Scores moyens par dimension » côté manager, « Objections importantes » des deux côtés) ont chacun leur propre page détaillée maintenant, et ont été retirés de Vue d'ensemble pour ne pas dupliquer :
  - `/dashboard/scores` : `ScoreTrendChart` + `DimensionScores`, sourcés par `getUserAverageScores(userId)` (nouvelle fonction, extraite de `getTeamAverageScores` via un helper partagé `computeAverageScoresForUserIds`) côté commercial, `getTeamAverageScores`/`getRecentTeamCallScores` côté manager.
  - `/dashboard/objections` : liste complète (non capée à 4) de `getObjectionStatsForOrganization`, accessible aux deux rôles (bibliothèque d'objections déjà org-wide par design) — distincte de `/settings/objections` qui reste la bibliothèque de réponses cherchables ; lien croisé entre les deux.
  - La sidebar ne pointe que vers `/dashboard` (`performanceActive` couvre `/dashboard`, `/dashboard/*`, `/contacts`, `/training`).
- **`/team` (onglet « Équipe ») redevenu du pilotage pur** (25/07/2026) : plus de `StatTile` scores globaux/par dimension, plus de colonnes Briefs/Appels/Emails/Score moyen dans le tableau — juste Nom + Dernière activité + un lien « Voir la performance → » par ligne vers `/dashboard?commercial=<id>` (bascule direct sur le sélecteur ci-dessus). `getTeamAverageScores` n'est plus fetché dans `app/team/page.tsx` (seul `/dashboard/scores` l'utilise désormais). Les stats détaillées d'équipe vivent exclusivement dans Performance ; `/team` reste pour composition/invitations/rôles (`ManageTeamModal`/`InviteCommercialModal`).
- **Sélecteur « vue équipe / commercial spécifique »** (`app/dashboard/CommercialSelector.tsx`, manager only) — présent sur les onglets de statistiques (`?commercial=<id>`, le composant lit `usePathname()` donc conserve l'onglet courant en changeant de commercial) :
  - **Vue d'ensemble** : réutilise `CommercialOverview` tel quel (`viewerRole="manager"`) — mêmes données, sourcées pour l'id sélectionné. Masque `ConnectionsStatus` et les actions (Nouveau brief, Cette semaine, Exporter), qui n'agiraient que sur le compte du manager connecté, pas celui consulté.
  - **Scores** : `getUserAverageScores`/`getRecentCallScores` du commercial sélectionné plutôt que `getTeamAverageScores`/`getRecentTeamCallScores`.
  - **Objections** : nouvelle fonction `getObjectionStatsForUser(organizationId, userId)` (variante par commercial de `getObjectionStatsForOrganization`, jointure `calls!inner`) plutôt que la bibliothèque org-wide.
  - **Entraînement** : **jamais** le contenu des sessions (transcripts/débriefs) d'un commercial, même sélectionné — décision produit inchangée (espace sûr). Seul un résumé agrégé (`getTrainingStatsForOrganization`, filtré côté page) : compteur de sessions, score moyen, dernière session.
  - Autorisation : la liste vient toujours de `getCommercialsForManager` (scopée aux commerciaux liés à ce manager) ; un id absent de cette liste retombe silencieusement sur la vue équipe, jamais une erreur qui confirmerait l'existence d'un id d'un autre manager/org.

## Entraînement — module additionnel (upsell), désactivé par défaut

Décision du 25/07/2026 : Entraînement passe d'une fonctionnalité incluse à un **addon verrouillé par défaut**, migration `003_training_enabled.sql` (`organizations.training_enabled boolean not null default false`, Oliverlist explicitement débloqué dans la migration pour continuer les tests internes).

- **Fail-closed partout** : `isTrainingEnabledForOrganization` (lib/db.ts) renvoie `false` sur toute erreur, y compris colonne absente si la migration n'est pas encore passée en prod — jamais fail-open sur un gate payant.
- **Gate réel côté serveur, pas que visuel** : `/training` (page) rend `TrainingLockedClient` au lieu de `TrainingClient` si le flag est faux. Les 4 routes `/api/training/*` vérifient aussi le flag (403 si non débloqué) — un appel API direct ne contourne pas le verrou même si quelqu'un bypass l'UI. Exception : `finish` autorise toujours la lecture idempotente d'un débrief déjà généré (pas une nouvelle génération) même module désactivé depuis — les données déjà produites ne disparaissent pas.
- **Visuel** : l'onglet Entraînement de `PerformanceTabs` se grise (icône cadenas) via un fetch client léger sur `/api/training/status` — purement cosmétique, le vrai verrou est côté serveur. `TrainingLockedClient` montre un aperçu flouté du produit + CTA mailto (`hello@oliverlist.com`) « Je veux débloquer ce module » — pas d'infra de facturation par addon à ce stade, déblocage manuel uniquement.
- **Déblocage admin** : `/admin/organizations/[orgId]` → onglet Facturation → carte « Modules additionnels », toggle qui appelle `PATCH /api/admin/organizations/[orgId]/training` (`setTrainingEnabledForOrganization`) — n'agit sur aucun objet Stripe, uniquement l'accès Brief, même logique que les overrides de facturation existants.
- **CTA « Je veux débloquer ce module »** (`TrainingLockedClient.tsx`) : `POST /api/training/request-unlock` — trace la demande dans `training_unlock_requests` (migration 004, durable même si l'email échoue) puis notifie l'admin par email via `sendTrainingUnlockRequestEmail` (lib/email.ts), destinataire = variable d'env `ADMIN_NOTIFICATION_EMAIL` (**à configurer sur Vercel** — sans elle, la demande reste enregistrée en base mais aucun email ne part, juste un `console.error`). Déduplication 24h par `hasRecentTrainingUnlockRequest` : un même utilisateur qui reclique plusieurs fois ne spam pas l'admin.
- **Objections a déménagé dans Paramètres** (`/settings/objections`, ex-`/objections`) : ancienne page/route supprimée, contenu (`ObjectionsClient.tsx`) repris tel quel sous le shell `SettingsLayout`, entrée ajoutée dans `SettingsTabs.tsx` (ouverte à tous, pas `managerOnly`).
- **Équipe (`/team`) à onglets** (`app/team/TeamTabs.tsx`, même pattern que `SettingsTabs`) : Équipe (roster) / Templates emails / Insights (Playbook en est parti pour Performance le 29/07/2026). Masqué automatiquement sur `/team/[commercialId]` (page de détail, pas une des 4 catégories). La sidebar ne pointe plus que vers `/team`.
- **Playbook et Étapes de RDV fusionnés** : l'ancienne page séparée `/team/meeting-stages` est supprimée ; sa UI (motifs de titre + consignes par étape R1/R2/R3, testeur de détection) vit maintenant comme section additionnelle (`app/team/playbook/MeetingStagesSection.tsx`) en bas de la page Playbook (`/team/playbook`) — les deux sont conceptuellement la même chose (comment on évalue un call). API inchangée (`/api/team/meeting-stages`).
- **Analyse par étape R1/R2/R3** (`lib/meeting-stage.ts`, sans dépendance — importable côté client) : le manager configure des motifs de titre de RDV par étape + des consignes d'analyse (section Playbook ci-dessus, jsonb `organizations.meeting_stage_config`). Le titre du meeting transite par les metadata du bot Recall (`meetingTitle`, ajouté dans `lib/recall.ts` — les bots programmés avant n'en ont pas), l'étape est détectée à l'ingestion (bot-webhook) et stockée sur `calls.meeting_stage` (+ `calls.meeting_title`). Les consignes d'étape sont injectées dans le message utilisateur d'`analyzeCall`, JAMAIS dans le system prompt (contrat JSON). Repli : pas de motif/titre → analyse générique inchangée. Badge R1/R2/R3 sur la liste et le détail feedback.
- **Migration `migrations/001_meeting_stages.sql`** (premier fichier du dossier `migrations/` recommandé par l'audit) : appliquée en prod le 24 juillet 2026.
- **Landing allégée** façon eagr.ai/fr : promesse unique « Augmentez votre taux de closing », section problème (écart top performer), 3 piliers numérotés (Préparer / Débriefer / Progresser) calqués sur la structure de l'app, section manager, schéma récapitulatif de la structure (`StructureDiagram` dans `app/page.tsx`, remplace l'ancien bandeau de stats `RoiStrip`), FAQ resserrée à 5 questions. Zéro mention devis/tasks.

## Bloc Entraînement (roleplay IA) — 24 juillet 2026

Inspiration muchbetter.ai (simulations vocales + coach IA), mais paramétré automatiquement sur les **vrais pains du commercial** : ses objections restées sans réponse ou sur deals perdus, extraites de ses calls analysés.

- **Architecture voix à coût quasi nul** (~0,05 €/session, décision explicite — pas de speech-to-speech temps réel à 2-5 €/session) : reconnaissance vocale navigateur (Web Speech API, `fr-FR`, Chrome/Edge/Safari — repli clavier sur Firefox), Claude en texte pour le prospect, synthèse vocale navigateur (`speechSynthesis`) pour la voix du prospect (coupable via toggle). Si la voix navigateur s'avère trop robotique : brancher une TTS premium dans `speak()` (TrainingClient.tsx), point unique.
- **Table `training_sessions`** (migration `002_training_sessions.sql` — **à exécuter sur Supabase prod avant déploiement** ; les pages ont des `.catch` de repli mais les sessions ne démarreront pas sans la table) : scenario jsonb (objection + persona + source + étape R1/R2/R3), transcript jsonb, debrief jsonb, status active/completed.
- **`lib/training.ts`** : persona générée par Haiku (repli persona par défaut, ne bloque jamais), prospect joué par Sonnet (system prompt codé en dur, registre oral, ne cède que face à de bonnes réponses — reformulation, questions, preuves), débrief JSON validé par `validateTrainingDebriefShape` (pattern bug #20), enrichi best-effort des réponses de l'équipe sur objections similaires (`findSimilarObjections`). 4 axes de notation fixes (`TRAINING_AXES`), 12 tours max (`MAX_COMMERCIAL_TURNS`).
- **Scénarios suggérés** = `listTrainingObjectionCandidatesForUser` (lib/db.ts) : SES objections (jointure `calls!inner` sur user_id), deals gagnés exclus, priorité sans-réponse (regex sur les placeholders « Pas de réponse apportée » / « Réponse non disponible ») > deal perdu > issue inconnue, dédup par texte normalisé. + objection libre, + lien « M'entraîner sur cette objection » depuis chaque objection de `/feedback/[id]`.
- **Routes** : `/api/training/scenarios` (lecture, pas de rate limit), `POST /api/training/sessions`, `.../turn`, `.../finish` — toutes `requireActiveUser` + `checkAiGenerationRateLimit`. `finish` est idempotent (session déjà complétée → renvoie le débrief existant).
- **Confidentialité** : le contenu des sessions est strictement personnel (toutes les lectures filtrent `user_id`). Le manager ne voit qu'un agrégat (compteurs, score moyen, dernière session) dans `/team/insights` via `getTrainingStatsForOrganization` — jamais les transcripts. Ne PAS exposer les transcripts côté manager : décision produit explicite (espace sûr).
- UI : `/training`, onglet « Entraînement » de la section Performance (voir ci-dessous — plus une entrée sidebar séparée depuis le 25/07/2026), tout dans `TrainingClient.tsx` (accueil scénarios/objection libre/historique dépliable + écran session avec micro/dictée, bulles, débrief).

## Décisions architecturales — pourquoi ces choix

| Service | Raison |
|---|---|
| **Inngest** | Jobs asynchrones (cron + event-driven). Sync Recall 5 min, check emails/devis sans réponse 30 min. |
| **Recall.AI EU** | Région eu-central-1 obligatoire (RGPD). Ne JAMAIS utiliser les endpoints US. |
| **Svix** | Signatures webhooks Recall. Headers : `webhook-id/timestamp/signature` — PAS `svix-*`. |
| **Supabase service_role** | RLS activé sans policies (bloque tout public). TOUTES les fonctions lib/db.ts utilisent supabaseAdmin. |
| **Voyage AI** | Embeddings 1024 dim (voyage-3) pour similarité références clients via pgvector. |
| **Resend** | Emails transactionnels depuis jean@lartisangroupe.com — jamais le Gmail du commercial. |
| **react-pdf** | Génération PDF devis côté serveur. |
| **Sentry (serveur uniquement)** | Remontée des échecs SILENCIEUX des webhooks et crons. Pas de config client : le besoin est ciblé sur les chemins sans utilisateur devant l'écran, et le bundle envoyé aux utilisateurs reste inchangé. `tracesSampleRate: 0` — on cherche des erreurs invisibles, pas des millisecondes. Inerte sans `SENTRY_DSN`. |
| **Notion (token intégration interne)** | Connexion playbook Notion. Pas OAuth : les intégrations publiques Notion nécessitent une review de sécurité Notion avant de fonctionner (bloquant pour un "connecte et utilise immédiatement"). Connexion **par organisation** (table `playbook_notion_connections`), pas par user — le playbook est un par organisation. |
| **Stripe (Checkout + Invoice Items, pas Billing Meters/Metronome)** | Facturation **par organisation** (pas par user) : abonnement par siège (`checkout.sessions.create`, `mode: subscription`) + usage (0,50€/h d'enregistrement, refacturation directe du coût Recall) via `invoiceItems.create` mensuel plutôt que l'API Billing Meters — Stripe pousse tout nouveau usage-based billing vers Metronome (plateforme tierce rachetée), disproportionné pour une seule métrique simple. On calcule le total nous-mêmes (agrégation `duration_seconds`), Stripe ne fait qu'encaisser. |

## Architecture multi-tenant

### Rôles
- `commercial` : accès à ses propres données uniquement
- `manager` : accès aux commerciaux liés via `manager_commercial_links` (many-to-many, même org)

### Isolation
- Chaque query filtre par `user_id` ou `organization_id`
- Playbook : 1 par organisation (pas par user)
- Email templates : par organisation, override possible par user
- `requireActiveUser(session)` obligatoire dans toutes les routes API sensibles

### Impersonation admin
- Cookie `brief_impersonate_user_id`, maxAge 4h, log toutes les actions
- Routes `/api/admin/*` : auth mot de passe partagé, jamais impactées par l'impersonation
- Bandeau rouge sticky visible quand impersonation active

### OAuth — attention critique
- **RECALL_GOOGLE_CLIENT_ID ≠ GOOGLE_CLIENT_ID** : deux apps Google séparées, deux flows distincts
- `lib/auth.ts` : scopes Google = `openid email profile calendar.events gmail.metadata gmail.send`
- **`gmail.readonly` volontairement retiré des scopes (25/07/2026)** : Google le classe scope Restricted (vérifié dans Google Cloud Console, Data Access → Gmail scopes), ce qui exige un audit de sécurité tiers payant (CASA, ~500-1800 $/an) pour sortir l'app du mode Testing. Décision : rester gratuit, accepter la perte de fonctionnalité. `gmail.metadata` le remplace pour la détection de réponse (headers seulement, jamais le corps du message — scope Sensitive, pas Restricted, pas de CASA). Conséquences en cascade, toutes documentées inline aux points de retrait :
  - `lib/gmail.ts` : `checkThreadReply` passe en `format=metadata` (plus de corps de message, juste `replied`/`repliedAt`/`messageId`). `getEmailHistory` supprimée entièrement (nécessitait le corps).
  - Fonctionnalité **« Suggérer une réponse au prospect » supprimée** (route `/api/feedback/generate-reply-suggestion`, `generateReplyToProspect(WithTemplate)`, prompt `reply_suggestion_prompt`) — nécessitait de lire ce que le prospect avait écrit, aucun scope allégé ne le permet.
  - Contexte « historique d'emails » retiré de la génération de devis (`quotes/generate`, `quotes/[quoteId]/generate-email`) et de l'email de suivi post-call (`bot-webhook` Step 5, `generateFollowUpEmail`) — ces générations tournent maintenant sans ce contexte (fallback déjà existant : ton professionnel par défaut).
  - UI : `/feedback/[id]` et `/contacts/[email]` affichent juste « le prospect a répondu le [date] », sans contenu ni bouton de suggestion IA. Le formulaire de relance manuelle (`send-reply`, scope `gmail.send`) reste inchangé.
  - Si le produit grandit et justifie l'audit CASA un jour : remettre `gmail.readonly`, restaurer le corps dans `checkThreadReply`/`getEmailHistory` (git log sur ces fichiers), et réactiver la suggestion de réponse.

## Facturation (Stripe)

Testé de bout en bout en conditions réelles (mode Test Stripe, vrai compte Oliverlist) le 19 juillet 2026 — checkout, essai, résiliation, réabonnement, blocage. 3 bugs trouvés et corrigés pendant ce test, voir Bugs critiques ci-dessous (#15, #16, #17).

- `billing_status` sur `organizations` : `none` (jamais souscrit) → `trialing` (essai 7j, carte requise dès l'inscription) → `active` ↔ `grace_period` (échec de paiement, 48h de grâce, bannière d'alerte site-wide) → `blocked` (grâce expirée) **ou** `canceled` (résiliation volontaire) — les deux bloquent l'accès de la même façon via middleware, sauf `/settings/billing`
- `billing_interval` sur `organizations` : `month` | `year` — plan annuel (490€, ≈2 mois offerts) proposé au choix à la souscription pour inciter à l'engagement long, lu depuis `SubscriptionItem.price.recurring.interval` (toujours l'objet `Price` complet, jamais juste un ID) à chaque `customer.subscription.updated`/`.created`
- Sièges = users actifs (`disabled_at IS NULL`) de l'org, synchronisés vers Stripe en best-effort à chaque mutation de composition (ajout/retrait/changement de rôle admin, invitation self-serve manager) — `syncSeatsForOrganization` dans `lib/stripe.ts`
- Usage facturé mensuellement (cron `reportBillingUsage`, 1er du mois), depuis `last_usage_reported_at` ou `current_period_start` pour le tout premier report (jamais depuis le début de l'historique — pas de facture rétroactive géante). Calcul à la seconde près (pas d'arrondi à l'heure supérieure), converti en centimes à la fin seulement
- Webhook `app/api/webhooks/stripe/route.ts` : idempotence via table `billing_events` (`stripe_event_id UNIQUE` + upsert `ignoreDuplicates`), calqué sur le webhook Recall existant (body brut, signature vérifiée avant parsing, `200` même si un effet de bord échoue). Événements requis côté Stripe Dashboard : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
- `handlePaymentSucceeded` ne doit agir QUE en sortie de `grace_period` (`if (org.billing_status !== "grace_period") return;`) — Stripe émet aussi ce même événement pour la facture à 0€ générée au démarrage d'un essai, qui écraserait sinon `trialing` en `active` dès le premier jour
- `lib/stripe.ts` : un seul subscription item par abonnement (le siège) — `current_period_start/end` vivent sur le `SubscriptionItem`, **pas** sur la `Subscription` elle-même (déplacé dans une version récente de l'API Stripe, vérifié contre le SDK installé avant d'écrire le code, pas supposé)
- Stripe Tax : `automatic_tax` + `tax_id_collection` activés sur la Checkout Session. Si le customer Stripe existe déjà (réabonnement après résiliation), `customer_update: { name: "auto", address: "auto" }` est **obligatoire** en plus, sinon Stripe refuse avec "Tax ID collection requires updating business name on the customer" — inutile lors du tout premier abonnement (`customer_email`, Checkout crée un customer neuf en pleine maîtrise)
- Admin : override manuel (`/api/admin/organizations/[orgId]/billing`, PATCH `unblock`|`extend_grace`) pour les cas de support — n'agit jamais sur le véritable abonnement Stripe, seulement sur l'accès Brief

## Objections catégorisées, Analytics, banc d'essai — 29 juillet 2026

Migration `006_objection_categories_and_analytics.sql` — **à exécuter sur Supabase prod avant déploiement**. Tout ce qui la lit est en `.catch()` de repli (pattern bug #14) : sans elle, les pages s'affichent dégradées au lieu de planter, mais rien ne se remplit.

### Playbook d'objections du manager (`objection_categories`)
- Le manager définit **les objections qui reviennent le plus souvent + comment les traiter**, par organisation (comme le playbook de scoring). Deux entrées, même parcours que l'import playbook : saisie manuelle inline, ou import d'un document (PDF/Word/collage → extraction Claude, `/api/objections/categories/import`). **L'import est ADDITIF** (contrairement à l'import playbook qui remplace) : il complète une bibliothèque que le manager enrichit, les doublons de label sont ignorés côté serveur, jamais écrasés.
- `handling_guidance` n'est pas décoratif : c'est la référence contre laquelle les réponses des commerciaux sont notées. Une catégorie sans consigne dégrade l'évaluation en « appréciation générale » (`evaluated_against_playbook = false`), et l'UI le dit explicitement plutôt que de faire passer les deux pour la même chose.
- `lib/document-text.ts` : extraction PDF/Word factorisée entre `/api/playbook/import` et cet import (mêmes formats, même message d'erreur, un seul endroit à corriger quand `pdf-parse` recasse — cf. bug #13).

### Classification sémantique (`lib/objection-classifier.ts`)
- **Un seul appel Claude par call** pour toutes ses objections à la fois (le modèle voit la liste complète des catégories et l'ensemble des objections d'un même échange — meilleurs rattachements qu'une suite de décisions isolées) qui fait deux choses d'un coup : ranger chaque objection dans une catégorie, et noter la réponse (`bien_traitee` / `partiellement` / `non_traitee` + un commentaire d'une phrase).
- Branché dans `indexCallObjections` (lib/objections.ts) et non dans le webhook : c'est le **seul chokepoint** par lequel passent toutes les écritures dans `call_objections`, donc le seul endroit qui garantit que rien n'entre non classé — bot-webhook, backfill et import de transcript en bénéficient sans code dupliqué.
- Prompt **codé en dur**, pas dans `admin_config` : contrat JSON structurel, pas du contenu manager (règle « contrat JSON forcé côté serveur », bug #20).
- **Verbatims + reformulation** (migration `007_objection_verbatims.sql`, 29/07/2026) : le classifieur reçoit aussi le **transcript complet** et renvoie, en plus du verdict, `prospect_verbatim` / `commercial_verbatim` (les phrases réellement prononcées, copiées mot à mot) et `suggested_response` (ce qu'il aurait fallu répondre, dérivé du `handling_guidance`, null quand l'objection a été bien traitée). Motivation : `call_objections.objection`/`.response` ne contenaient qu'un RÉSUMÉ à la troisième personne, inexploitable pour coacher.
- **Le modèle ne recopie JAMAIS le verbatim, il renvoie des numéros de ligne.** Le transcript lui est envoyé numéroté (`[0] Nom: …`), il répond `prospect_lines: [12, 13]`, et le CODE extrait le texte. Fidélité garantie par construction : plus moyen de « nettoyer » une phrase ni de recoller des morceaux non contigus, et un intervalle hors bornes est rejeté. Sortie beaucoup plus courte au passage.
  - **Première version, à ne pas refaire** : demander une copie mot à mot puis vérifier par recherche de sous-chaîne normalisée. Mesuré sur les vrais calls d'Oliverlist : un tiers des citations rejetées pour de simples retouches de surface du modèle, donc perdues. Le passage aux numéros de ligne a fait passer le taux de 12/72 à **72/72**.
- **Découpage en lots de 10 objections** (`BATCH_SIZE`) : deux calls d'Oliverlist portaient 34 et 26 objections, la réponse dépassait `max_tokens`, le JSON arrivait tronqué et la classification de **toutes** les objections de ces calls était perdue d'un coup (60 sur 72). Avec des lots, une réponse tronquée ne coûte plus que son lot.
- **Reprise sur échec de parsing**, dans cet ordre : un nouvel essai (l'échec observé était un `}` surnuméraire au milieu d'un JSON par ailleurs valide — dérapage intermittent qui ne se reproduit pas au tirage suivant), puis découpage du lot en deux. Après ces deux reprises : 0 échec sur les 5 calls d'Oliverlist, contre 2 avant.
- **`OBJECTION_DEFINITION` (lib/admin-config.ts) est la définition unique de ce qui compte comme une objection**, injectée dans les DEUX chemins d'extraction — le prompt d'analyse éditable en admin et `extractObjectionsFromTranscript` codé en dur. Les deux doivent s'accorder : un call analysé en direct et le même call rejoué par un backfill doivent produire les mêmes objections. Écrite le 29/07/2026 après constat sur les vrais calls : l'extraction remontait comme objections de simples questions d'information (« vos équipes sont basées où ? »), et la moitié des « objections » n'en étaient pas. Règle centrale : une objection doit pouvoir se reformuler en « oui mais… ». Effet mesuré sur Oliverlist : 30 → 11 objections, toutes réelles.
- **Le prompt `call_analysis_system_prompt` édité en base prime sur le défaut du code** — modifier `DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT` ne suffit PAS si une version éditée existe dans `admin_config`. Toute évolution de la définition doit être répercutée dans la ligne en base (vérifier d'abord si elle est une copie conforme de l'ancien défaut ou une vraie personnalisation, et dans ce second cas n'insérer que le bloc concerné).
- Ne force jamais un rattachement : aucune catégorie plausible → `category_id` null → remonte dans « Non classées », qui est un signal (la bibliothèque du manager est incomplète), pas un échec. Le voisinage thématique ne suffit pas — « où sont basées vos équipes ? » ne relève pas de « impossibilité d'écouter les appels » parce que les deux parlent d'appels. Arbitrage explicite dans le prompt : dix objections non classées valent mieux qu'une seule mal rangée, parce qu'une objection mal rangée fausse les statistiques sur lesquelles le manager décide, là où une non classée lui signale simplement qu'il lui manque une catégorie. Le flag `compared_to_playbook` renvoyé par le modèle n'est pas pris au mot — il est revérifié contre la présence réelle d'un `handling_guidance`.
- Aucune catégorie définie → aucun appel Claude (rien à quoi rattacher, pas de tokens brûlés pour un résultat que l'UI afficherait comme « non configuré »).

### Restitution d'une objection et filtre de certitude (migration 009, 31/07/2026)

- **Seules les objections « certaines » sont affichées.** Le classifieur se prononce explicitement (`confidence`), et toute valeur autre que `certaine` — absente, inventée, mal orthographiée — est traitée comme un doute. Décision produit : mieux vaut manquer une objection que d'en montrer une qui n'en est pas, parce que ces écrans sont montrés au client.
- **Le filtre est appliqué à la LECTURE, pas à l'extraction** : les incertaines restent en base. On peut donc déplacer le curseur sans tout ré-analyser, et le calibrage peut chiffrer ce qu'on écarte à tort. Elles ne sont exposées nulle part dans l'UI (décision du 31/07 : pas de zone « à confirmer »).
- **Le calibrage applique le MÊME filtre** : on mesure ce que le manager voit. Compter les incertaines gonflerait le rappel et dégraderait la précision sans rapport avec le vécu.
- **Restitution en trois couches** (`OccurrenceDetail.tsx`), du plus lisible au plus brut : des puces courtes (1-3 par côté, générées par le classifieur), puis le verbatim exact replié, puis l'extrait vidéo replié. En réunion de coaching on parcourt les puces et on ne déplie que le cas à travailler.
- **Le transcript envoyé au classifieur est construit sur les TOURS horodatés** (`calls.transcript_json`) et non sur les lignes du texte à plat, quand ils existent. C'est ce qui rend l'intervalle de lignes directement convertible en position dans l'enregistrement (`start_ms`/`end_ms`) — et donc la vidéo positionnable sur le moment exact. Sans horodatage (import de texte brut), les timings restent nuls et le bouton vidéo est simplement absent.
- La vidéo démarre **5 secondes avant** l'objection : tomber pile dessus prive du contexte qui l'a amenée, et c'est ce contexte qui rend le coaching utile. L'URL signée est redemandée à chaque ouverture, jamais stockée (règle projet).

### Onglet Performance > Objections
- `/dashboard/objections` : bibliothèque du manager (repliée une fois configurée), **filtre de période** (`lib/period.ts`, presets 7j/30j/3m/12m/tout + dates précises), puis une ligne par catégorie avec volume, barre de répartition bien/partiellement/non traitée, nombre de commerciaux concernés et taux de deals gagnés.
- `/dashboard/objections/[categoryId]` : le détail demandé — **qui** a rencontré cette objection sur la période, **quand**, ce que le prospect a dit et ce que le commercial a répondu (verbatims cités, repli sur le résumé étiqueté comme tel), ce qu'il aurait fallu répondre, la note et son commentaire. Une ligne par occurrence, pas par commercial (le même commercial peut l'avoir bien traitée une fois et esquivée la suivante). Segment `non-classees` réservé pour le fourre-tout.
- Période et commercial sélectionnés voyagent dans l'URL (`?period=/from=/to=`, `?commercial=`) et suivent les liens : « je regarde mars, je clique sur une objection » reste sur mars. Filtre de dates appliqué en JS sur `calls.started_at ?? created_at` (un OR sur ressource embarquée PostgREST serait illisible pour ce volume — même arbitrage que les agrégations JS de `getTeamAverageScores`).

### Onglet Performance > Analytics (`/dashboard/analytics`)
Calqué sur Claap : deux familles, une tuile par métrique, classement en barres par commercial avec la moyenne d'équipe en repère. Pas de librairie de graphiques (barres CSS proportionnelles).
- **Activité** (durée moyenne, volume hebdo, temps hebdo, volume et temps totaux) : lue **directement depuis `calls`** — donc disponible pour tous les calls, y compris sans transcript exploitable, et sans backfill.
- **Interactions** (ratio parole/écoute, plus long monologue, plus longue réponse prospect, score d'interactivité, patience, taux de questions) : lues depuis `call_analytics`, **précalculé à l'ingestion** par `lib/call-analytics.ts` (agréger des centaines de `transcript_json` à chaque rendu de page serait intenable). Backfill : `scripts/backfill-call-analytics.ts` (100 % local, aucun appel IA, relançable).
- `computeCallInteractionMetrics` renvoie `null` — donc aucune ligne écrite, donc call absent des moyennes — dans deux cas : moins de 5 tours, ou **commercial non identifié parmi les speakers**. Jamais d'heuristique « le plus bavard = le commercial ». Sans cette identification, « prospect » (= « pas le commercial ») n'a plus de sens et tous les compteurs commerciaux vaudraient 0 : persistés, ces zéros se liraient comme une contre-performance réelle.
- Moyenne d'équipe = moyenne **des commerciaux**, pas des calls (la question du manager est « où se situe ce commercial », pas « quel est le call moyen »), et seuls les commerciaux ayant au moins un call sur la période y entrent.
- Seuils « sain / à surveiller » regroupés dans la constante `HEALTHY` d'`AnalyticsClient.tsx` : ce sont les seuls jugements de valeur de l'onglet, ils doivent rester trouvables et discutables d'un coup d'œil.
- Côté commercial : seule sa propre barre est affichée, la moyenne d'équipe reste visible (repère agrégé, pas une donnée nominative sur un collègue).

### Playbook déplacé dans Performance
`/team/playbook` → **`/dashboard/playbook`**, onglet à côté d'Objections. Retiré des onglets `/team` ; l'ancienne route survit en `redirect()` (favoris managers + emails d'onboarding déjà envoyés), et son segment reste dans `KNOWN_SEGMENTS` de `TeamTabs` pour que la barre d'onglets ne clignote pas. **Lecture seule pour les commerciaux** (`readOnly` sur `PlaybookClient`/`MeetingStagesSection`) : c'est la grille sur laquelle ils sont notés, la leur cacher n'avait pas de sens. Purement visuel — les routes `/api/playbook/*` et `/api/team/meeting-stages` relisent déjà le rôle en base. Seul un manager déclenche `ensureDefaultPlaybookForOrganization` : une consultation par un commercial ne doit rien écrire.

### Banc d'essai : import de transcript (`/settings/import-call`, manager only)
- Rejoue **tout** le pipeline (scores playbook, objections, classification + évaluation, points clés, métriques d'interaction) sur un transcript fourni à la main. `POST /api/calls/import-transcript`, `maxDuration = 300` (plusieurs appels Claude en chaîne).
- **Recall ne sait pas transcrire un fichier uploadé** (vérifié dans leur doc le 29/07/2026 : l'API async transcript ne s'applique qu'à un enregistrement capté par leur bot ou leur SDK). Uploader une vidéo impliquerait donc un prestataire STT supplémentaire (AssemblyAI/Deepgram) + un upload direct vers Supabase Storage pour contourner la limite de 4,5 Mo de Vercel. Décision du 29/07/2026 : **transcript seul**, zéro nouvelle infra — c'est déjà ce qui teste la notation et la détection d'objections. Si la vidéo redevient nécessaire, c'est ce chemin-là qu'il faudra prendre.
- `lib/transcript-import.ts` parse `.vtt`, `.srt`, `.json` (transcript brut Recall **et** notre propre `TranscriptJson`), le format horodaté « `00:45 Nom: texte` » (Google Meet / Zoom / Fathom — les lignes suivantes sans horodatage sont rattachées à la même prise de parole) et le texte brut « Nom : phrase ». Repli sur le texte brut si un JSON est de forme inconnue.
- Piège à ne pas réintroduire : sur « `00:45 Dorian Monaco: Bonjour` », le premier `:` est celui de l'horodatage — un `splitSpeaker` naïf retient « 00 » comme locuteur et tout le transcript s'effondre sur deux ou trois faux locuteurs. L'horodatage est retiré avant, et `splitSpeaker` refuse en plus tout locuteur purement numérique (ceinture + bretelles).
- **`timingPrecision`** (`exact` | `coarse` | `none`) dit ce que la source permet réellement de mesurer, et `computeCallInteractionMetrics` prend une option `measurePatience` en conséquence :
  - `exact` (VTT/SRT/JSON, début ET fin) → toutes les métriques, patience comprise.
  - `coarse` (débuts seulement) → la fin d'un tour est le minimum entre le début du tour suivant et la durée de lecture du texte à ~150 mots/min. Le plafond ne fait que RÉDUIRE : sans lui, un blanc de 30 s serait compté comme du temps de parole et le ratio créditerait systématiquement celui qui précède les silences. **Patience non mesurée** — les silences étant refermés par construction, elle vaudrait 0 partout et se lirait comme « coupe la parole en permanence ».
  - `none` → `transcriptJson` reste null, aucune métrique. On n'estime pas les durées de TOUS les tours au nombre de mots : ça produirait des chiffres plausibles mais fabriqués.
- Quand aucun locuteur du transcript ne correspond au nom du commercial dans Brief, l'import le dit explicitement avec la liste des locuteurs trouvés — sinon l'onglet Analytics reste muet sans raison visible.
- Le call créé est un **call normal** (décision du 29/07/2026, pas de bac à sable) : il compte dans les statistiques, les analytics et la bibliothèque d'objections. Le call peut être attribué au manager ou à un de **ses** commerciaux liés — jamais un id arbitraire.

### Calibrage : mesurer la détection d'objections (`/settings/calibrage`, migration 008)

**Aucun réglage de prompt ne doit se juger sur une capture d'écran.** Le 29/07/2026, la définition d'une objection a été desserrée puis resserrée dans la même journée sans qu'on puisse dire lequel des deux réglages valait mieux : passer de 30 à 11 objections peut vouloir dire « on a retiré le bruit » comme « on a perdu la moitié du signal ». D'où ce socle.

- **L'annotation se fait dans l'app, pas en ligne de commande.** La personne qui a l'expertise métier (directeur commercial) n'est pas celle qui a accès au repo. Une première version reposait sur des fichiers `evals/objections/*.json` + un script de préparation : abandonnée le 30/07/2026 au profit de la table `objection_eval_annotations` et de la page `/settings/calibrage` (manager only). La base est la source **unique** — fichiers + base auraient fini par diverger.
- L'écran d'annotation (`/settings/calibrage/[callId]`) montre le transcript et la liste côte à côte, jamais sur deux pages : l'annotation ne vaut que si l'expert relit vraiment l'échange, et un aller-retour garantirait qu'il ne le fasse pas. La liste est pré-remplie avec la sortie du pipeline pour éviter la ressaisie, avec l'avertissement que le geste qui compte est d'**ajouter les objections manquantes** — le seul qui mesure le rappel.
- **`reviewed` reste faux tant que l'expert n'a pas validé, et la mesure ignore les non validés** : sinon on comparerait le pipeline à sa propre copie et on afficherait 100 % partout. C'est le seul garde-fou contre une éval qui se ment.
- `POST /api/objections/eval/run` (`maxDuration = 300`) **rejoue** extraction + rattachement sur le transcript réel plutôt que de lire `call_objections` : les données stockées peuvent dater d'un prompt antérieur, on veut mesurer le pipeline tel qu'il est maintenant. Résultats affichés dans la page : rappel / précision / bon rangement, plus le détail nominatif des objections ratées, en trop et mal rangées.
- `lib/objection-eval.ts` : appariement attendu ↔ obtenu par **similarité d'embeddings** (Voyage, seuil `MATCH_THRESHOLD`), parce que deux formulations de la même objection ne se ressemblent pas mot pour mot. C'est le bon usage des embeddings — reconnaître deux paraphrases — **à ne pas confondre avec le rattachement à une catégorie**, où la proximité thématique induit activement en erreur (« où sont vos équipes ? » est proche de « impossibilité d'écouter les appels » : deux sujets d'appels, deux intentions opposées). Micro-moyenne sur les objections, pas macro sur les calls, pour qu'un petit call parfait ne masque pas un gros call raté.
- `scripts/eval-objections.ts --org=<id>` fait la même mesure en ligne de commande, en lisant les mêmes annotations — pratique pour comparer deux versions de prompt sans passer par l'interface.

### Catégories suggérées : clustering des objections non classées (`lib/objection-clustering.ts`)

Quand le classifieur laisse une objection en « Non classées », c'est un signal — il manque une catégorie au manager. À 4 objections orphelines on repère le thème à l'œil ; à 60, non. Le bouton « Analyser » de `/dashboard/objections` regroupe les orphelines par proximité d'embedding, fait nommer chaque groupe par Claude, et propose au manager de créer la catégorie en un clic.

- **Deux étapes séparées, et c'est délibéré** : le regroupement est purement local (les embeddings sont déjà en base, coût nul) ; seule la mise en mots passe par Claude. Le regroupement ne décide de rien — il produit des candidats.
- **Seuil de similarité MESURÉ, pas supposé** : sur le corpus Oliverlist (voyage-3, 55 paires) les similarités vont de 0,09 à 0,64, médiane 0,30. Une première valeur à 0,72 posée d'intuition ne pouvait rien regrouper. **Les plages de similarité varient fortement d'un modèle d'embedding à l'autre — toujours relever la distribution sur le corpus visé avant de fixer un seuil.** Retenu : 0,55 (à 0,50 le plus gros groupe absorbe un intrus, à 0,45 tout s'effondre en un fourre-tout de 7).
- **La similarité seule ne suffit pas, et il faut le savoir** : sur ce corpus la paire la MIEUX notée (0,638) est un faux positif — « la conversion des leads achetés est trop faible » (rentabilité) et « on a été échaudés par un prestataire » (mauvaise expérience) parlent du même sujet avec des intentions différentes. Aucun seuil ne peut retenir les vraies familles et écarter celle-là, puisqu'elle les domine. D'où l'étape de nommage qui **élague les intrus et peut omettre un groupe entier**, et la validation finale par le manager.
- Regroupement autour d'un centroïde recalculé, jamais par lien simple : le lien simple enchaîne (A proche de B, B proche de C → A et C ensemble) et produit exactement les fourre-tout qu'on cherche à éviter.
- La suggestion ne propose **jamais** de `handling_guidance` : c'est l'expertise du directeur commercial, et c'est la référence contre laquelle ses commerciaux sont notés. Une méthode inventée par le modèle serait ensuite utilisée comme si elle venait de lui.

### Backfills
- `scripts/backfill-objection-classification.ts` : classe les objections déjà en base. À lancer **après** avoir créé les catégories. Ne retouche que les lignes jamais classées (`classified_at` null) sauf `--all`. Sans backfill, l'onglet Objections démarre entièrement en « Non classées ».
- `scripts/backfill-call-analytics.ts` : remplit `call_analytics` depuis les `transcript_json` existants. Sans lui, seul l'onglet Activité a des données au déploiement.

## Email de suivi — génération à la demande (17/08/2026)

- À l'ingestion, le bot-webhook **saute** l'email de suivi quand le call n'a pas de `contact_email`. Or `contactEmail` vient du **premier participant externe de l'invitation d'agenda** (`syncAndScheduleForUser`, lib/recall.ts) : une réunion créée sans inviter le prospect, une invitation acceptée depuis une autre adresse, ou un RDV posé à la main donnent un `contact_email` nul. Corrélation vérifiée sur les calls d'Oliverlist : tout call sans contact est sans email de suivi, tous les autres en ont un.
- L'écran affichait alors « Email de suivi en cours de génération… » **indéfiniment**, alors que rien ne tournait et que rien ne permettait de rattraper. Un message d'attente sur une opération qui n'aura jamais lieu est pire qu'un message d'erreur : l'utilisateur revient, attend, et finit par croire le produit cassé.
- `POST /api/feedback/[id]/follow-up` génère à la demande, avec un destinataire saisi par l'utilisateur. Le transcript et l'analyse existent déjà — seul le destinataire manquait. Même résolution propriétaire-puis-manager que `/feedback/[id]/key-points`.
- **Règle générale** : un état d'attente ne doit être affiché que si quelque chose est effectivement en cours. Sinon, dire ce qui manque et proposer l'action qui débloque.
- L'import de transcript (`/settings/import-call`) ne génère pas non plus d'email de suivi — c'est un banc d'essai du scoring, pas un remplaçant du pipeline complet. Le bouton de génération à la demande couvre ce cas aussi.

## Bibliothèque d'objections & win/loss

Livré et testé en conditions réelles sur le compte Oliverlist le 19 juillet 2026 (backfill lancé, RPC vérifiée contre la vraie base, un bug de données legacy trouvé et corrigé au passage — voir bug #18).

- `call_analysis.objections` (jsonb) : colonne préexistante mais morte jusque-là (`saveCallAnalysis` l'écrivait toujours à `[]`) — persiste maintenant `{objection, response}[]`, extrait par Claude dans le même appel que le reste de l'analyse (`analyzeCall`)
- `call_objections` : table dédiée, indexée par organisation (comme le playbook, pas par user — un commercial junior bénéficie des objections déjà traitées par toute l'équipe) via embeddings Voyage AI (`lib/objections.ts`, RPC `match_call_objections`, même schéma que `match_client_references`/`findSimilarReferences` mais avec `supabaseAdmin`, pas le client anon)
- `deal_outcomes` : signal win/loss unifié, `contact_email` comme clé de jointure (pas d'id CRM stocké côté Brief). Deux sources : `quote` écrite en synchrone au moment même de l'acceptation/refus (`acceptQuoteByPublicToken`/`rejectQuoteByPublicToken`, aucun cron nécessaire) et `hubspot`/`pipedrive` via le cron `syncDealOutcomes` (30 min, `lib/inngest-functions.ts`) qui n'interroge que les contacts encore non résolus pour cette source
- `findClosedDealsForEmail` (lib/crm/hubspot.ts, lib/crm/pipedrive.ts) : symétrique de `findHubSpotDealForEmail`/`findPipedriveDealForEmail` qui filtrent les deals fermés — celle-ci ne garde QUE les deals `closedwon`/`closedlost`
- UI commercial : bloc "Cas similaires déjà traités" dans `/feedback/[id]`, recherche à la demande (`app/api/objections/similar`), pas préchargée
- UI manager : `/team/insights` — objections les plus fréquentes + taux de succès, scores playbook comparés gagné/perdu (`getObjectionStatsForOrganization`/`getDimensionScoresByOutcome`, même pattern d'agrégation JS que `getTeamAverageScores` car les clés de dimension sont dynamiques par org, pas agrégeable proprement en SQL)
- `scripts/backfill-objections.ts` : ré-extrait les objections des calls existants (transcript déjà en base) sans re-scorer le reste de l'analyse

## Conventions de code

### Patterns clés
- `lib/db.ts` : toutes les fonctions DB centralisées ici, toujours `supabaseAdmin`
- `lib/api-auth.ts` : `requireActiveUser(session)` en tête de toutes les routes sensibles
- `lib/admin-config.ts` : imports dynamiques obligatoires (évite le bundle client — SERVICE_ROLE_KEY ne doit jamais fuiter)
- Prompts éditables : stockés dans `admin_config` (table key/value), pas dans des fichiers
- Idempotence systématique : contraintes UNIQUE en base + upserts partout (briefs, calls, tasks, notes HubSpot)
- Server components : `getEffectiveUserId()` de `lib/session-user.ts`
- Route handlers : `requireActiveUser(session)` de `lib/api-auth.ts`
- Effets de bord post-réponse (sync HubSpot, tracking, dispatch) : TOUJOURS dans `after()` de `next/server` — jamais une promesse `.catch()` nue, Vercel gèle la fonction dès la réponse envoyée (cf. bug #19)
- Échec volontairement NON bloquant : passer par `reportError`/`reportWarning` de `lib/monitoring.ts` plutôt qu'un `console.error` nu. Un `catch` qui log et continue est le bon comportement fonctionnel, mais sur un webhook ou un cron **personne n'apprend jamais qu'il se déclenche** — c'est le fil rouge des bugs #15, #19, #20 et #25. Le `scope` passé en premier argument est une clé de regroupement stable (`module.étape`), à ne pas faire varier d'un appel à l'autre. Ces helpers ne throw jamais : ils sont appelés depuis des blocs catch.
- Rate limiting : `lib/rate-limit.ts` (fabrique in-memory) — `checkRateLimit` pour les briefs (quotas serrés), `checkAiGenerationRateLimit` pour les 9 autres routes de génération IA (60/h IP, 200/j user). Toute NOUVELLE route de génération IA doit brancher `checkAiGenerationRateLimit` + `requestIp`

### Design system (migration Lovable terminée le 21 juillet 2026)
- Tokens oklch dans `app/globals.css` : la marque est le **bleu #2A5CE0** mais les tokens gardent leurs noms historiques — `--violet` (= le bleu de marque), `--lavender`, `--lavender-strong`, `border-border`, ombres via les variables `--shadow-xs` / `--shadow-sm` / `--shadow-md` / `--shadow-glow`, classe `brand-gradient` pour les boutons primaires (+ `hover:brightness-110`). ATTENTION : Tailwind v4 scanne aussi les fichiers markdown du repo — ne jamais écrire de classe arbitraire invalide (crochets + slash) dans une doc, ça casse la compilation CSS
- Primitives partagées : `app/components/ui/ui-bits.tsx` (Button, Card, ScoreChip, SentimentChip, StatCard, StatusChip, Eyebrow) + `PageHeader.tsx` + `TopBar.tsx` (breadcrumb, dans les 10 layouts)
- Fonts scopées via la classe `.brief-ui` (Inter Tight + Instrument Serif italic)
- **Zéro classe `indigo-*` hors `/admin`** (qui garde volontairement son design dédié). Toute nouvelle UI utilise les tokens, jamais indigo/violet Tailwind littéral (exception : couleurs catégorielles type badges emerald/amber/violet-50)
- Mobile : sidebar en drawer auto-contenu (`AppSidebar.tsx`, `useState` + translate + auto-close sur pathname), layouts en `ml-0 lg:ml-60`, tables larges dans `overflow-x-auto`

### Génération IA — règles critiques
- Modèle principal : `claude-sonnet-4-6` / léger : `claude-haiku-4-5-20251001`
- `max_tokens` : minimum 1500 pour les sorties JSON (800 = troncature garantie)
- Toujours `extractJsonObject` de `lib/ai-json.ts` après réponse IA (préambule/postambule possible, sanitize aussi les caractères de contrôle bruts dans les strings JSON) — uniformisé le 19 juillet 2026 sur toutes les routes de génération JSON (`lib/brief-generator.ts`, `lib/call-analysis.ts`, `lib/email-followup.ts`, `app/api/quotes/generate`, `app/api/quotes/[quoteId]/generate-email`, `app/api/tasks/[taskId]/generate-email`, `app/api/playbook/import`)
- Toujours logger la réponse brute en cas d'erreur JSON parsing
- Validation runtime de la forme : **`validateAiShape` (lib/ai-shape.ts) après CHAQUE `JSON.parse` d'une réponse IA dont le prompt est éditable** — il throw en nommant les clés fautives ET le prompt `admin_config` en cause, et remonte dans Sentry. Sans lui, les valeurs de repli transformaient une réponse hors contrat en contenu vide, sans erreur : email blanc, devis sans ligne, playbook sans dimension. Pire, `generateFollowUpEmail` mettait la réponse BRUTE du modèle dans le corps d'un email de suivi prêt à partir au prospect. `validateCallAnalysisShape` (lib/call-analysis.ts) vérifie les clés obligatoires après parsing — un prompt admin_config périmé ne peut plus produire des champs `null` silencieux (cf. bug #20). À répliquer sur toute nouvelle route dont le prompt est éditable en admin
- Contrat JSON : forcer côté serveur dans le system prompt, jamais dans le template manager
- Web search : `web_search_20250305`, max_uses: 3 — activé pour tous les briefs. Avec le web search, utiliser `.filter(b => b.type === "text").pop()` (pas `.find()`) — la réponse contient d'autres blocs (citations, résultats) et le texte utile est le dernier bloc

## Bugs critiques résolus — patterns à ne pas reproduire

1. **Structure Recall transcript** : `segment.participant.{id,name,email}` — PAS `segment.speaker`. Affichait "Unknown" partout.
2. **PostgREST 1:1 vs tableau** : contrainte UNIQUE sur `call_analysis.call_id` → retourne objet pas tableau. Utiliser `normalizeCallAnalysis()`.
3. **Pipedrive / HubSpot double https://** : `api_domain` contient déjà `https://`, ne jamais préfixer.
4. **HubSpot scopes** : `crm.objects.notes.*` et `crm.objects.meetings.*` n'existent pas. Couvert par `contacts.write + deals.write`.
5. **HubSpot note↔meeting** : pas d'association possible — écrire dans `hs_meeting_body` directement.
6. **Google Calendar scope** : `calendar.readonly` ≠ `calendar.events`. Écriture requiert `calendar.events`. Users existants doivent reconsentir.
7. **JSON tronqué web_search** : `.filter(b => b.type === "text").pop()` — pas `.find()`.
8. **useState figé sur prop** : React ne re-lit pas la prop initiale. Utiliser le pattern "Adjusting state during render".
9. **Calls dupliqués webhook retry** : contrainte UNIQUE sur `recall_bot_id` + upsert.
10. **Claude Code silencieux** : peut modifier des fichiers sans les commiter. Toujours `git status` avant `git push`.
11. **URL vidéo Recall** : signée S3, expire ~5h — ne jamais stocker en base.
12. **Fuite bundle client via import transitif** : `lib/dashboard.ts` (consommé par des composants client animés) importait une fonction de `lib/digest.ts`, qui charge le SDK Anthropic — aurait fait fuiter le SDK (et potentiellement la clé API) dans le bundle client. `lib/dashboard.ts` doit rester dépendance-free (pas de `lib/digest.ts`, pas de `lib/db.ts`) ; la logique métier partagée (bucketing par semaine) vit dans `lib/paris-week.ts`, sans dépendance non plus.
13. **`pdf-parse` v2 a cassé l'API v1** : le package est passé d'une fonction callable (`pdfParse(buffer)`) à une classe (`new PDFParse({ data: buffer }).getText()`). Tout upload PDF (import playbook) échouait silencieusement avec `pdfParse is not a function`. Deux consommateurs à surveiller si le package est retouché : `app/api/playbook/import/route.ts` et `lib/inngest-functions.ts`.
14. **Migration SQL pas encore passée en prod → page entière plantée** : `getImportHubSpotTasksSetting` (nouvelle colonne `users.import_hubspot_tasks`) faisait planter tout `/tasks/settings` via `Promise.all` avant que la migration soit exécutée sur Supabase prod. Pattern à généraliser : toute requête sur une colonne ajoutée récemment doit être wrappée en `.catch()` avec fallback plutôt que de laisser `Promise.all` propager l'erreur et faire tomber toute une page serveur.
15. **Stripe `invoice.payment_succeeded` écrasait `trialing`** : Stripe émet cet événement aussi pour la facture à 0€ générée au démarrage d'un essai (rien à payer). Le handler `handlePaymentSucceeded` (webhook facturation) mettait `billing_status` à `active` sans condition, court-circuitant `trialing` dès le jour 1. Découvert en testant un vrai Checkout en conditions réelles sur le compte Oliverlist — l'état Stripe était correct, seul l'état Brief était faux. Fix : n'agir que si `billing_status === 'grace_period'` (le seul cas que ce handler doit vraiment traiter — sortie de grâce après paiement qui finit par passer).
16. **Webhook Stripe : événement `customer.subscription.created` non coché côté dashboard** : le code gérait déjà ce cas dans son switch, mais Stripe ne l'envoyait jamais car l'endpoint n'était souscrit qu'à 5 événements sur 6 nécessaires. Résultat : `current_period_start/end` et `billing_interval` jamais renseignés côté Brief même une fois le bug #15 corrigé. Pas un bug de code — vérifier la liste des événements cochés sur le webhook dans le Dashboard Stripe à chaque fois qu'un nouveau `case` est ajouté au switch.
17. **Réabonnement Stripe après résiliation échouait** : `checkout.sessions.create` avec un `customer` existant + `tax_id_collection: { enabled: true }` exige `customer_update: { name: "auto" }`, sinon Stripe refuse avec "Tax ID collection requires updating business name on the customer." Invisible au premier abonnement (`customer_email`, pas de `customer` existant) — repéré uniquement en testant un vrai réabonnement après résiliation sur le compte Oliverlist. Reproduit et vérifié directement contre l'API Stripe réelle avant et après le fix (`lib/stripe.ts`, `createOrganizationCheckoutSession`).
18. **Format legacy sur `call_analysis.objections`** : le call de référence Ravachol avait déjà un `objections` non vide, mais en `string[]` brut — vestige d'une version antérieure et non documentée du prompt, d'avant que la colonne soit mise à toujours écrire `[]`. Repéré uniquement en lançant le backfill contre la vraie base (aucune trace de ce format dans le code ni la doc). Fix centralisé dans `normalizeCallAnalysis` (lib/db.ts), le seul chokepoint par lequel passent toutes les lectures de `call_analysis` — coerce les strings brutes en `{objection, response}` avec un texte de réponse placeholder, plutôt que de patcher chacun des call sites qui lisent `.objections`.
19. **Fire-and-forget tué par Vercel (récidive du pattern #40 de BRIEF_CONTEXT)** : toute promesse non-awaitée lancée après la réponse HTTP peut être gelée par Vercel avant de s'exécuter. Le fix `after()` n'avait été appliqué qu'à generate-brief — retrouvé sur `tasks/complete` (sync HubSpot), `tasks/dismiss`, `public/quotes/[token]` (tracking "vu"). Corrigé le 21 juillet 2026. Règle : `after()` systématique pour tout effet de bord post-réponse.
20. **Prompt admin_config périmé → analyse aux champs null silencieux** (bug "William", 20 juillet 2026) : `call_analysis_system_prompt` édité en base le 9 juillet ne correspondait plus au contrat JSON du code — `JSON.parse(...) as CallAnalysis` laissait passer, `strengths`/`weaknesses`/`scores` arrivaient `null` en base sans aucune erreur. Fix : reset du prompt au défaut + `validateCallAnalysisShape` (validation runtime qui throw au lieu de laisser passer). Un seul call affecté (vérifié par requête `scores IS NULL`).
21. **`/notifications` absent du matcher middleware** : la page vérifiait la session elle-même mais le middleware est le seul à appliquer `disabled_at` + blocage facturation — un user désactivé ou une org bloquée y accédait encore. À chaque nouvelle page top-level : ajouter la route au matcher de `middleware.ts`.
22. **`token.role` figé jusqu'à re-login** : le callback `jwt` ne posait le rôle qu'à la connexion (`if (account)`) — un commercial promu manager ne voyait pas le menu "Équipe" avant de se déconnecter/reconnecter. Fix : refresh du rôle depuis la base toutes les 10 min max (`roleRefreshedAt` dans le JWT). Les routes API relisaient déjà le rôle en base (à conserver — le JWT peut avoir jusqu'à 10 min de retard).

23. **`call_objections` empilait les objections à chaque ré-analyse** (30 juillet 2026) : `indexCallObjections` faisait un `insert` nu. Trois calls d'Oliverlist ré-analysés 5 à 7 fois avaient produit 72 lignes pour 13 objections réelles — la même objection s'affichait huit fois dans le détail d'une catégorie. Bug latent depuis juillet, révélé seulement par la nouvelle page de détail. Pas de contrainte UNIQUE possible ici : le texte de l'objection est reformulé à chaque extraction, il ne peut pas servir de clé. Fix : relever les ids existants du call, insérer la nouvelle version, PUIS supprimer les anciens — dans cet ordre, pour qu'un insert en échec laisse l'ancienne version plutôt qu'un call sans rien. **Généralisation : la règle « UPSERT + UNIQUE » vaut aussi quand aucune clé naturelle n'existe — il faut alors un remplacement explicite par parent.**

24. **Un prompt `admin_config` édité en base prime silencieusement sur le défaut du code** : modifier `DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT` n'avait AUCUN effet sur Oliverlist, dont la ligne `admin_config` contenait une version personnalisée. Toute évolution d'un prompt par défaut doit être répercutée dans la ligne en base — en vérifiant d'abord si elle est une copie conforme de l'ancien défaut (remplacement complet) ou une vraie personnalisation (n'insérer que le bloc concerné). Cousin du bug #20 mais dans l'autre sens : là le prompt en base était périmé, ici c'est le fix du code qui n'atteignait pas la base.

25. **Une réponse JSON tronquée fait perdre TOUT le lot, pas seulement le surplus** : deux calls portant 34 et 26 objections dépassaient `max_tokens`, le JSON arrivait coupé et la classification de toutes les objections de ces calls était perdue d'un coup (60 sur 72). Relever `max_tokens` ne suffit pas — il faut **borner la taille du lot**. Fix à trois niveaux : lots de 10, sortie raccourcie (numéros de ligne plutôt que citations recopiées), et reprise sur échec de parsing (un nouvel essai, puis découpage du lot en deux). Règle : toute route qui traite une liste de taille non bornée par un seul appel IA doit découper.

26. **Barre d'onglets non collante = navigation perdue** : la `TopBar` était `sticky`, pas `PerformanceTabs`. Sur une page à peine plus haute que l'écran, quelques pixels de défilement suffisaient à faire glisser les onglets sous la TopBar sans aucun moyen de revenir en arrière. Toute barre de navigation persistante placée sous une TopBar collante doit l'être aussi (`sticky top-14`, z-index en dessous).

## Règles — NE JAMAIS faire

- ❌ Utiliser le client Supabase anon côté serveur (toujours service_role)
- ❌ Inventer un scope OAuth — toujours vérifier la doc officielle
- ❌ Utiliser les endpoints Recall US (EU-only : `eu-central-1.recall.ai`)
- ❌ Stocker l'URL vidéo Recall en base
- ❌ Mettre le contrat JSON dans le template manager (forcer côté serveur)
- ❌ Retourner des données cross-user/org
- ❌ Rendre les routes `/api/admin/*` soumises à l'impersonation
- ❌ Push sans `git status` — Claude Code peut avoir modifié sans stager
- ❌ Casser l'idempotence (UPSERT + contrainte UNIQUE obligatoires)
- ❌ `max_tokens` < 1500 sur les routes de génération JSON
- ❌ Lancer une promesse non-awaitée après la réponse HTTP sans `after()` (Vercel la tue)
- ❌ Ajouter une page top-level sans l'ajouter au matcher de `middleware.ts`
- ❌ Utiliser des classes `indigo-*` (ou violet/purple Tailwind littéral pour la marque) hors `/admin` — toujours les tokens du design system
- ❌ Créer une route de génération IA sans `checkAiGenerationRateLimit`
- ❌ Faire traiter par un seul appel IA une liste dont la taille n'est pas bornée — découper en lots (cf. bug #25)
- ❌ Modifier un prompt par défaut sans vérifier si une version éditée existe dans `admin_config` (cf. bug #24)
- ❌ Afficher comme une citation un texte produit par le modèle sans l'avoir ancré au transcript (numéros de ligne, jamais de copie mot à mot vérifiée après coup)
- ❌ Mettre dans un prompt partagé un contre-exemple propre à un client — ça dégrade tous les autres ; la spécificité client vit dans sa configuration

## Commandes

```bash
# Dev
npm run dev                          # Turbopack, port 3000

# HubSpot deploy (depuis sous-dossier uniquement)
cd Brief && hs project upload && cd ..

# Backfill call unique
npx ts-node scripts/backfill-single-call.ts <call_id>

# Scripts du chantier objections (préfixe commun)
#   node --env-file=.env.local --experimental-strip-types \
#     --import ./scripts/lib/register-loader.mjs scripts/<script>.ts
#
#   backfill-objections.ts [--force]        ré-extrait les objections (--force = même si déjà présentes)
#   backfill-objection-classification.ts    classe les objections déjà en base (--all pour tout reclasser)
#   backfill-call-analytics.ts              remplit call_analytics (local, aucun appel IA)
#   dedupe-call-objections.ts [--apply]     nettoie les doublons de ré-analyses (simulation par défaut)
#   eval-objections.ts --org=<id>           mesure le pipeline contre le jeu de référence annoté

# Toujours avant push
git status
git add . && git commit -m "..." && git push
```

## Roadmap prioritaire

Fait depuis la dernière mise à jour (20-21 juillet 2026) : **refonte visuelle complète direction Lovable** (nouveau système de tokens oklch bleu #2A5CE0, primitives partagées `ui-bits.tsx`/`PageHeader`/`TopBar`, refonte landing + liste feedback + dashboard, fix du scoping `.brief-ui` qui n'avait jamais fonctionné), **version mobile responsive** (sidebar drawer), **fix bug "William"** (prompt d'analyse admin_config périmé → champs null silencieux, voir bug #20), puis **audit complet du repo** suivi de **6 correctifs** (`after()` généralisé, `/notifications` au middleware, refresh rôle JWT 10 min, validation runtime analyse IA, auth sur google-oauth/start, rate limiting étendu aux 9 routes de génération IA) et **fin de la migration visuelle** (les 25 fichiers non-admin restants — onboarding, modales, références, page publique devis, compte-suspendu — zéro `indigo-*` hors /admin).

### Chantier objections — en cours (30 juillet 2026)
0. **Migration 008 à exécuter sur Supabase prod** (`objection_eval_annotations`) — sans elle `/settings/calibrage` ne peut rien enregistrer. 006 et 007 déjà passées.
0b. **Faire annoter 3-4 calls par le directeur commercial** dans Paramètres > Calibrage, puis lancer la mesure. Tout le reste du chantier en dépend : c'est la première mesure qui dit quel levier tirer.
0c. **Test d'accord inter-annotateur** : Jean et son associé annotent le MÊME call séparément et comparent. Ce pourcentage est le plafond réel de l'IA — elle ne peut pas être plus cohérente que la définition elle-même. Vingt minutes, et ça évite de courir après un 100 % qui n'existe pas.
Puis, dans l'ordre et **un changement à la fois, mesure avant / mesure après** : (1) contre-exemples réels dans le prompt, en veillant à n'y mettre que ce qui vaut pour tout commercial B2B ; (2) passe de vérification sur le rattachement, seulement si le « bon rangement » reste bas ; (3) clustering Voyage des non classées pour proposer les catégories manquantes (indépendant, parallélisable) ; (4) vote à trois sur l'extraction, en dernier recours. Avec 4 calls, une objection pèse ~7 points : ne poursuivre que les écarts francs.

### Déblocants business (priorité immédiate)
1. Google OAuth — sortir du mode Testing (bloque toute croissance au-delà des comptes whitelistés). `gmail.readonly` retiré des scopes le 25/07/2026 précisément pour lever ce blocant sans passer par l'audit CASA payant (voir section OAuth ci-dessus) — reste à ajouter/re-déclarer les 3 scopes actuels dans Google Cloud Console (`calendar.events`, `gmail.metadata`, `gmail.send`) et lancer la vérification standard (gratuite, 2-6 semaines)
2. Stripe en mode Live — activation compte (vérification entreprise). **Avant la bascule, trancher le pricing usage** : recommandation audit = quota d'heures inclus par siège (ex. 10h/mois puis 0,50€/h) plutôt que la refacturation sèche dès la 1ère heure — évite les lignes de facture à 3€ qui font poser des questions, et change la facturation AVANT les premiers clients payants plutôt qu'après

### Recommandations audit du 21 juillet (par ratio effort/valeur)
3. ~~**Sentry** sur webhooks + crons~~ — FAIT le 31/07/2026. `SENTRY_DSN` posée sur Vercel le 31/07/2026. **Vérification permanente** : `/admin/dashboard` → carte « Monitoring » — indique si la DSN est présente sur l'environnement courant et permet d'envoyer une erreur de test à la demande. À rejouer après tout changement de DSN : un monitoring qu'on croit actif alors qu'il ne l'est pas est pire que pas de monitoring, on cesse de surveiller en se croyant couvert. Les stack traces seront minifiées tant que `withSentryConfig` n'est pas ajouté à `next.config.ts` (nécessite un `SENTRY_AUTH_TOKEN`) — à faire seulement si les traces s'avèrent illisibles.
4. **Checklist d'activation** sur le dashboard ("Démarrage : 2/4 étapes" — agenda, CRM, playbook, premier brief) — à faire avant d'ouvrir Google OAuth, sinon les invités décrochent sur un dashboard vide
5. **Notifications inbox** : la cloche TopBar mène vers des préférences, pas une inbox — les événements existent déjà en base (devis accepté, réponse prospect, call analysé), il manque une table + un compteur
6. ~~**Recherche globale v1**~~ — FAIT le 31/07/2026 (`app/components/GlobalSearch.tsx`, `/api/search`, `searchEverything`). `ilike` sur contacts + calls, ⌘K, navigation clavier. **Périmètre : ses propres données + celles de ses commerciaux liés si manager** — sans cette extension la fonction ne renvoyait rien pour son premier utilisateur, un manager passant peu d'appels lui-même (constaté sur les vraies données avant déploiement). Les jokers `%`/`_` sont échappés, sans quoi une recherche sur `%` renverrait tout.
7. ~~**Dossier `migrations/`** committé~~ — FAIT (8 migrations numérotées au 30/07/2026). Règle en vigueur : toute nouvelle migration y est committée, même appliquée à la main.
8. ~~**Tests sur les flux irréversibles**~~ — FAIT le 31/07/2026. `npm test` (node:test + le loader strip-types déjà utilisé par les scripts, **zéro dépendance ajoutée**). 21 tests dans `tests/`, chacun nommant le bug qu'il verrouille. Les décisions à risque ont été extraites des routes vers `lib/billing-rules.ts` pour être testables sans simuler Stripe ni la base. Suite validée par mutation : réintroduire les bugs #15 et #1 fait bien échouer 3 tests.
9. ~~**Validation runtime des autres prompts JSON**~~ — FAIT le 31/07/2026 (`lib/ai-shape.ts`, appliqué aux 5 routes JSON restantes). Reste le bouton "restaurer le défaut" par prompt. Ancien libellé : **Validation runtime des autres prompts JSON** `admin_config` (même pattern que `validateCallAnalysisShape` — au 30/07/2026 seuls `lib/call-analysis.ts` et `lib/training.ts` l'ont) + bouton "restaurer le défaut" par prompt. Renforcé par le bug #24 : un prompt édité en base prime silencieusement sur le code, donc la validation runtime est la seule protection.

### Expansion produit
10. Ringover/Aircall — téléphonie. **Passé devant Sellsy** (reco audit) : la cible PME/ETI FR fait plus d'appels tél que de visios, Brief ne voit aujourd'hui qu'une fraction de l'activité réelle
11. Sellsy CRM — lecture
12. Proxycurl LinkedIn — enrichissement contact
13. Activer Pappers payant — "données légales FR" est dans le positionnement mais tourne sans crédits (fallback mémoire Claude)
14. Mobile : dashboard mobile orienté "Prochain RDV + son brief" (le cas d'usage mobile réel = relire son brief 5 min avant le RDV)
15. Long terme : bibliothèque objections + win/loss agrégée/anonymisée par secteur = potentiel tier premium "benchmarks marché FR" (à valider RGPD)

## Comptes de test
- Jean (manager) : `jean.dereviers@oliverlist.com` — user_id `ee6772b4-423f-4091-a140-bf3991919c8b`
- Hubert (commercial) : `hubert.delalance@oliverlist.com` — user_id `39addb01-3110-4c96-ad24-2b22904bcd68`
- Org Oliverlist : `5a90c843-b6c2-4be2-ab64-7469216253d0`
- Call de référence backfilé : `16729b33-f56b-42a0-8687-c7dc0ae706f9` (Ravachol / Velbrun Capital)
