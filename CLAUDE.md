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
- **Plus aucune lecture de Gmail (19/08/2026)** : `gmail.metadata` retiré à son tour, en préparant la vérification Google. Motif : toute lecture de messagerie est la zone la plus scrutée de l'examen, et la détection de réponse ne valait pas le risque d'allonger de plusieurs semaines une vérification dont dépend l'ingestion de **tous** les utilisateurs. Il ne reste que `gmail.send`. Supprimés avec le scope : `checkThreadReply` (`lib/gmail.ts`), la route `/api/feedback/check-reply`, le badge « le prospect a répondu » sur `/feedback/[id]`, et **les agrégats** — taux de réponse (liste contacts + fiche contact), compteur `replies_count`, « en attente de réponse » du tableau de bord.
  - **Pourquoi retirer les agrégats et pas seulement la détection** : sans alimentation, un taux de réponse reste figé à 0 %. Sur un produit qui juge la performance de commerciaux, un indicateur qui affiche « 0 % de réponses » alors qu'on a simplement cessé de mesurer est pire que pas d'indicateur du tout.
  - **Ce qui est conservé** : la colonne `calls.replied_at` (l'historique reste vrai, il n'est simplement plus alimenté) et le bloc `ReplyEntry` de la fiche contact, qui l'affiche pour les échanges antérieurs — il porte aussi le formulaire de relance manuelle (`send-reply`, `gmail.send`).
  - Si la détection de réponse redevient un jour nécessaire : il faut redemander `gmail.metadata`, **le redéclarer dans Data Access** (il n'y était pas), et repasser une vérification.
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

## Onboarding — expliquer avant de demander (17/08/2026)

L'onboarding enchaînait 4 questions sur l'offre sans jamais dire à quoi elles servaient : on y répondait vite pour passer à la suite, et on arrivait sur un tableau de bord vide sans comprendre pourquoi.

- **Chaque étape annonce d'abord ce que fait Brief, puis demande ce dont il a besoin pour le faire.** Les étapes portent un `pillar` (Préparer / Débriefer / Progresser, mêmes mots que la landing) et une `promise` affichée AVANT la question.
- **Aperçu du futur brief en direct** (`BriefPreview.tsx`) à côté des étapes de profil : chaque réponse se matérialise dans le document que l'utilisateur recevra. Un bloc figé montre ce que Brief récupère tout seul (entreprise, actualité, historique), pour faire comprendre que l'essentiel est automatique et que les questions ne servent qu'à personnaliser. Les lignes non remplies restent visibles en gris — montrer ce qui manque motive plus que masquer. Masqué en mobile et sur les étapes 4-5, où il détournerait de l'action attendue.
- **La connexion agenda est DANS le flux** (étape 4), plus renvoyée aux paramètres : c'est l'étape qui conditionne tout le reste, la reporter revient à la perdre.
- `/api/recall/google-oauth/start` accepte un `?return=` (chemin **relatif uniquement**, `..` rejeté — sinon la route devient une redirection ouverte exploitable pour de l'hameçonnage depuis un lien qui semble venir de Brief). Le callback lit le cookie posé et y revient. L'onboarding s'en sert pour reprendre à l'étape 4 au lieu d'éjecter dans les paramètres, et **enregistre le profil avant de partir chez Google** — l'OAuth quitte la page, les étapes déjà remplies seraient sinon perdues.
- `useSearchParams` est à proscrire sur cette page : elle impose une frontière Suspense au prérendu et fait échouer le build. Lire `window.location.search` dans un initialiseur `useState`.

### Visite guidée et routes de démonstration (`/demo/*`, `GuidedTour.tsx`)

La visite se déroule **entièrement sur des écrans réels peuplés de données d'exemple**, pas sur des maquettes ni sur des écrans vides. 10 étapes, 6 routes.

- **Des ROUTES `/demo` dédiées, jamais un mode démo sur les vraies pages.** Un drapeau resté actif par accident ferait regarder de fausses données à un utilisateur en lui laissant croire que ce sont les siennes — sur un produit qui juge la performance de commerciaux, c'est le pire scénario possible. Avec des routes séparées la contamination est **structurellement impossible** : les vraies pages ne connaissent même pas `lib/demo-data.ts`. Bandeau permanent non masquable en complément, et sortie de visite qui ramène sur `/dashboard`.
- **Séparer lecture et affichage** est le prérequis : `CommercialOverview` (lit) / `CommercialOverviewView` (affiche). `AnalyticsClient` et `FeedbackClient` recevaient déjà leurs données en props — ce sont donc les VRAIS composants qui s'affichent en démo. Bénéfice au-delà de la démo : ces vues se rendent sans base ni session, donc elles sont testables.
- **Duplication assumée sur Objections et Playbook** : la première mêle sélecteur de commercial, bibliothèque manager et suggestions de catégories (aucun sens en démo) ; la seconde est un composant d'ÉDITION dont les boutons brancheraient des routes qui refuseraient l'écriture. Environ 100 lignes de présentation recopiées, signalées en commentaire dans chaque fichier — à reporter si la vraie page évolue.
- **Le jeu de données est cohérent d'un écran à l'autre** (le call de la vue d'ensemble est celui dont on lit les objections) et **volontairement imparfait** : un commercial fictif à 4,8/5 qui traite toutes ses objections ne démontre rien. Camille Roussel progresse de 2,6 à 3,4 mais bute sur « équipe commerciale interne » — 7 occurrences, 4 non traitées, 4 deals perdus. C'est cet écart qui rend le produit lisible en un coup d'œil.
- **Ne démarre jamais toute seule** : uniquement sur `?tour=1`, depuis `/bienvenue` ou l'aide. Désactivée sous 1024 px (sidebar en tiroir). `GuidedTour` doit être monté dans le layout de chaque page visitée — c'est `app/demo/layout.tsx` plus `app/dashboard/layout.tsx` pour le point d'entrée.
- **Une cible introuvable n'est JAMAIS passée automatiquement** : la bulle s'affiche seule, sans surbrillance. Le saut automatique provoquait un emballement — `next` change d'identité à chaque rendu, l'effet de saut se rejouait en boucle, et comme une étape sur une autre page déclenche une navigation sans changer l'index, la visite défilait toute seule à partir de la première cible manquante. Une bulle dégradée sous contrôle de l'utilisateur vaut mieux qu'un parcours qui s'emballe.
- **Ancrer sur UN ÉLÉMENT REPRÉSENTATIF, jamais sur une liste ou un conteneur entier** : la PREMIÈRE objection et non la liste, le PREMIER compte-rendu et non le tableau, la première dimension du playbook, le graphique seul. Un bloc plus haut que l'écran ne laisse aucune place libre : la bulle se pose alors par-dessus ce qu'elle explique, et déclenche en plus la règle « couvre l'écran » qui supprime la surbrillance — plus rien n'est mis en évidence. Bénéfice secondaire : désigner une ligne est plus parlant qu'entourer une masse de contenu.
- **Chaque étape affiche le chemin réel pour y revenir** (champ `where` : « Performance › Objections », « Analyse rendez-vous », « Barre du haut, ou ⌘K »). Sans ce repère on comprend ce qu'on regarde sans savoir le retrouver une fois la visite finie — et c'est justement ce pour quoi la visite existe.
- **La hauteur de la bulle est MESURÉE (`ResizeObserver`), jamais devinée.** C'est la seule inconnue de l'équation de placement, et une constante ne peut pas la couvrir : les textes vont de trois à huit lignes. Cf. bug #27.
- **Le pied de la bulle est toujours atteignable, par construction** : `maxHeight` bornée à la fenêtre, seul le TEXTE défile (`overflow-y-auto`), le pied est un bloc à part. Aucun réglage de placement ne peut plus reléguer « Suivant » hors de l'écran — sinon la visite est un cul-de-sac dont on ne sort qu'en fermant.
- **Ordre de placement : droite → dessous → dessus → gauche**, en retenant le premier côté où la bulle tient ENTIÈREMENT. Si aucun ne convient, elle se pose du côté le plus dégagé et **devient translucide au survol** (`overlaps`) : on peut relire ce qu'elle cache sans quitter la visite.
- **Le suivi de la cible se fait par `requestAnimationFrame`, pas par écouteurs `scroll`/`resize`.** Un écouteur `scroll` ne voit pas un conteneur interne qui défile, une animation d'entrée ou une image qui se charge et repousse la mise en page — la surbrillance restait sur l'ancienne position. Et il se déclenchait par rafales : combiné à une transition CSS de 200 ms, l'anneau GLISSAIT visiblement derrière le contenu à chaque geste de molette. Lecture par image + **aucune transition sur la surbrillance** = elle colle à l'élément. La boucle ne provoque un rendu que si le rectangle a changé.
- **`scrollIntoView({ block: "center" })` au début de chaque étape, une seule fois** : centrer laisse de la place des deux côtés, donc un endroit où poser la bulle sans recouvrir la cible. Le répéter à chaque image empêcherait l'utilisateur de faire défiler lui-même.
- **L'index avance TOUJOURS, y compris en changeant de page.** Les pages `/demo` partagent un layout où `GuidedTour` est monté : Next **ne le remonte pas** entre elles, donc l'effet qui lit `step` dans l'URL ne se rejoue jamais. S'appuyer sur ce round-trip laissait l'index figé sur l'étape précédente — la bulle décrivait Analytics alors qu'on était sur Objections, et la cible cherchée était celle de l'ancienne page, d'où deux secondes de tentatives inutiles. L'URL reste tenue à jour pour un rechargement ou un lien direct, mais elle n'est plus la source de vérité en cours de visite.
- **La mesure de la cible RÉESSAIE pendant 2 s** avant de conclure à son absence. Après une navigation, le composant se remonte avant que le contenu de la nouvelle page ne soit dans le DOM : sans cette patience, chaque étape suivant un changement de page était sautée, et la visite se vidait en cascade de la moitié de ses étapes.
- **Aucun calque bloquant** : la visite laisse la page entièrement utilisable, molette comprise. Un calque plein écran avalait le défilement et figeait l'utilisateur devant un contenu qu'il ne pouvait pas parcourir — pouvoir regarder ce que la bulle décrit vaut mieux que se protéger d'un clic.
- **Pas de découpe quand la cible couvre l'écran** (> 70 % de la hauteur ou > 90 % de la largeur) : entourer un conteneur de page entier revient à « percer » toute la fenêtre, ce qui décale le contenu et donne l'impression que l'écran est masqué. La bulle s'affiche seule, sans flèche — elle ne désignerait rien.
- **Un clic hors bulle ne ferme PAS la visite** — il bloque simplement l'interaction. Fermer sur clic extérieur interrompait tout au moindre geste et renvoyait au tableau de bord, ce qui donnait l'impression de ne plus pouvoir naviguer. Sorties explicites uniquement : « Passer la visite », la croix, ou Échap.
- **`rect` a trois états** : `undefined` (pas encore mesuré), `null` (mesuré, cible absente), `DOMRect`. Confondre les deux premiers faisait sauter la première étape — piège de tout composant qui mesure le DOM pour décider quoi afficher.
- **Voile léger (0.38) + anneau franc**, pas l'inverse : c'est l'anneau qui désigne, pas l'obscurité. Chaque bulle porte sa phase et la nature de l'élément (section / contenu / commande), et une flèche la relie à la cible.

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

### PWA — installable depuis le 31 août 2026

Brief s'installe sur l'écran d'accueil (icône, plein écran sans la barre Safari, écran de démarrage). **Ce n'est PAS une application hors ligne** : aucun service worker n'est enregistré, l'app installée a toujours besoin du réseau. Choix explicite — pas d'hors-ligne, pas de notifications.

- `app/manifest.ts` (servi sur `/manifest.webmanifest`, Next injecte le `<link>` tout seul). `start_url` = **`/brief`**, la même première page qu'après une connexion (31/08/2026) : ce qu'on vient chercher sur son téléphone, c'est son brief avant le rendez-vous, pas un tableau de bord.

**La première page après connexion est `/brief`**, sur ordinateur comme sur téléphone. Elle est fixée dans les `callbackUrl` des deux boutons de `/login` (Google et Microsoft) — c'est le seul endroit à changer, il n'y a pas de redirection centrale. `/brief` porte son propre garde d'onboarding (`BriefToolClient.tsx`, appel à `/api/onboarding`), donc un compte sans profil est toujours renvoyé vers `/onboarding` : le changement ne permet pas de sauter l'onboarding. **Les liens profonds survivent à la connexion** (corrigé le 31/08) : le middleware renvoie vers `/login?callbackUrl=<destination>` au lieu de laisser chaque page faire son propre `redirect("/login")` sans rien transmettre. La page de connexion lit ce paramètre, l'assainit par `safeInternalPath` (`lib/safe-path.ts`) et le passe aux deux boutons. **L'assainissement n'est pas optionnel** : le paramètre vient de l'URL, donc de n'importe qui — sans lui, `/login?callbackUrl=https://…` ferait de brief-ai.fr un tremplin de redirection ouverte avec le crédit de confiance du domaine. Trois formes à refuser, toutes lues comme externes par au moins un navigateur : `//exemple.test`, `/\exemple.test`, et l'absolue. Trois tests le verrouillent.

Effet de bord assumé : **le matcher de `middleware.ts` devient le vrai garde d'authentification**, alors qu'il laissait passer et déléguait aux pages. Tout ce qui y figure exige désormais une session — `/demo` compris, qui était joignable sans session jusque-là. Ses écrans ne portent que des données d'exemple et ne sont liés que depuis `/bienvenue` et la visite guidée, donc depuis l'app connectée. Les `redirect("/login")` des pages restent en place en second rideau, au cas où une route échapperait au matcher.
- `theme_color` est **blanc, pas le bleu de marque** : cette couleur teinte la barre du navigateur, collée à une TopBar blanche — un bleu vif y ferait une couture. `background_color` vaut `#F8FAFC`, le fond de l'app, pour que l'écran de démarrage ne clignote pas.
- **iOS ignore les icônes du manifeste** et ne lit que `apple-touch-icon` déclarée dans les métadonnées du layout. L'oublier donne une vignette de la page en guise d'icône.
- `statusBarStyle: "default"` et non `black-translucent` : ce dernier fait passer le contenu SOUS la barre d'état et demanderait de gérer les zones sûres sur chaque écran.
- Les icônes sont générées par un script Swift (Core Graphics) à partir du « B » sur le dégradé `#2A5CE0 → #5B3FD6`, en Helvetica Neue Bold — Inter Tight n'est pas installée localement, et l'Avenir Next Heavy referme ses contreformes à 60 px. **Le fichier source est un carré plein, sans transparence ni coins arrondis** : iOS applique son propre masque, un PNG déjà arrondi se fait rogner deux fois.
- Les chemins d'icônes et le manifeste **ne sont pas dans le matcher de `middleware.ts`** (une liste explicite de routes applicatives). Y ajouter un motif large les casserait pour les visiteurs non connectés.
- **`InstallHint` (`app/components/InstallHint.tsx`), monté sur `/brief` uniquement**, explique comment installer : iOS n'a pas de bouton « Installer », il faut Partager → « Sur l'écran d'accueil ». Affiché seulement si l'appareil est tactile, l'app pas déjà installée et l'invitation pas déjà écartée. **Détection par capacités et non par agent utilisateur**, avec le cas Safari iOS qui n'implémente pas `display-mode` et expose `navigator.standalone` à la place — sans ce cas, l'invitation s'affiche DANS l'app installée.
- **Une icône déjà installée fige le `start_url` du jour de son installation.** Changer le manifeste ensuite ne la met pas à jour : il faut supprimer l'icône et la rajouter. Piège rencontré le 31/08, quand `start_url` est passé de `/dashboard` à `/brief`.

### Sécurité et plomberie — audit du 31 août 2026

Ce que l'audit a refermé, pour ne pas rouvrir les mêmes portes :

- **`/api/calendar/events` passe par `requireActiveUser`.** Elle ne vérifiait que la présence d'une session. Or c'est `requireActiveUser` qui applique `disabled_at` et le blocage de facturation, et **le middleware ne couvre que des pages, jamais `/api`** : un compte désactivé gardait cet endpoint en état de marche. À vérifier sur toute nouvelle route API.
- **`requireActiveUserContext` (`lib/api-auth.ts`) rend le garde ET le contexte en une requête** — `disabled_at`, `role`, `organization_id` d'un seul select. Le motif `requireActiveUser` + `getUserRole` + `getUserOrganizationId` était trois allers-retours séquentiels sur la même ligne. Migré sur les quatre routes les plus lourdes ; **le reste suit le même remède quand on y touche**. Le type `UserRole` y est importé en `import type` pour que ce module ne tire pas `lib/db.ts` dans le bundle de chaque route.
- **`enforceAiGenerationLimit`** (mémoire puis partagé) sur les 16 routes de génération. Le limiteur en mémoire ne voit qu'une instance Vercel, éphémère : il attrape le double-clic, pas un client qui boucle. Dépend de la **migration 011, non exécutée**.
- **Next 16.3.4 et next-auth 4.24.15** (31/08). La montée de Next corrige un contournement de middleware en App Router — pas théorique ici, le middleware est devenu le garde d'authentification le même jour. `next` est **épinglé à une version exacte** dans `package.json` : npm remet un caret à chaque installation, le remettre à l'exact.
- **En-têtes de sécurité dans `next.config.ts`** : `frame-ancestors 'none'` + `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS deux ans. **Pas de CSP complète** : l'app charge des polices Google, des images de CRM et des enregistrements Recall — ça se construit en `report-only` d'abord, c'est un chantier.
- **Deux lectures non cadrées supprimées** : `getBriefById` et `getBriefByCalendarEventIdGlobal`. Sans appelant depuis le bug #28, leur nom invitait à rejouer la faille.

### Mobile — conventions acquises le 31 août 2026

- **Tableaux : `stacked-table` + `sm:min-w-[…]`, jamais `min-w-[…]` seul.** Sous `sm`, chaque ligne devient un bloc — identité en tête, valeurs étiquetées par `data-label`, actions en pied sur toute la largeur. Sans ça, il faut défiler horizontalement dans la carte pour atteindre la dernière colonne, et c'est toujours là que vivent les actions. Appliqué aux quatre tableaux : équipe, contacts, devis, roster du tableau de bord. **Le `data-label` d'une cellule doit reprendre le libellé de son en-tête** : l'en-tête est masqué en mode empilé, la valeur seule ne se comprend plus. Première et dernière cellules exemptées (identité, actions).
- **Une grille de contenu se déclare `grid-cols-1 lg:grid-cols-N`, jamais `grid-cols-N` seul.** Sur `/brief/[id]`, un `grid-cols-3` sans point de rupture donnait 195 px à la colonne principale et 98 px à la latérale sur un écran de 390 : le texte se coupait tous les trois mots, les pastilles de vocabulaire s'empilaient une lettre par ligne.
- **`PageHeader` s'empile sous `sm`.** Ne pas revenir à une rangée `justify-between` avec des actions en `shrink-0` : le bloc titre se fait écraser (cf. bug #33d).
- **Champs de saisie : 16 px sous `lg`**, imposé par une règle non layerisée de `globals.css`. Ne pas la retirer en la prenant pour du style mort : sans elle, Safari iOS zoome à chaque tap dans un champ.
- **Modales : toujours `max-h-[85vh]` + `overflow-y-auto`.**
- **`no-scrollbar` ne masque la barre qu'au pointeur fin.** Sur tactile, la barre en surimpression est la seule affordance qui dit qu'une rangée d'onglets défile — il n'y a pas de survol pour la remplacer.
- **Ne préparer une ressource qu'au survol ne marche pas sur tactile** : prévoir un déclencheur sous `(hover: none)` (cf. le PDF du brief, bug #33b).

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

27. **Constante de hauteur devinée = bouton hors de l'écran** (19 août 2026) : le placement de la bulle de visite guidée décidait si elle « tenait sous la cible » avec `BUBBLE_HEIGHT = 230`, pour une bulle qui en faisait 450 selon la longueur du texte. Elle était donc posée sous une cible basse, débordait de la fenêtre, et le bouton « Suivant » devenait inatteignable — la visite se bloquait à l'étape 6 sans autre issue que la fermer. **Toute dimension d'un élément dont le contenu est variable doit être mesurée (`ResizeObserver` / `getBoundingClientRect`), jamais posée en constante** ; et tout conteneur positionné dynamiquement doit borner sa taille à la fenêtre en gardant ses commandes hors de la zone défilante. La constante restante (`BUBBLE_FALLBACK_HEIGHT`) ne sert que le temps de la première image, la bulle étant rendue invisible jusqu'à sa mesure.

26bis. **Récidive du #26 dans l'autre sens : DEUX barres collantes au même décalage** (31 août 2026). La barre de `/brief/[id]` était `sticky top-0 z-10`, exactement comme la `TopBar` du layout. Dès le premier pixel de défilement, la seconde recouvrait la première : fil d'Ariane, cloche, et sur mobile le bouton du menu passaient dessous et devenaient inatteignables. Sur desktop ça se voyait à peine — la barre du brief est blanche et pleine largeur, elle recouvrait proprement. **La règle du #26 ne dit pas seulement « rendre collant », elle dit `sticky top-14` avec un z-index EN DESSOUS** ; `PerformanceTabs` et `TeamTabs` l'appliquaient, cette barre-là ne l'avait jamais fait. Vérifié depuis : les seuls autres `sticky top-0` sont les bandeaux d'imitation et de grâce de facturation, placés au-dessus de la TopBar et volontairement en z-40/z-50.

26. **Barre d'onglets non collante = navigation perdue** : la `TopBar` était `sticky`, pas `PerformanceTabs`. Sur une page à peine plus haute que l'écran, quelques pixels de défilement suffisaient à faire glisser les onglets sous la TopBar sans aucun moyen de revenir en arrière. Toute barre de navigation persistante placée sous une TopBar collante doit l'être aussi (`sticky top-14`, z-index en dessous).

28. **Lecture par id non cadrée sur le propriétaire** (21 août 2026) : `getBriefById` ne filtrait que sur l'id — tout utilisateur authentifié connaissant un uuid pouvait lire le brief d'un autre. Les uuid ne se devinent pas en pratique, mais **l'export PDF rend la fuite bien plus concrète** : un fichier téléchargeable plutôt qu'un écran. `getBriefByIdForUser` cadre la lecture sur son propriétaire, et la page l'utilise aussi. Règle : ajouter une voie d'export/partage à une ressource, c'est le moment de revérifier que sa lecture est cadrée.

29. **La police Helvetica intégrée aux PDF avale l'espace qui suit un « € »** (22 août 2026) : « 12 M€en série B ». Reproduit avec des chaînes témoins — sans euro l'espace tient, avec euro elle saute, quel que soit l'échappement. **Le problème est dans les métriques de la police, pas dans le texte** : aucun nettoyage de chaîne n'y change quoi que ce soit. Fix : embarquer une vraie police (Inter). Défaut trouvé seulement en **rendant un PDF d'exemple et en le relisant**, pas au jugé.

30. **`navigator.share()` exige une activation utilisateur récente** (22 août 2026) : la première version attendait le téléchargement du PDF — une à deux secondes — **à l'intérieur du gestionnaire de clic**. L'activation était consommée, le navigateur rejetait, et le code prenait ce rejet pour une annulation volontaire : bouton inerte sur Chrome, sans erreur. Fix : le PDF est préparé **au survol**, `navigator.share` est appelé sans attente. Corollaires : sans fichier en cache (clic immédiat, appareil tactile sans survol) on tente quand même et on retombe sur le téléchargement au moindre échec ; `navigator.canShare` tranche d'abord, tous les navigateurs ne savent pas partager un FICHIER (Chrome de bureau) ; un `AbortError` ne vaut « annulé par l'utilisateur » que dans le cas où rien n'a été attendu avant l'appel.

31. **Un correctif à moitié : l'adresse saisie servait à rédiger, jamais à envoyer** (31 août 2026) : la génération à la demande de l'email de suivi acceptait un destinataire quand le call n'en avait pas — c'était tout l'objet du correctif — mais ne l'enregistrait nulle part. L'email était donc rédigé, affiché, puis **refusé à l'envoi** par « Adresse email du contact introuvable », sans le moindre champ pour redonner l'adresse. Le correctif initial avait traité l'écran bloqué (« en cours de génération… » alors que rien ne tournait) et s'était arrêté là. Vérifié sur le vrai call `5beb44e3` : `contact_email` à `null`, `follow_up_email` présent, jamais envoyé. **Généralisation : quand on ajoute une saisie utilisateur pour débloquer une étape, parcourir TOUTE la suite du flux et vérifier que chaque étape dispose de cette donnée** — ici la route d'envoi lisait toujours `calls.contact_email`, resté vide. Règle adoptée au passage : l'adresse n'est enregistrée sur le call **qu'après un envoi réussi**, jamais à la génération — une adresse qui n'a jamais rien envoyé ne doit pas devenir le contact du rendez-vous.

32. **Le manager pouvait inviter, mais pas relancer ni annuler** (31 août 2026) : `app/api/team/invite/route.ts` journalisait l'échec d'envoi de l'invitation et **renvoyait quand même un succès**, l'écran annonçait « Invitation envoyée ». Or le compte, lui, est bien créé — donc le manager ne pouvait ni réinviter la même adresse (déjà prise) ni relancer (aucune route côté application, seul le backoffice admin savait le faire). Révélé par une clé Resend restreinte au domaine `lartisangroupe.com` qui refusait `brief-ai.fr` avec un 403 invisible. Fix : deux routes manager (`POST /api/team/[commercialId]/resend-invitation`, `DELETE /api/team/[commercialId]/invitation`), l'état « invitation en attente » remonté dans `TeamOverviewItem`, et la route de création qui renvoie désormais `invitationSent`. **Généralisation : une opération best-effort dont l'échec laisse l'utilisateur sans issue n'est pas best-effort — soit elle remonte, soit il existe un moyen de la rejouer.** Ici les deux. `getTeamMemberForManager` est le point de contrôle unique (lien manager↔commercial + même organisation), et `lib/team-invitation.ts` porte la définition de « en attente » pour que l'écran et le serveur ne divergent pas (cousin du bug #56).

33. **Trois défauts propres à iPhone, invisibles au développement** (31 août 2026, audit de code — pas de test sur appareil) : (a) **Safari iOS zoome sur tout champ dont la police fait moins de 16 px** et ne dézoome pas ensuite ; les 142 champs de l'app étaient en `text-sm` (14 px), donc chaque saisie faisait sauter la page. Corrigé par une règle non layerisée dans `globals.css` sous le point de rupture `lg` — hors couche, elle l'emporte sur les utilitaires Tailwind v4 sans surenchère de spécificité. (b) **« Partager » se comportait comme « Exporter PDF »** : le fichier était préparé au survol, or il n'y a pas de survol sur tactile, donc le tap partait dans le chemin dégradé où l'`await` consomme l'activation (cf. bug #30). `pointerdown` ne suffit pas — 200 ms d'avance pour un rendu qui en demande 1 500. Le PDF est désormais préparé à l'affichage du brief **uniquement sous `(hover: none)`**, donc sans rien coûter sur desktop. (c) **Modales sans hauteur bornée** : avec le clavier ouvert, les boutons passent hors écran sans moyen de défiler — même forme que le bug #27. Trois modales corrigées ; les `fixed inset-0` d'`admin/dashboard` et de `quotes/QuotesListClient` sont des capteurs de clic de menu déroulant, pas des modales, et n'avaient rien à corriger (vérifié avant de patcher). **Généralisation : un défaut qui ne se manifeste que sous `(hover: none)` ou sous 16 px ne se verra jamais depuis un poste de développement — il se cherche dans le code, pas à l'écran.**

  **(d) Ajouté après captures d'un vrai iPhone — le défaut le PLUS visible, et celui que l'audit de code avait manqué** : `PageHeader` (partagé par 27 pages) était une rangée `flex justify-between` dont les actions étaient en `shrink-0`. Sur 390 px les boutons prenaient toute la largeur, le bloc titre était comprimé à une centaine de pixels — « Bonjour Jean » tombait **à un mot par ligne**, le sous-titre aussi, la pastille d'eyebrow chevauchait le premier bouton et le dernier bouton sortait de l'écran. `min-w-0` était bien présent sur la colonne titre et ne servait à rien : il autorise une colonne à rétrécir, il ne la protège pas d'un voisin qui refuse de céder un pixel. Fix : `flex-col` sous `sm`, `sm:flex-row` au-delà, actions en `flex-wrap`. **La leçon vaut au-delà du cas : un audit statique voit les règles absentes (16 px, `max-h`), pas les collisions de mise en page — celles-là demandent une capture d'un vrai appareil.**

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
- ❌ Interroger Postgres avec un identifiant issu de l'URL sans `isUuid` (lib/uuid.ts) — un id malformé lève une 22P02 qui remonte en **erreur serveur 500** au lieu d'un 404. **Garder la REQUÊTE, pas la route.** Formuler la règle comme « un `if (!isUuid(id)) notFound()` en tête de chaque route `[id]` » a cassé `/brief/[id]` pendant une journée (19-20/08/2026) : cette page reçoit **deux** formes d'identifiant — un id d'événement Google Calendar depuis le tableau de bord et les emails de notification, un UUID Supabase à la relecture — et le garde global renvoyait 404 sur tous les boutons « Préparer le brief ». Le garde va devant l'appel qui touche une colonne `uuid`, jamais devant tout le reste. Les routes `[callId]`/`[quoteId]`/`[commercialId]`/`[categoryId]` ne reçoivent qu'un UUID : leur garde en tête est correct.
- ❌ Décider d'un placement à l'écran à partir d'une dimension supposée plutôt que mesurée (cf. bug #27)
- ❌ Suivre une cible qui bouge avec des écouteurs `scroll` + une transition CSS — l'élément suivi paraît glisser derrière le contenu ; `requestAnimationFrame` sans transition
- ❌ Laisser un écran de démonstration pointer vers une vraie page de détail — ses entités n'existent pas en base (`ConditionalLink` rend la ligne inerte)
- ❌ Utiliser des classes `indigo-*` (ou violet/purple Tailwind littéral pour la marque) hors `/admin` — toujours les tokens du design system
- ❌ Créer une route de génération IA sans `checkAiGenerationRateLimit`
- ❌ Faire traiter par un seul appel IA une liste dont la taille n'est pas bornée — découper en lots (cf. bug #25)
- ❌ Modifier un prompt par défaut sans vérifier si une version éditée existe dans `admin_config` (cf. bug #24)
- ❌ Afficher comme une citation un texte produit par le modèle sans l'avoir ancré au transcript (numéros de ligne, jamais de copie mot à mot vérifiée après coup)
- ❌ Mettre dans un prompt partagé un contre-exemple propre à un client — ça dégrade tous les autres ; la spécificité client vit dans sa configuration
- ❌ Faire saisir une donnée pour débloquer une étape sans vérifier que les étapes SUIVANTES du même flux y ont accès (cf. bug #31)
- ❌ Avaler l'échec d'une opération best-effort quand l'utilisateur n'a aucun moyen de la rejouer — soit on le lui dit, soit on lui donne le bouton (cf. bug #32)
- ❌ Dupliquer une définition métier entre l'écran et la route qui l'applique — un bouton visible doit toujours correspondre à une action que le serveur accepte
- ❌ Poser un champ de saisie à moins de 16 px sans compenser sous `lg` — Safari iOS zoome dessus et ne revient pas (cf. bug #33)
- ❌ Ouvrir une modale sans `max-h` + `overflow-y-auto` — clavier ouvert sur mobile, ses boutons sortent de l'écran
- ❌ Ne préparer une ressource qu'au survol quand elle est nécessaire au clic : il n'y a pas de survol sur tactile
- ❌ Lire une ressource par son seul id quand elle appartient à un utilisateur — cadrer la requête sur son propriétaire (cf. bug #28), d'autant plus si elle est exportable
- ❌ Attendre quoi que ce soit (`await`) avant d'appeler `navigator.share()` dans un gestionnaire de clic — l'activation utilisateur est consommée (cf. bug #30)
- ❌ Charger un fichier par un chemin construit à l'exécution sans l'ajouter au traçage de fichiers de `next.config.ts` — ça marche en local et tombe en 500 en production
- ❌ Supprimer une page de réglages sans mettre à jour les URL de callback OAuth qui y redirigent (cf. « Navigation allégée »)

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

## Point de reprise — 1er septembre 2026

Section volontairement en tête de la roadmap : elle dit **où en est le produit et ce qui l'attend**, la partie qui se perd entre deux sessions parce qu'elle ne se lit dans aucun fichier du repo.

### Domaine — brief-ai.fr (migration terminée le 19 août 2026)

**Brief est servi sur `brief-ai.fr`.** Domaine OVH, apex `A 216.198.79.1` en domaine principal Vercel, `www` en CNAME vers Vercel puis 308 vers l'apex. Recette passée de bout en bout le 19/08 : login Google et Microsoft, Slack, agenda Recall, HubSpot, lien de devis, portail Stripe.

**`brief-precall.vercel.app` reste un alias actif et doit le rester — indéfiniment.** Raison non évidente : le webhook `/api/recall/webhook` n'est pas configuré dans un tableau de bord, il est transmis à Recall **à la création de chaque agenda** (`lib/recall.ts`). Les agendas déjà enregistrés portent donc l'ancienne URL côté Recall, définitivement. Supprimer l'alias obligerait tous les utilisateurs à reconnecter leur agenda. Seuls les nouveaux agendas prennent `brief-ai.fr`.

Côté code, l'origine publique n'est plus écrite en dur nulle part : `lib/app-url.ts` exporte `APP_URL` (`NEXT_PUBLIC_APP_URL`, repli `https://brief-ai.fr`). Elle était recopiée dans 21 fichiers — routes OAuth, liens des emails sortants, webhook Recall, manifeste HubSpot. Toute nouvelle URL absolue vers Brief passe par ce module, sans exception.

Déclarés des deux côtés (ancienne + nouvelle URL, elles cohabitent) : les 2 apps Google (`GOOGLE_CLIENT_ID` et `RECALL_GOOGLE_CLIENT_ID` sont **deux applications distinctes**), Azure AD, Slack, HubSpot, Stripe, Recall, Inngest.

**Deux dettes ouvertes :**

1. **Pipedrive n'est pas déclaré** — essai expiré au 19/08, personne n'est connecté, donc rien ne casse. Mais le code envoie désormais `https://brief-ai.fr/api/crm/pipedrive/callback` : **à mettre dans le Developer Hub avant toute reprise de l'intégration**, sinon la connexion échouera sans que la cause soit visible.
2. ~~Le domaine émetteur des emails~~ — **FAIT le 31/08/2026**, voir la section « Domaine émetteur » ci-dessous.

**Si une bascule d'URL se représente** : poser `NEXT_PUBLIC_APP_URL` à l'ancienne valeur AVANT de déployer le code (le déploiement devient alors neutre), déclarer les URIs partout, puis basculer la variable + `NEXTAUTH_URL` et **redéployer** — `NEXT_PUBLIC_*` est inliné au build, changer la variable sans redéployer ne fait rien, silencieusement. Rollback = remettre les deux variables.

### Domaine émetteur des emails — `contact@brief-ai.fr` depuis le 31 août 2026

`RESEND_FROM_EMAIL` vaut désormais `Brief <contact@brief-ai.fr>` (nom d'affichage compris — la valeur était une adresse nue, le destinataire lisait « jean@lartisangroupe.com »). Vérifié de bout en bout : invitation reçue, signée SPF et DKIM par Resend.

**Deux choses que la doc affirmait et qui étaient fausses — ne pas les réintroduire :**

1. **Il n'y a AUCUN SPF à fusionner à la racine.** Resend ne touche pas au `v=spf1 include:mx.ovh.com -all` de `brief-ai.fr`, qui reste la messagerie OVH. L'ancienne note venait de la configuration de `lartisangroupe.com`, qui date de l'infrastructure Resend précédente (Amazon SES : TXT + MX sur `send.`). **Un domaine créé aujourd'hui utilise deux CNAME** vers `forge.rmta.net`. Corollaire : un CNAME ne peut pas coexister avec un TXT ou un MX sur le même nom — il faut supprimer avant d'ajouter, sinon OVH refuse.
2. **Ce n'est pas un prospect qui voyait l'adresse.** Les 7 emails Resend (`lib/email.ts`) vont tous à des utilisateurs de Brief : invitation, brief pré-call, analyse de call, digests, devis accepté, demande de déblocage. Les emails **aux prospects** — devis et relances — partent par **Gmail depuis l'adresse du commercial** (`gmail.send`), et ça n'a pas changé. La vraie raison de basculer était l'email d'**invitation** : la première chose qu'un nouvel utilisateur reçoit de Brief.

**Configuration en place sur `brief-ai.fr`** (région Resend : EU, `eu-west-1`) :

| Type | Nom | Valeur |
|---|---|---|
| CNAME | `send` | `send.forge.rmta.net.` |
| CNAME | `rsend` | `rsend-euw1.forge.rmta.net.` |
| TXT | `resend._domainkey` | la clé DKIM propre au domaine |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:contact@brief-ai.fr` |

**Le piège qui a réellement coûté du temps : les clés API Resend sont restreintes à un domaine et NE SONT PAS MODIFIABLES.** L'ancienne clé était limitée à `lartisangroupe.com` et répondait `403 — "This API key is not authorized to send emails from brief-ai.fr"`, quel que soit l'état du DNS. Il faut **créer une nouvelle clé**, la poser sur Vercel, et **redéployer** (une variable d'environnement ne s'applique qu'aux déploiements créés après). Le DNS était parfait pendant toute la durée de la panne — ne pas repartir chercher de ce côté.

`contact@brief-ai.fr` est une **redirection** OVH, pas une boîte : le MX Plan inclus au domaine n'autorise pas la création de compte email, mais les redirections sont gratuites. Conséquence à connaître : les réponses arrivent bien, mais on ne peut pas répondre *depuis* cette adresse. Aucune fonction de `lib/email.ts` ne pose de `reply_to` — une réponse part donc au From, d'où la nécessité de cette redirection.

Reste à aligner un jour : `.env.local` porte encore l'ancienne clé et l'ancien `RESEND_FROM_EMAIL`, et la politique de confidentialité affiche `rgpd@infobrief.com`, domaine sans rapport avec Brief (à ne pas toucher pendant l'examen Google).

### Vérification Google — nouvelle vidéo envoyée le 31 août 2026, en attente de Google

**Réponse partie le 31/08 dans le fil du 22 août.** Nouvelle vidéo : **https://youtu.be/lynTB6sOC8s** (6 min 41, muette, sous-titres anglais importés), lien mis à jour dans Data Access. L'ancienne (`YQEbVl19VN0`) est conservée en ligne tant que la nouvelle n'est pas acceptée — c'est ce qui avait été soumis le 20/08.

**Ce que la nouvelle vidéo montre**, horodatages relevés image par image (utiles si un troisième tour arrive) :

| Moment | Ce qui est à l'écran |
|---|---|
| 01:06 | Permissions de connexion détaillées : nom, photo, adresse email (`userinfo.profile`, `userinfo.email`) |
| 01:40 | Écran de consentement du client 1, bandeau « application non validée », les deux scopes sensibles listés en clair |
| 02:05 | `client_id` du client 1 lisible dans la barre d'URL |
| 02:14 | **Cases cochées, consentement accordé** — le flux va jusqu'au bout, ce qui manquait |
| 02:55 | **Google Calendar : le brief dans la description de l'événement** (impact de `calendar.events` en écriture) |
| 03:52 | **Gmail, recherche `in:sent`, le message dans les Messages envoyés** (impact de `gmail.send`) |
| 04:55 | Écran « application non validée » du client 2, paramètres avancés dépliés |
| 05:08 | Modale des détails d'accès du client 2, dépliée |
| 05:35 | `calendar.events.readonly` visible + `client_id` du client 2 lisible |
| 06:06 | Politique de confidentialité, dont Limited Use |

Sources sur le bureau de Jean : `brief-verification-video-CONDUITE-v2.md` (conduite), `brief-verification-video-v2-cale.srt` (**sous-titres calés sur le montage réel** — pas `brief-verification-video-v2.srt`, qui suivait le plan et non le tournage), `brief-verification-youtube.md` (titre, description, chapitres), `brief-verification-reponse-google.md` (le mail envoyé).

**Réserves connues sur cette vidéo, jugées non bloquantes** : le sélecteur de comptes (0:45) liste les collègues d'Oliverlist, la semaine d'agenda (2:55) expose l'opérationnel interne, et la barre de favoris est visible à 3:45. Google s'en moque ; c'est un sujet de confidentialité sur une URL YouTube devinable, pas un motif de refus. Arbitré le 31/08 : on n'a pas retourné pour ça, le dossier attendait depuis neuf jours.

**Historique — pourquoi il a fallu retourner.** Mail de la Third-Party Data Safety Team reçu le 22/08 (« [Action Needed] OAuth Verification Request Acknowledgement »), resté sans réponse jusqu'au 31/08. Il faut **répondre dans le fil** (`api-oauth-dev-verification-reply+2ui4jcqoh52ip1d@google.com`) pour que la revue reparte — une nouvelle soumission ne remplace pas la réponse.

Le mail Google du 22/08 (« [Action Needed] OAuth Verification Request Acknowledgement », Third-Party Data Safety Team) n'était **pas un refus** : une demande d'action, qui attendait notre réponse dans le fil — restée sans réponse neuf jours. Trois critères exigés, dont **deux étaient déjà satisfaits** par la vidéo du 20/08 :

| Critère | v1 (soumise le 20/08) |
|---|---|
| **Source Account Impact** — l'effet des scopes en écriture visible dans le compte Google | ✅ le brief dans la description de l'événement (Google Calendar), l'email dans les Messages envoyés (Gmail) |
| **Consent Screen** — tous les scopes **dépliés et lisibles**, cliquer « Show all services » | ❌ **le seul trou** : la v1 résume à l'oral (« two permissions »), la liste n'est jamais dépliée à l'image |
| **Scope Matching** — Console ≡ manifeste | ✅ vérifié le 31/08, voir ci-dessous |

**Console vérifiée le 31/08/2026 — rien à y changer** : `userinfo.profile` et `userinfo.email` (non sensibles), `calendar.events.readonly`, `calendar.events` et `gmail.send` (sensibles), **Restricted : aucune ligne**. Aucun résidu de `gmail.readonly` / `gmail.metadata` : l'audit CASA payant reste écarté. Publishing status **In production**, 3/100 utilisateurs. Côté code, `lib/auth.ts` demande `openid email profile calendar.events gmail.send` et `app/api/recall/google-oauth/start/route.ts` demande `calendar.events.readonly userinfo.email` — la correspondance est exacte.

**Deux pièges du retournage, à ne pas réapprendre** : YouTube ne permet pas de remplacer le fichier d'une vidéo existante (nouvel upload → nouvelle URL → mettre à jour le champ *YouTube link* de Data Access, et ne toucher à rien d'autre sur cette page) ; et il faut **révoquer l'accès de Brief sur `myaccount.google.com/permissions` avant de filmer**, sinon Google saute l'écran de consentement. Tourner avec un compte **déjà compté** dans les 3 utilisateurs : le plafond de 100 se compte sur la durée de vie du projet et ne se réinitialise pas.

### Vérification Google — le dossier soumis le 20 août 2026, 18h15

**Le dossier est chez Trust and Safety.** Premier email annoncé sous 3-5 jours, examen jusqu'à 4-6 semaines, en sept étapes : homepage, privacy policy, app functionality, branding guidelines, appropriate data access, request minimum scopes, additional requirements.

**Vidéo de démonstration** : https://youtu.be/YQEbVl19VN0 (non répertoriée, 5 min 41, muette, sous-titres anglais importés). Les deux `client_id` y sont lisibles dans la barre d'URL — 1:15 pour le client de connexion, 4:35 pour le client agenda. Sources sur le bureau de Jean : `brief-verification-video.srt` et `brief-verification-video-CONDUITE.md` (conduite de tournage).

**Scopes déclarés** : `openid`, `userinfo.email`, `userinfo.profile` (non sensibles) ; `calendar.events`, `calendar.events.readonly`, `gmail.send` (sensibles). **Aucun scope Restricted** — c'est ce qui évite l'audit CASA payant, et c'est le résultat direct du retrait de `gmail.readonly` (25/07) puis de `gmail.metadata` (19/08).

**Les deux clients OAuth sont dans le même projet** (préfixe `730426739198` commun) : une seule vérification les couvre tous les deux. Question tranchée le 20/08.

**Historique du dossier, à ne pas réapprendre** : deux refus automatiques le 19/08 sur « home page does not explain the purpose » et « app name does not match ». Aucun des deux n'était fondé sur le contenu — Search Console répondait `URL is unknown to Google`, `Last crawl: N/A`. La soumission finale est passée par un **appel** (« The finding is incorrect ») qui envoie le dossier en revue humaine, plutôt que d'attendre indéfiniment un crawl. C'est ce qu'il fallait faire : les deux constats étaient devenus factuellement faux.

**PENDANT L'EXAMEN : ne toucher ni aux scopes, ni au branding, ni aux URL.** Toute modification peut relancer le compteur.

**LA PANNE DES 7 JOURS EST TERMINÉE (20/08/2026).** Le projet est passé en **Publishing status : In production** (User type : External, 3 utilisateurs sur un plafond de 100). L'expiration des refresh tokens au bout de 7 jours est un comportement **propre au mode Testing** : elle ne s'applique plus. L'ingestion ne se recassera plus toute seule chaque semaine, et ce **sans attendre** la fin de l'examen.

- **Ne jamais cliquer « Back to testing »** (bouton juste sous le statut, page Audience) : ce serait revenir dans la panne.
- Le changement de mode **ne ressuscite pas les jetons déjà expirés**. Chaque utilisateur doit se déconnecter puis se reconnecter **une fois** pour qu'un nouveau refresh token soit émis.
- Ce qui subsiste jusqu'à la validation : l'écran « application non vérifiée » à la première connexion, et le plafond de **100 utilisateurs sur la durée de vie du projet, non réinitialisable**. C'est une raison de plus pour que la vérification aboutisse avant d'ouvrir vraiment les inscriptions.

**Le grief de branding n'est plus d'actualité (31/08).** Le mail du 22/08 ne le mentionne pas — il ne porte que sur la vidéo et les scopes. Et il est arrivé le jour même où Search Console a commencé à collecter des impressions pour `brief-ai.fr` (mail Search Console du 22/08), ce qui enterre la cause des deux refus automatiques du 19/08 : `URL is unknown to Google`, `Last crawl: N/A`. **Ne pas renommer l'app**, la réserve ci-dessous est caduque — elle est conservée pour mémoire, pas pour action.

**Grief au 20/08, 19h (RÉSOLU, conservé pour mémoire)** : le contrôle automatique de branding a levé « home page does not explain the purpose » mais retient encore « the app name shown on your OAuth consent screen does not match the app name on your home page ». Le `<title>` de la landing a été réduit à exactement « Brief » (commit `11bb5b1`). **Réserve** : sur un écran de consentement non vérifié, Google affiche le **domaine** et non le nom — les captures de la vidéo montrent « brief-ai.fr veut accéder à votre compte Google ». Si le contrôle compare ce `brief-ai.fr` à `Brief`, il échouera tant que l'app n'est pas vérifiée, ce qui est circulaire. **La question doit être posée à Trust and Safety dans le fil d'email** (contact développeur : `jeandereviersde@gmail.com`, aucun email reçu à 19h10, Google annonce 3-5 jours). Ne pas renommer l'app en `brief-ai.fr` sans leur réponse : ce serait modifier le branding en plein examen, pour une cause non confirmée.

### Ce qui bloque et ne dépend PAS du code

1. **Vérification Google — réponse envoyée le 31/08, la balle est chez Google.** Rien à faire, sinon surveiller le fil. **PENDANT L'EXAMEN : ne toucher ni aux scopes, ni au branding, ni aux URL, et ne jamais cliquer « Back to testing ».** Ne bloque pas le produit — le projet est *In production* — mais bloque la levée de l'écran « application non vérifiée » et du plafond de 100 utilisateurs.
2. **Stripe en mode Live** — activation du compte (vérification entreprise). **Trancher le pricing usage AVANT la bascule.** C'est désormais le premier déblocant business : tant qu'il n'est pas fait, il n'y a pas de client payant possible. Recommandation de l'audit : quota d'heures inclus par siège (ex. 10 h/mois puis 0,50 €/h) plutôt que la refacturation sèche dès la première heure — ça évite les lignes de facture à 3 € qui font poser des questions, et ça change la facturation avant les premiers clients plutôt qu'après.
3. **Call `ecfb191e` à réimporter** : son transcript a été parsé par l'ancien parseur bogué (locuteur « 00 », cf. le piège documenté dans « Banc d'essai »). Les données en base sont inexploitables telles quelles.
**Ce qui vient d'être réglé (31/08/2026)** : le domaine émetteur des emails (section dédiée ci-dessus) et la reconnexion Google de chaque utilisateur.

**Ce qui ne bloque plus** :
- ~~Google OAuth en mode Testing~~ — **réglé le 20/08/2026**. Projet passé *In production*, l'expiration des refresh tokens à 7 jours ne s'applique plus. Vérification soumise, en attente, mais elle ne conditionne plus le fonctionnement — voir la section dédiée.
- ~~Jeton GitHub en clair dans `.git/config`~~ — révoqué le 19/08, remote nettoyé, helper `osxkeychain`.

### Coût de navigation : le démarrage à froid, pas le rendu (21 août 2026)

Chaîne de mesures, à ne pas refaire :

| Mesure | Valeur |
|---|---|
| Requête Supabase de `/feedback` (8 calls, 42 Ko) | 134 ms |
| TTFB des routes dynamiques en prod | ~190 ms |
| Réponse RSC d'une navigation | **1,4 Ko** |
| Code utile de `/api/settings/billing/status` | **204 ms** (`session=12ms query=192ms`) |
| `Execution Duration` facturée par Vercel pour la même invocation | **1,06 s** |

**L'écart de ~850 ms est le démarrage à froid** : chargement et évaluation des modules avant la première ligne de code. `lib/db.ts` fait 7 000 lignes et 228 fonctions exportées ; toute route qui en importe une seule chose fait évaluer l'ensemble, plus `next-auth` et `supabase-js`. Avec trois utilisateurs, presque chaque invocation est froide.

Conséquence structurante : **ce qui coûte, c'est le NOMBRE de fonctions distinctes touchées par navigation**, pas le poids des données. Chaque route est une fonction, donc un démarrage à froid.

Corollaires appliqués :
- Les trois routes d'habillage ont été fusionnées en `/api/chrome` — trois démarrages à froid deviennent un. Côté client, les trois composants appellent la même URL via `fetchJsonOnce`, donc **un seul appel réseau** par chargement de page, sans coordination entre eux.
- Le motif `requireActiveUser` + `getOrganizationForUser` + `getOrganizationBillingRow` faisait **quatre requêtes séquentielles** dont deux doublons exacts, pour lire deux champs. `getChromeStateForUser` fait un select imbriqué sur la clé étrangère — la forme que le middleware utilisait déjà correctement. **Ce motif est encore présent ailleurs dans l'app** : c'est le prochain gisement.
- Piste la plus lourde et la plus payante : découper `lib/db.ts`. 7 200 lignes évaluées au démarrage de chaque fonction, pour en utiliser deux ou trois.

  **Analyse de couplage faite le 31/08/2026 — le découpage n'est plus une inconnue.** Sur les **229 fonctions exportées**, **192 n'appellent aucune autre fonction du fichier** : elles sont extractibles telles quelles, sans risque de cycle. Seules 37 ont des dépendances internes, et elles convergent vers un petit noyau à garder ensemble : `getUserOrganizationId` (appelée par 11), `getUsersInOrganization` (5), `getPlaybookForOrganization` (5), `getCommercialsForManager` (4), `listObjectionCategories` (3).

  | Domaine | Lignes | Fonctions |
  |---|---|---|
  | objections | 934 | 18 |
  | calls / briefs | 921 | 30 |
  | playbook | 613 | 17 |
  | contacts | 552 | 18 |
  | devis | 538 | 19 |
  | tasks | 503 | 20 |
  | training | 319 | 12 |
  | facturation | 79 | 6 |

  **Ordre à suivre** : commencer par `training` (319 lignes, le plus petit lot autonome) pour valider la méthode, puis `tasks`, `devis`, `contacts`. Garder `calls/briefs` et le noyau pour la fin — c'est là que vivent les 37 fonctions couplées. **Re-pointer les imports des routes** vers le nouveau module à chaque étape : laisser `lib/db.ts` réexporter suffit à ne rien casser, mais ne gagne rien — une route qui importe `lib/db` continue de tout évaluer.

  **Ce qui n'a PAS été fait, et pourquoi** : le découpage lui-même. Les domaines ne sont pas des blocs contigus — les objections occupent à elles seules dix régions éparpillées du fichier. Un cycle d'import introduit en déplaçant du code ne se voit ni au `tsc`, ni au build, ni aux 46 tests : il casse à l'exécution, en production. Ça se fait domaine par domaine avec l'application sous les yeux, pas en une passe à l'aveugle.

### Région d'exécution — Paris (cdg1)

**Les fonctions doivent tourner à Paris, comme la base.** Supabase est en `eu-west-3` (Paris). Vercel exécutait les fonctions à Washington (`iad1`) — son défaut, jamais choisi. Chaque appel Supabase faisait donc un aller-retour transatlantique, et une route aussi banale que `/api/settings/billing/status` en fait **quatre** : mesurée à **883 ms** le 21/08/2026.

Épinglé dans `vercel.json` (`"regions": ["cdg1"]`) plutôt que laissé au seul réglage d'interface : un réglage de tableau de bord ne se lit dans aucun fichier et se perd au premier projet recréé. **La région ne s'applique qu'aux déploiements créés après le changement** — modifier le réglage sans redéployer ne fait rien.

Reste à traiter après la région, mesuré au passage : quatre appels Supabase séquentiels pour lire un statut de facturation, dont deux viennent de `getServerSession` et `requireActiveUser`. Et le démarrage de fonction n'est pas en cause : la même route sans session répond en ~100 ms, 330 ms à froid.

### Préchargements : les laisser réchauffer, mais pas interroger la base (21 août 2026)

Un seul rechargement de `/dashboard` déclenche **une vingtaine d'invocations de fonctions** (logs Vercel, 21/08). Ce sont les préchargements de `<Link>` : Next précharge chaque lien visible, et depuis l'ajout des frontières `loading.tsx` la veille, ces préchargements **aboutissent vraiment** au lieu de ne rien faire.

**C'est l'effet recherché** — chaque préchargement réchauffe la fonction cible, donc le clic suivant tombe sur une fonction chaude (~200 ms) plutôt que sur un démarrage à froid (~1 s). Ne pas chercher à les supprimer en voyant le nombre d'invocations grimper.

Ce qu'il fallait retirer, c'est le **middleware sur ces requêtes** : il faisait sa requête Supabase sur chacune, soit une vingtaine d'allers-retours en base par chargement de page, pour des réponses qui ne contiennent qu'un squelette. Un préchargement ne rend que `loading.tsx`, aucune donnée utilisateur n'y transite. **Le garde n'est pas contourné** : la navigation réelle qui suit repasse par le middleware, et c'est elle qui sert des données — un utilisateur désactivé ou suspendu ne récupère par cette voie qu'un squelette vide.

### Navigation allégée (21 août 2026)

Cinq changements demandés par Jean, **tous réversibles** — les pages restent en place, seules les entrées de menu bougent :

- **`Compte › Notifications` retirée de la sidebar** : la cloche de la TopBar en devient le seul accès, et récupère l'ancre `data-tour` de la visite guidée (une étape pointait sur l'entrée supprimée — le composant dégrade au bout de 2 s, mais une étape sans cible reste une étape ratée).
- **Onglets « Tester un call » et « Calibrage » retirés de Paramètres** : accessibles par URL directe. L'un est un banc d'essai plutôt qu'un réglage, l'autre appartient au chantier objections en standby. Remettre un onglet = remettre sa ligne dans `NAV_ITEMS`, rien d'autre.
- **Le CRM rejoint Connexions** (`CrmSettingsClient` → `CrmSection`), son onglet disparaît. **Piège à ne pas rejouer** : les callbacks OAuth HubSpot et Pipedrive redirigeaient vers `/settings/crm?crm=…` — supprimer la page sans les mettre à jour aurait fait atterrir toute connexion de CRM sur un 404. Les six URL de callback et les deux liens du dashboard pointent maintenant sur `/settings/connexions`.
- Avatar « JD » en haut à droite retiré (doublonnait avec Paramètres + la carte utilisateur), boutons de bas de sidebar d'un cran plus petits.

La page Connexions lit désormais cinq choses au lieu de trois, **toutes en parallèle** : ne pas ajouter d'aller-retour séquentiel à une fonction qui démarre déjà à froid.

### Brief — export PDF, partage, et titre du rendez-vous (21-22 août 2026)

**Les deux boutons de la barre du brief n'avaient aucun `onClick`** : des coquilles décoratives. Ils sont câblés.

- Le PDF est rendu **côté serveur** avec `@react-pdf/renderer` (même chaîne que les devis) et **relu depuis la base** : le fichier partagé est exactement le brief enregistré, pas l'état de l'écran. Export = téléchargement, Partage = feuille de partage système.
- `adaptCachedContent` vivait dans `app/brief/[id]/page.tsx` alors que la route PDF lit les mêmes lignes → extrait dans `lib/brief-content.ts`. Deux copies auraient divergé, et l'écart ne se serait vu **qu'une fois un PDF envoyé à un prospect**.
- Le nom de fichier est assaini : un « / » dans un titre de rendez-vous suffisait à casser l'en-tête `Content-Disposition`.
- **Typographie Inter embarquée** (sous-ensembles latins, OFL, 128 Ko), césure automatique désactivée (l'algorithme anglais produisait « exacte-ment »). `next.config.ts` inclut explicitement les polices dans le traçage de fichiers : elles sont lues par un chemin construit à l'exécution, que Next ne peut pas deviner. **Sans ça l'export marche en local et tombe en 500 en production.**
- **Dette laissée sciemment** : `lib/pdf/QuoteDocument.tsx` utilise toujours Helvetica et affiche un montant en euros par ligne. Le défaut de police est le même (cf. bug #29) mais y est invisible, les montants finissant par le symbole. Non touché : document client-facing dont l'apparence ne se change pas sans décision.

**Titre affiché = titre de l'événement d'agenda** (« Luc / Jean Weekly »), nom d'entreprise en repli. Avant, un brief s'affichait sous son `company_name` deviné depuis le domaine email : impossible pour un prospect sur Gmail, l'app demandait alors un nom à la main, d'où cinq briefs enregistrés sous « Test ». **`company_name` est CONSERVÉ et reste ce qui pilote la génération** (Pappers, actualités, recherche d'entreprise) — le titre ne sert qu'à l'affichage, les confondre aurait dégradé les briefs. Migration **010**, passée en prod le 22/08 ; le repli d'écriture de `saveBrief` a été retiré dans la foulée. Les briefs antérieurs gardent `meeting_title` à `null` et s'affichent sous leur nom d'entreprise ; ils prendront leur titre à la prochaine régénération.

**Panneau « Contacts » vide** : une seule fonction, `getExternalAttendee`, servait deux besoins opposés. Elle excluait les domaines génériques — juste pour **deviner une entreprise** (on ne déduit rien de « gmail.com »), faux pour **identifier un contact**. Tout prospect sur Gmail produisait donc un brief sans contact, soit la majorité des RDV sur une cible française d'indépendants et de petites structures. Scindée en `getContactAttendee` (premier participant ; `lib/calendar.ts` ne remonte QUE des externes, refiltrer serait un doublon) et `getCompanyAttendee` (garde l'exclusion). Ne corrige pas les briefs **déjà enregistrés** sans contact : leur `contact_email` est `null` en base, ils se repeupleront à la régénération.

**Tuile « Avec participants externes » retirée** en vue calendrier : elle comptait le même ensemble que « RDV à venir » (`lib/calendar.ts` ne remonte que les événements ayant au moins un externe), et additionnait des **participants** et non des rendez-vous — deux unités qui coïncidaient tant que chaque RDV n'avait qu'un invité. Conservée en vue « briefs enregistrés », où elle garde du sens.

### Où en est le code

- **11 migrations** dans `migrations/`. Toutes appliquées en prod SAUF la **011 (`rate_limit_events`), écrite le 31/08/2026 et EN ATTENTE D'EXÉCUTION** — tant qu'elle n'est pas passée, la limitation de débit partagée retombe silencieusement sur le limiteur en mémoire. (006 à 009 depuis fin juillet, **010 le 22/08/2026** — vérifiée par requête, pas sur parole : PostgREST renvoie `briefs.meeting_title` à `null` au lieu d'une erreur).
- **46 tests** (`npm test`), tous au vert — `billing-rules`, `recall-transcript`, `transcript-import`, `uuid`, `email-address`, `team-invitation`, `safe-path`, `transcript-analytics`, `objection-verbatim`. Chacun nomme le bug qu'il verrouille. Les deux derniers, ajoutés le 31/08, couvrent enfin l'IA : le ratio de temps de parole qui doit rester `null` sans commercial identifié, et l'ancrage des verbatims d'objection au transcript réel.
- **Visite guidée et routes `/demo` terminées** : 10 étapes, 6 écrans réels peuplés de données d'exemple. Voir la section dédiée pour les règles de placement, durement acquises.
- Chaîne de vérification avant tout push : `npx tsc --noEmit`, `npx eslint`, `npm run build`, `npm test`. **Référence eslint au 31/08/2026 : 15 problèmes** (34 auparavant — le nettoyage de l'audit du 31/08 a supprimé tout ce qui était réellement corrigeable). Ce qui reste n'est pas de la dette mais des faux positifs assumés, et il faut savoir lesquels pour que le nombre reste un repère utile :
  - **11 `react-hooks/set-state-in-effect`** — des chargements de données au montage, et des lectures de `localStorage` / `matchMedia` / `searchParams` impossibles pendant un rendu serveur. Cette règle récente pousse vers `use()`/Suspense ou une bibliothèque de data-fetching ; s'y plier voudrait dire réécrire le chargement de dix écrans. Les deux occurrences qui étaient de VRAIS défauts (état recopié depuis des props, reset d'état sur navigation) ont été corrigées le 31/08 avec le motif « Adjusting state during render » du bug #8.
  - **2 `react-hooks/error-boundaries`**, **1 `no-page-custom-font`** (le `<link>` Google Fonts du layout — `next/font` l'auto-hébergerait, changement à faire un jour pour la perf, pas anodin car `globals.css` référence les familles par nom), **1 `no-html-link-for-pages`**.

  La bonne façon de vérifier qu'on n'a rien cassé reste de comparer le total avant / après (`git stash push --include-untracked`, relancer, `git stash pop`) — pas de lire les messages.

- **`xlsx` échappe à `npm audit`, et c'est délibéré.** La dépendance est tirée de la distribution officielle de SheetJS (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) et non de npm, parce que **SheetJS a cessé de publier sur npm en 2023** : la 0.18.5 y est figée avec une faille de prototype pollution que rien ne corrigera jamais. Elle était atteignable côté serveur (`lib/inngest-functions.ts`, lecture d'un tableur téléversé dans une tâche de fond qui tourne en `service_role`). Le format `.xls/.xlsx` est annoncé à l'utilisateur dans le sélecteur de fichiers (onboarding et import de références) : on ne pouvait pas le retirer en silence. Et réécrire les trois lecteurs avec `exceljs` aurait échangé une faille corrigée contre un risque de régression sur du code dont le métier est d'avaler des fichiers clients mal formés.

  **La contrepartie, à ne pas oublier : une faille FUTURE de SheetJS n'apparaîtra dans aucun rapport.** Le `package-lock.json` fige l'archive exacte avec son empreinte `integrity`, donc l'installation reste reproductible et vérifiable — mais personne ne préviendra. **À chaque revue de dépendances, aller regarder les publications de SheetJS à la main.** Seconde réserve : si `cdn.sheetjs.com` est indisponible pendant un déploiement, le build échoue.

### Arbitrages produit en attente (Jean)

- **Notifications** : la cloche mène à des préférences, pas à une inbox. Construire l'inbox (les événements existent déjà en base) ou renommer l'entrée pour ne plus promettre ce qui n'existe pas ? Tant que ce n'est pas tranché, la visite guidée présente l'entrée comme « Notifications » sans détailler. Depuis le 21/08 la cloche est le **seul** accès (entrée sidebar retirée) — l'arbitrage reste entier.
- Bouton « restaurer le défaut » par prompt dans l'admin — reste du point 9 de la roadmap.
- Étendre les tests au classifieur d'objections et aux analytics.

## Devis — fonctionnalité abandonnée (décision de Jean, 31 août 2026)

**Brief ne fait plus de devis.** L'entrée a disparu de la navigation et plus rien dans l'application n'y renvoie — un utilisateur ne peut plus y arriver autrement qu'en tapant l'URL.

**Le code est toujours là** : `app/quotes/*` (éditeur, liste, réglages), la page publique `app/q/[token]`, les routes `/api/quotes/*` et `/api/public/quotes/*`, `sendQuoteAcceptedEmail`, `lib/pdf/QuoteDocument.tsx`, et l'entrée `/quotes/:path*` dans le matcher du middleware. Environ 540 lignes rien que dans `lib/db.ts`.

**À retenir avant de rouvrir quoi que ce soit** : les mentions de devis qui subsistent ailleurs dans ce document décrivent un état passé. Ne pas les prendre pour une feuille de route. Si le chantier de suppression est lancé un jour, `/q/[token]` est la seule route publique concernée — elle est hors du matcher du middleware, donc à traiter séparément.

## Roadmap prioritaire

Fait les 20-21 juillet 2026 : **refonte visuelle complète direction Lovable** (nouveau système de tokens oklch bleu #2A5CE0, primitives partagées `ui-bits.tsx`/`PageHeader`/`TopBar`, refonte landing + liste feedback + dashboard, fix du scoping `.brief-ui` qui n'avait jamais fonctionné), **version mobile responsive** (sidebar drawer), **fix bug "William"** (prompt d'analyse admin_config périmé → champs null silencieux, voir bug #20), puis **audit complet du repo** suivi de **6 correctifs** (`after()` généralisé, `/notifications` au middleware, refresh rôle JWT 10 min, validation runtime analyse IA, auth sur google-oauth/start, rate limiting étendu aux 9 routes de génération IA) et **fin de la migration visuelle** (les 25 fichiers non-admin restants — onboarding, modales, références, page publique devis, compte-suspendu — zéro `indigo-*` hors /admin).

Fait les 20-22 août 2026 : **domaine `brief-ai.fr` + vérification Google soumise** (sections dédiées ci-dessus), **chantier fluidité/coût** (frontières `loading.tsx`, région `cdg1`, `/api/chrome`, facturation en une requête, middleware retiré des préchargements), **navigation allégée** (CRM regroupé dans Connexions, entrées Notifications/Tester un call/Calibrage retirées des menus), et **le brief rendu partageable** (export PDF + partage câblés, typographie Inter, titre du rendez-vous, panneau Contacts réparé, migration 010).

### Chantier objections — EN STANDBY (décision de Jean, 20 août 2026)

**Mis en pause volontairement, ce n'est pas la priorité.** Rien n'est perdu : le socle est livré et fonctionnel (playbook d'objections, classification sémantique, verbatims ancrés, Analytics, banc d'essai, page de calibrage). Ce qui est en pause, c'est **l'amélioration mesurée** du classifieur, pas son fonctionnement.

Le chantier reprend exactement là où il s'arrête, sans rien réapprendre :

1. **Faire annoter 3-4 calls** par le directeur commercial dans Paramètres → Calibrage, puis « Lancer la mesure ». C'est la première mesure qui dit quel levier tirer — sans elle on règle des prompts à l'aveugle, ce qui a déjà coûté une journée le 29/07.
2. **Test d'accord inter-annotateur** : Jean et son associé annotent le MÊME call séparément, puis comparent. Ce pourcentage est le **plafond réel de l'IA** — elle ne peut pas être plus cohérente que la définition elle-même. Vingt minutes, et ça évite de courir après un 100 % qui n'existe pas.
3. Puis, **un changement à la fois, mesure avant / mesure après** : (a) contre-exemples réels dans le prompt, en n'y mettant que ce qui vaut pour tout commercial B2B ; (b) passe de vérification sur le rattachement, seulement si le « bon rangement » reste bas ; (c) clustering Voyage des non classées pour proposer les catégories manquantes — indépendant, parallélisable ; (d) vote à trois sur l'extraction, en dernier recours.

Avec 4 calls, une objection pèse ~7 points : ne poursuivre que les écarts francs. **Décision d'architecture à ne pas rejouer** : le prompt porte la méthode (universelle), la configuration client porte la spécificité (les catégories, par organisation) — ne jamais mettre un contre-exemple propre à un client dans le prompt partagé.

### Déblocants business (priorité immédiate)
1. ~~Google OAuth — sortir du mode Testing~~ — **FAIT le 20/08/2026**. Projet *In production*, vérification soumise et en cours d'examen. Reste l'écran « application non vérifiée » à la première connexion et le plafond de 100 utilisateurs sur la durée de vie du projet (3 utilisés), non réinitialisable — raison de plus pour que la vérification aboutisse avant d'ouvrir vraiment les inscriptions.
2. **Exécuter la migration 011** (`rate_limit_events`) sur Supabase prod. Écrite le 31/08, jamais passée : tant qu'elle ne l'est pas, la limitation de débit partagée retombe en silence sur le limiteur en mémoire, qui ne voit qu'une instance Vercel. C'est le genre de chose qui a l'air de marcher.
3. Stripe en mode Live — activation compte (vérification entreprise). **Avant la bascule, trancher le pricing usage** : recommandation audit = quota d'heures inclus par siège (ex. 10h/mois puis 0,50€/h) plutôt que la refacturation sèche dès la 1ère heure — évite les lignes de facture à 3€ qui font poser des questions, et change la facturation AVANT les premiers clients payants plutôt qu'après

### Recommandations audit du 21 juillet (par ratio effort/valeur)
3. ~~**Sentry** sur webhooks + crons~~ — FAIT le 31/07/2026. `SENTRY_DSN` posée sur Vercel le 31/07/2026. **Vérification permanente** : `/admin/dashboard` → carte « Monitoring » — indique si la DSN est présente sur l'environnement courant et permet d'envoyer une erreur de test à la demande. À rejouer après tout changement de DSN : un monitoring qu'on croit actif alors qu'il ne l'est pas est pire que pas de monitoring, on cesse de surveiller en se croyant couvert. Les stack traces seront minifiées tant que `withSentryConfig` n'est pas ajouté à `next.config.ts` (nécessite un `SENTRY_AUTH_TOKEN`) — à faire seulement si les traces s'avèrent illisibles.
4. ~~**Checklist d'activation** sur le dashboard~~ — FAIT le 17/08/2026, avec la présentation produit qui manquait : `/bienvenue` (les 3 piliers Préparer/Débriefer/Progresser, mêmes mots que la landing) + les 4 étapes d'activation avec leur état réel (`getActivationState`). L'onboarding existant ne collectait que le profil : on pouvait le terminer et atterrir sur un tableau de bord vide sans comprendre pourquoi. `/onboarding` y redirige maintenant au lieu d'aller au dashboard, `ActivationBanner` rappelle le reste à faire en tête du dashboard tant que ce n'est pas complet (et disparaît ensuite — un bandeau permanent devient du décor), et l'aide y renvoie (on cherche « comment ça marche déjà ? » une semaine après, pas le premier jour). Ancien libellé : **Checklist d'activation** sur le dashboard ("Démarrage : 2/4 étapes" — agenda, CRM, playbook, premier brief) — à faire avant d'ouvrir Google OAuth, sinon les invités décrochent sur un dashboard vide
5. **Notifications inbox** : la cloche TopBar mène vers des préférences, pas une inbox — les événements existent déjà en base (devis accepté, réponse prospect, call analysé), il manque une table + un compteur. Depuis le 21/08 la cloche est le seul accès à la page, ce qui rend l'écart plus visible : on clique sur une cloche pour voir ce qui s'est passé, on tombe sur des cases à cocher
6. ~~**Recherche globale v1**~~ — FAIT le 31/07/2026 (`app/components/GlobalSearch.tsx`, `/api/search`, `searchEverything`). `ilike` sur contacts + calls, ⌘K, navigation clavier. **Périmètre : ses propres données + celles de ses commerciaux liés si manager** — sans cette extension la fonction ne renvoyait rien pour son premier utilisateur, un manager passant peu d'appels lui-même (constaté sur les vraies données avant déploiement). Les jokers `%`/`_` sont échappés, sans quoi une recherche sur `%` renverrait tout.
7. ~~**Dossier `migrations/`** committé~~ — FAIT (8 migrations numérotées au 30/07/2026). Règle en vigueur : toute nouvelle migration y est committée, même appliquée à la main.
8. ~~**Tests sur les flux irréversibles**~~ — FAIT le 31/07/2026. `npm test` (node:test + le loader strip-types déjà utilisé par les scripts, **zéro dépendance ajoutée**). 23 tests dans `tests/`, chacun nommant le bug qu'il verrouille. Les décisions à risque ont été extraites des routes vers `lib/billing-rules.ts` pour être testables sans simuler Stripe ni la base. Suite validée par mutation : réintroduire les bugs #15 et #1 fait bien échouer 3 tests.
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
