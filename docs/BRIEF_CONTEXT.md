Contexte Brief — reprise de session (version complète unifiée) — MàJ 30 juillet 2026
Je continue le développement de Brief avec toi sur plusieurs sessions successives. Ce document contient l'intégralité de l'état du projet depuis le début.


________________


Qui je suis / contexte produit
Je suis Jean de Reviers, COO chez Oliverlist (B2B SaaS qui génère des meetings qualifiés pour équipes commerciales). 


Je communique en français, style direct et efficace, je préfère les recommandations décisives aux échanges consultatifs open-ended. Je délègue l'exécution (Claude Code, colleagues) et je pilote produit + opérationnel.


Brief est un outil de sales enablement / conversation intelligence pour commerciaux B2B français, PME/ETI. Différenciateur : marché FR, données légales Pappers, prix accessible vs Gong/Sybill. Brief est le premier module d'un SaaS plus large.


Je travaille avec Claude Code pour l'implémentation (terminal + Git), et avec ce chat pour être guidé étape par étape. Je ne code jamais moi-même les instructions — je colle ce qu'on me donne dans Claude Code, je vérifie visuellement (screenshots), je pousse sur Git.


________________


Ce que fait Brief (vue produit)
1. Génération de briefs pré-call : contexte entreprise + contact + actualités générés par IA avant chaque RDV, sourcé via web search + Pappers + CRM connecté
2. Analyse post-call automatique : bot Recall rejoint les visios (Google Meet/Teams/Zoom), transcription, scoring multi-dimensions personnalisable via playbook manager, sentiment, points forts/faibles, prochaines étapes
3. Historique complet par contact : timeline de toutes les interactions (briefs, appels, emails, devis)
4. Devis intelligents : génération IA pré-remplie depuis les échanges, envoi email avec PDF joint, page publique de signature simple, tracking statuts
5. Tasks automatiques : après chaque événement (call terminé, email sans réponse, devis sans acceptation), création automatique de tasks de suivi avec brouillons email IA prêts à envoyer
6. Pilotage d'équipe manager : tableau de bord équipe, scores moyens, activité par commercial, tendances, accès enregistrements pour coaching
7. Distribution in-context : les briefs et analyses sont poussés là où le commercial travaille déjà (HubSpot, Google Calendar, email), pas forcément dans Brief lui-même


________________


Stack technique complète
* Next.js 16.2.7 + TypeScript + Tailwind CSS, build avec Turbopack
* Supabase (PostgreSQL + extension pgvector activée) — auth, BDD. RLS activé sur toutes les tables sans policies (bloque tout accès public, service_role bypasse).
* NextAuth.js — providers Google OAuth + Microsoft Azure AD (multi-tenant + comptes perso)
* Vercel — hébergement, déploiement auto sur chaque push vers main
* Repo GitHub : github.com/dereviersjean-cell/-brief-precall
* Site prod : **brief-ai.fr** (domaine OVH, acheté le 19/08/2026 ; www.brief-ai.fr redirige en 308 vers l'apex). brief-precall.vercel.app reste actif comme alias Vercel.
* L'origine publique n'est plus jamais écrite en dur : `lib/app-url.ts` exporte `APP_URL`, lu depuis `NEXT_PUBLIC_APP_URL` avec repli sur https://brief-ai.fr.
* Inngest — orchestrateur de jobs asynchrones (cron + event-driven), dashboard sur app.inngest.com
* Claude API — modèle claude-sonnet-4-6 pour génération, claude-haiku-4-5-20251001 pour tâches légères
* Voyage AI — voyage-3, embeddings 1024 dimensions
* Recall.AI — région EU exclusivement : https://eu-central-1.recall.ai. Dashboard : eu-central-1.recall.ai/dashboard. Pricing : $0.50/heure de call enregistré.
* Resend — emails transactionnels. Domaine émetteur : lartisangroupe.com, expéditeur : jean@lartisangroupe.com. Envs : RESEND_API_KEY, RESEND_FROM_EMAIL.
* HubSpot CLI (@hubspot/cli) — installé globalement, l'app OAuth HubSpot est dans le sous-dossier Brief/ du projet
* react-pdf/renderer — génération PDF devis
* react-markdown + remark-gfm — rendu markdown côté client (points clés, key_points)
* marked — conversion markdown → HTML pour les emails
* pdf-parse — extraction de texte depuis PDF (import playbook)
* lucide-react — icônes
* Stripe (SDK `stripe`) — facturation par organisation. Checkout Session (abonnement par siège, mensuel ou annuel) + Invoice Items (usage 0,50€/h, pas Billing Meters/Metronome) + Billing Portal (self-serve) + Stripe Tax (TVA automatique). Webhook `app/api/webhooks/stripe/route.ts`. Validé end-to-end en conditions réelles sur le compte Oliverlist (19 juillet 2026).


________________


Comptes de test en base (à utiliser pour tester nouvelles features)
* Jean (moi) : jean.dereviers@oliverlist.com — user_id ee6772b4-423f-4091-a140-bf3991919c8b, role manager
* Hubert de la Lance : hubert.delalance@oliverlist.com — user_id 39addb01-3110-4c96-ad24-2b22904bcd68, role commercial
* Organisation Oliverlist : id 5a90c843-b6c2-4be2-ab64-7469216253d0


Call de référence backfilé (à utiliser pour tester le transcript enrichi et les analytics) :


* Call Ravachol : id 16729b33-f56b-42a0-8687-c7dc0ae706f9
* Contact : a.ravachol@velbruncapital.fr (Velbrun Capital)
* Owner : Hubert
* Contient : transcript enrichi + speaker_names résolus + key_points en base + playbook_snapshot


________________


Arborescence des fichiers clés
Pages principales
Landing et auth


* app/page.tsx — landing marketing (fond lavande, Inter Tight + Instrument Serif italic, refonte complète)
* app/(marketing)/_components/ — composants landing (Header, Hero, DashboardMockup, HowItWorks, Features, Integrations, CTASection, Footer)
* app/login/page.tsx + GoogleSignInButton.tsx + MicrosoftSignInButton.tsx — connexion SSO uniquement (Google + Microsoft), split 50/50 avec citation serif italique


Modules utilisateur


* app/brief/page.tsx + BriefToolClient.tsx — outil de génération de brief (ancien contenu de /dashboard, déplacé le 16 juillet 2026 pour libérer /dashboard). Liste RDV avec badges "Brief généré" et bouton "Revoir". getExternalAttendee(event) filtre via GENERIC_DOMAINS.
* app/brief/[id]/page.tsx + BriefClient.tsx — affichage brief complet + section "Calls précédents"
* app/dashboard/page.tsx — nouveau tableau de bord (page d'accueil réelle post-connexion, depuis le 16 juillet 2026), deux vues selon le rôle. Composants : AnimatedNumber, CommercialOverview, ManagerOverview, ConnectionsStatus, DimensionScores, RecentCallsList, ScoreTrendChart, StatTile, TasksList, TeamRosterTable, FadeIn. Animé avec `motion`.
* app/onboarding/ — 4 étapes
* app/feedback/page.tsx + FeedbackClient.tsx — liste des calls avec badges (durée, caméra, sentiment, score)
* app/feedback/[id]/page.tsx + FeedbackDetailClient.tsx — détail call complet : bloc 💡 Points clés en tête, bloc vidéo, bloc 🎧 Analyse de la conversation (analytics), transcript enrichi avec édition speakers, scores dynamiques (playbook), email de suivi éditable avec dropdown "Type de call"
* app/contacts/page.tsx + ContactsClient.tsx — liste contacts avec stats (renommée "Historique" dans la sidebar)
* app/contacts/[email]/page.tsx + ContactTimelineClient.tsx — timeline complète par contact


Module Devis


* app/quotes/page.tsx + QuotesListClient.tsx — liste devis avec badges statut, lignes cliquables
* app/quotes/new/page.tsx et app/quotes/[quoteId]/page.tsx + QuoteEditor.tsx — éditeur devis
* app/quotes/settings/page.tsx + QuoteSettingsClient.tsx — paramètres entreprise + catalogue offres
* app/quotes/SendQuoteModal.tsx — modale envoi avec IA
* app/quotes/QuoteAcceptanceToast.tsx — toast à la connexion
* app/q/[token]/page.tsx — page publique de signature devis
* lib/pdf/QuoteDocument.tsx — génération PDF react-pdf


Module Tasks


* app/tasks/page.tsx + TasksListClient.tsx — liste groupée par urgence + onglet Historique
* app/tasks/settings/page.tsx + TaskTemplatesClient.tsx — templates par défaut
* app/tasks/TaskEmailModal.tsx — modale rédaction email avec dropdown "Type de call" + icône ⚙️
* app/tasks/TasksOverdueToast.tsx


Module Équipe


* app/team/page.tsx + TeamClient.tsx — dashboard manager
* app/team/[commercialId]/page.tsx + TeamMemberDetailClient.tsx
* app/team/[commercialId]/calls/[callId]/page.tsx + CallDetailClient.tsx — vue readOnly manager
* app/team/playbook/page.tsx + PlaybookClient.tsx + ImportPlaybookModal.tsx — playbook manager. Import via 3 onglets dans la modale : "Coller le texte", "Fichier" (PDF + Word .doc/.docx via mammoth), "Depuis Notion" (recherche pages partagées avec l'intégration → confirmation titre → extraction Claude partagée)
* app/team/email-templates/page.tsx + EmailTemplatesClient.tsx — templates emails manager
* app/team/insights/page.tsx + TeamInsightsClient.tsx — win/loss manager (19 juillet 2026) : objections les plus fréquentes + taux de succès, scores playbook comparés gagné/perdu
* app/team/ManageTeamModal.tsx — gestion rattachements
* app/team/InviteCommercialModal.tsx — invitation commercial


Settings (onglets horizontaux, app/settings/_components/SettingsTabs.tsx — remplace l'ancienne nav verticale SettingsNav.tsx)


* app/settings/page.tsx (redirect vers /general)
* app/settings/general/page.tsx — profil commercial + références clients
* app/settings/connexions/page.tsx — Recall Google/Microsoft + bouton "Reconnecter Google Calendar" (scope events)
* app/settings/crm/page.tsx — HubSpot + Pipedrive
* app/settings/references/page.tsx — base de références clients modifiable + explication vectorisation
* app/settings/billing/page.tsx + BillingSettingsClient.tsx — manager-only. Statut d'abonnement, sièges actifs, coût mensuel estimé, essai/renouvellement, bannière alerte fenêtre de grâce, CTA Checkout ou Billing Portal
* app/settings/notifications/page.tsx + NotificationSettingsClient.tsx — préférences distribution


Admin backoffice (refonte design complète le 18 juillet 2026 — voir "Modules terminés")


* app/admin/page.tsx — interface admin principale (config brief + zone de test), auth login inline (seule page qui gère l'état non-authentifié)
* app/admin/AdminShell.tsx — Spinner + AdminLoginForm + AdminPageShell + AdminPageHeader + AdminCard, partagés par toutes les pages admin (avant : dupliqués dans 6 fichiers)
* app/admin/AdminNav.tsx — sidebar navigation admin (icônes lucide, largeur 256px)
* app/admin/dashboard/page.tsx + DashboardAdminClient.tsx — dashboard utilisateurs avec role, filtres, actions (désactiver/réactiver/supprimer/impersonate)
* app/admin/dashboard/users/[userId]/page.tsx + UserDetailAdminClient.tsx — détail user avec RDV programmés + rendez-vous sans enregistrement + historique impersonation
* app/admin/dashboard/RecallStatusSection.tsx + RecallStatusTables.tsx + AdminBadges.tsx
* app/admin/organizations/page.tsx + OrganizationsAdminClient.tsx
* app/admin/organizations/[orgId]/page.tsx + OrganizationDetailClient.tsx — détail organisation en 4 onglets horizontaux (Membres / Ajouter un membre / Facturation / Zone dangereuse)
* app/admin/prompts/page.tsx + PromptsAdminClient.tsx — éditeur des prompts, 10 prompts en onglets horizontaux (un affiché à la fois, point ambre si valeur ≠ défaut)
* app/admin/test-brief/page.tsx — test génération brief
* app/admin/test-analysis/page.tsx — test analyse call
* app/admin/test-email/page.tsx — test email suivi

Toutes les pages sauf `/admin` (le login) sont gatées côté serveur via `isAdminAuthenticated()` + `redirect("/admin")` (uniforme depuis la refonte — avant, 5 pages géraient leur propre état loading/login/ready côté client).


Module Facturation (Stripe, 18-19 juillet 2026 — voir "Modules terminés" pour le détail complet)


* lib/stripe.ts — client Stripe (instancié au point d'usage, pas de wrapper central, même convention que lib/recall.ts). Checkout Session (essai 7j, carte requise, mensuel/annuel, Stripe Tax activé), sync sièges, report usage mensuel (Invoice Items), Billing Portal, vérification webhook
* app/api/webhooks/stripe/route.ts — idempotent via table billing_events, calqué sur le webhook Recall (body brut, signature avant parsing, 200 même si un effet de bord échoue)
* app/api/settings/billing/checkout/route.ts + portal/route.ts + status/route.ts — démarrer l'essai, gérer l'abonnement (Portal), statut lecture seule (tout user, pas manager-only — la bannière de grâce doit être visible par toute l'org)
* app/api/admin/organizations/[orgId]/billing/route.ts (PATCH) — override support (unblock | extend_grace), n'agit jamais sur le vrai abonnement Stripe, seulement sur l'accès Brief
* app/components/BillingGraceBanner.tsx — bannière site-wide (countdown en heures) pendant la fenêtre de grâce, ajoutée à côté d'ImpersonationBanner dans les 9 layouts applicatifs
* app/compte-suspendu/page.tsx — page de blocage (middleware), message différent manager (lien vers /settings/billing) vs commercial (contacter le manager), et différencié selon la cause (résiliation vs échec de paiement)
* Crons Inngest (lib/inngest-functions.ts) : reportBillingUsage (1er du mois), checkBillingGracePeriods (horaire)


Module Bibliothèque d'objections & win/loss (19 juillet 2026 — voir "Modules terminés" pour le détail complet)


* lib/objections.ts — indexCallObjections (embed + insert dans call_objections via supabaseAdmin), findSimilarObjections (RPC match_call_objections, même schéma que findSimilarReferences)
* app/api/objections/similar/route.ts (POST) — recherche à la demande, enrichit chaque résultat avec le badge d'issue (getDealOutcomeForContact)
* app/api/recall/bot-webhook/route.ts — indexe les objections juste après saveCallAnalysis, non-bloquant
* scripts/backfill-objections.ts — ré-extrait les objections des calls existants sans re-scorer le reste de l'analyse (extractObjectionsFromTranscript, lib/call-analysis.ts)
* Cron Inngest syncDealOutcomes (30 min, lib/inngest-functions.ts) : signal win/loss CRM (HubSpot/Pipedrive closedwon/closedlost), complète le signal quote écrit en synchrone


Sidebar principale (app/components/AppSidebar.tsx)


* Brief (ancien "Brief pré-call")
* Analyse rendez-vous (ancien "Feedback post-call")
* Historique (ancien "Contacts")
* Devis
* Tasks (avec pastille rouge compteur)
* Équipe (avec sous-liens Playbook + Templates emails + Insights si manager)
* Paramètres + Déconnexion en bas
Lib (logique métier)
Fichiers principaux


* lib/db.ts — TOUTES les fonctions utilisent supabaseAdmin (service_role, bypass RLS)
* lib/auth.ts — NextAuth config, scopes Google : openid email profile calendar.events gmail.readonly gmail.send (calendar.events depuis sous-étape B distribution)
* lib/impersonation.ts — getImpersonationTarget() lit le cookie brief_impersonate_user_id
* lib/api-auth.ts — requireActiveUser(session) : vérifie session + disabled_at, gère l'impersonation
* lib/session-user.ts — getEffectiveUserId() pour les server components pages


Génération et IA


* lib/ai-json.ts — extractJsonObject(raw) partagé par toutes les routes de génération JSON (strip fences, isolation de l'objet {...}, sanitize des caractères de contrôle bruts dans les strings) — uniformisé le 19 juillet 2026, remplace 3 implémentations locales divergentes
* lib/brief-generator.ts — generateBrief(...) avec web search natif Claude, appels parallèles Pappers/CRM/refs, type GeneratedBriefJson
* lib/call-analysis.ts — analyzeCall(transcript, context, playbookSnapshot) avec dimensions dynamiques
* lib/email-followup.ts — generateFollowUpEmail, generateReplyToProspect, generateReplyToProspectWithTemplate
* lib/key-points.ts — generateKeyPoints(transcript) + stripDuplicateTitle (robuste regex)
* lib/transcript-analytics.ts — computeConversationAnalytics(transcriptJson, speakerNames, ownerName) fonction pure
* lib/playbook-scores.ts — getEffectiveScoresForDisplay(callAnalysis) (module pur sans dépendance server)
* lib/quote-calc.ts — logique calcul HT/remise/TVA/TTC partagée entre DB, PDF, éditeur
* lib/admin-config.ts — config stockée en Supabase (admin_config, clé main_config + clés spécifiques). Imports dynamiques de lib/db.ts. Contient tous les DEFAULT_*_PROMPT.
* lib/format.ts — formatContactDisplayName(company_name, email) utilisé partout


Intégrations externes


* lib/pappers.ts — enrichissement légal FR (sans crédits actuellement, fallback mémoire Claude). Bon champ : libelle_code_naf
* lib/news.ts — Serper API avec fallback NewsAPI
* lib/embeddings.ts — generateEmbedding, findSimilarReferences via Voyage AI + RPC Supabase match_client_references
* lib/objections.ts — indexCallObjections, findSimilarObjections (même provider/pattern que lib/embeddings.ts, mais scope organization_id et supabaseAdmin — voir bugs)
* lib/calendar.ts — getUpcomingMeetings(accessToken, provider, userEmail) (Google Calendar API ou Microsoft Graph)
* lib/google-calendar.ts — appendBriefToCalendarEvent, hasCalendarWriteAccess (interroge Google tokeninfo)
* lib/recall.ts — toutes les fonctions Recall EU. buildTranscriptJson, resolveSpeakerNames (heuristique 4 branches), getTranscriptContent, transcriptToText (attention : structure Recall utilise participant.{id,name,email}, pas speaker), getBotInfo, syncAndScheduleForUser, getVideoUrl
* lib/gmail.ts — getEmailHistory, refreshGoogleAccessToken, checkThreadReply
* lib/email.ts — Resend : sendInvitationEmail, sendQuoteAcceptedEmail, sendBriefPreCallEmail, sendCallAnalysisEmail


CRM


* lib/crm/pipedrive.ts — OAuth + lecture + écriture (sous-étape C2). api_domain contient déjà https://, ne jamais préfixer. hasPipedriveWriteAccess, findPipedriveContactForEmail, findPipedriveDealForEmail, findClosedDealsForEmail (module win/loss), findPipedriveActivityForEmail, appendToPipedriveActivityNote, createPipedriveNoteOnDeal, createPipedriveNoteOnContact, writeToPipedriveCascade (activity → deal → contact), htmlBodyForPipedrive
* lib/crm/hubspot.ts — OAuth + lecture + écriture (sous-étape C1). hasHubSpotWriteAccess, findHubSpotContactForEmail, findHubSpotDealForEmail (filtre closedwon/closedlost), findClosedDealsForEmail (inverse — ne garde QUE closedwon/closedlost, module win/loss), findHubSpotMeetingForEmail, appendToHubSpotMeetingBody (écrit dans hs_meeting_body — pas d'association note↔meeting côté HubSpot), createHubSpotNoteOnDeal, createHubSpotNoteOnContact, writeToHubSpotCascade (meeting → deal → contact), htmlBodyForHubSpot (markdown → HTML + tables → listes à puces), idempotence via marqueur invisible <!-- brief-note-uid:{uid} -->. Sync tasks (18 juillet 2026) : createHubSpotTask, updateHubSpotTaskStatus, deleteHubSpotTask, batchGetHubSpotTaskStatuses, getHubSpotOwnerId (résout l'owner HubSpot via token-info email → Owners API), findNewHubSpotTasksForOwner (import inverse). Scope ajouté : crm.objects.owners.read
* lib/tasks-hubspot-sync.ts — pushNewTasksToHubSpot(userId, tasks, contactEmail) : pousse les tasks générées par un template Brief (push_to_hubspot=true) vers HubSpot
* lib/crm/enrichment.ts — enrichFromCRM(userId, companyName) : Pipedrive puis HubSpot fallback


Distribution & notifications


* lib/notification-preferences.ts — types, CHANNEL_META, expandPreferences. NotificationChannel = email | calendar | hubspot | pipedrive | slack
* lib/notifications-dispatcher.ts — dispatchBriefPreCall, dispatchCallAnalysis (orchestration au-dessus de lib/crm/*.ts, lib/slack.ts, lib/email.ts)
* lib/slack.ts — OAuth Slack + DM par user (pas de canal partagé). hasSlackConnection, saveSlackConnection, disconnectSlack, sendSlackDirectMessage, writeToSlackDM, mrkdwnMessageForSlack (markdown → mrkdwn Slack)
* lib/digest.ts — orchestration digest hebdo (2 crons Inngest, un par timing). Charge le SDK Anthropic — ne jamais importer depuis un composant client (cf bug #39)
* lib/dashboard.ts — helpers purs partagés par les composants client du nouveau /dashboard (StatTile, ScoreTrendChart, RecentCallsList, TeamRosterTable, DimensionScores). Volontairement dépendance-free (pas de lib/digest.ts, pas de lib/db.ts) pour ne pas faire fuiter le SDK Anthropic/supabaseAdmin dans le bundle client
* lib/paris-week.ts — mostRecentParisMonday, bucketScoresByWeek : logique de bucketing par semaine (Europe/Paris) partagée entre lib/digest.ts et lib/dashboard.ts, sans dépendance
* lib/notion.ts — token d'intégration interne Notion (pas OAuth). validateNotionToken, searchNotionPages, getNotionPageText


Autres


* lib/inngest-functions.ts — crons Inngest (syncRecallCalendars toutes les 5 min, checkEmailsWithoutReply toutes les 30 min, checkQuotesWithoutAcceptance toutes les 30 min)
* types/next-auth.d.ts — extensions Session/JWT
API Routes
Routes Recall


* app/api/recall/google-oauth/start/ + callback/ — OAuth Google pour Recall (CSRF cookie recall_oauth_state)
* app/api/recall/microsoft-oauth/start/ + callback/
* app/api/recall/disconnect/route.ts
* app/api/recall/sync-and-schedule/route.ts
* app/api/recall/video-url/route.ts — URL vidéo fraîche (S3 signée ~5h, ne jamais stocker en base). Autorise aussi les managers via getCallWithAnalysisForManager.
* app/api/recall/webhook/route.ts — webhook calendar (Svix)
* app/api/recall/bot-webhook/route.ts — webhook bot (Svix, headers webhook-* avec fallback svix-*). Génère aussi les key_points et déclenche les tasks post-call + notifications dispatch.


Routes feedback


* app/api/feedback/send-follow-up/route.ts
* app/api/feedback/check-reply/route.ts
* app/api/feedback/send-reply/route.ts
* app/api/feedback/generate-reply-suggestion/route.ts — accepte email_template_id optionnel
* app/api/feedback/[id]/speaker-names/route.ts — PATCH mapping speakers
* app/api/feedback/[id]/key-points/route.ts — POST génère et cache


Routes CRM


* app/api/crm/pipedrive/start|callback|import-references|disconnect/
* app/api/crm/hubspot/start|callback|import-references|disconnect/


Routes Devis


* app/api/quotes/route.ts (GET/POST)
* app/api/quotes/[quoteId]/route.ts (GET/PATCH/DELETE)
* app/api/quotes/[quoteId]/pdf/route.ts
* app/api/quotes/[quoteId]/send/route.ts
* app/api/quotes/[quoteId]/generate-email/route.ts
* app/api/quotes/generate/route.ts — pré-remplissage IA
* app/api/quotes/settings/route.ts + logo/route.ts
* app/api/quotes/offers/route.ts + [offerId]/route.ts
* app/api/quotes/pending-notifications/route.ts + [quoteId]/mark-notified/route.ts
* app/api/public/quotes/[token]/route.ts + accept/route.ts + reject/route.ts + pdf/route.ts


Routes Tasks


* app/api/tasks/route.ts (GET filter)
* app/api/tasks/[taskId]/complete|dismiss/route.ts
* app/api/tasks/pending-count/route.ts
* app/api/tasks/[taskId]/generate-email/route.ts — accepte email_template_id, contrat JSON forcé côté serveur, max_tokens 1500, extractJsonObject robuste
* app/api/tasks/[taskId]/send-email/route.ts
* app/api/tasks/templates/route.ts + [templateId]/route.ts
* app/api/tasks/import-hubspot-setting/route.ts (PATCH) — toggle users.import_hubspot_tasks


Routes Team


* app/api/team/available-commercials/route.ts
* app/api/team/link/route.ts + unlink/route.ts
* app/api/team/invite/route.ts


Routes Playbook


* app/api/playbook/route.ts (GET/PATCH)
* app/api/playbook/dimensions/route.ts + [dimensionId]/route.ts + reorder/route.ts
* app/api/playbook/criteria/route.ts + [criterionId]/route.ts
* app/api/playbook/import/route.ts (POST PDF, Word ou texte) — extractPlaybookDimensions exportée pour être réutilisée par notion/import
* app/api/playbook/apply-import/route.ts
* app/api/playbook/notion/connect/route.ts + status/route.ts + disconnect/route.ts — connexion token d'intégration interne, par organisation
* app/api/playbook/notion/pages/route.ts — recherche des pages partagées avec l'intégration
* app/api/playbook/notion/import/route.ts — extraction d'une page Notion vers le format playbook


Routes Email templates


* app/api/email-templates/route.ts + [templateId]/route.ts + reorder/route.ts
* app/api/email-templates/[templateId]/override/route.ts (GET/PUT/DELETE)


Routes Notifications préférences


* app/api/notification-preferences/route.ts (GET/POST)
* app/api/notification-preferences/calendar-status/route.ts
* app/api/notification-preferences/hubspot-status/route.ts
* app/api/notification-preferences/slack-status/route.ts
* app/api/slack/start|callback|disconnect/route.ts — OAuth Slack
* app/api/digest-preferences/route.ts (GET/POST enabled + timing)
* app/api/digest-preferences/send-preview/route.ts — aperçu à la demande


Routes Admin


* app/api/admin/config/route.ts (GET/POST)
* app/api/admin/test/route.ts
* app/api/admin/dashboard-stats/route.ts
* app/api/admin/prompts/route.ts — 6 prompts éditables : call_analysis_system_prompt, email_followup_prompt, reply_suggestion_prompt, quote_generation_prompt, quote_email_prompt, task_email_prompt, playbook_extraction_prompt
* app/api/admin/test-brief|test-analysis|test-email/route.ts
* app/api/admin/recall-status/route.ts — étendu avec ?userId= pour la page détail user
* app/api/admin/users/route.ts (POST création)
* app/api/admin/users/[userId]/route.ts (DELETE soft/hard)
* app/api/admin/users/[userId]/restore/route.ts + resend-invitation/route.ts
* app/api/admin/organizations/route.ts + [orgId]/route.ts + [orgId]/members/route.ts + [orgId]/members/[userId]/route.ts + available-users/route.ts
* app/api/admin/impersonate/route.ts (POST/DELETE)
* app/api/impersonation-status/route.ts


Routes Facturation


* app/api/webhooks/stripe/route.ts (POST) — checkout.session.completed, customer.subscription.updated/created/deleted, invoice.payment_failed/succeeded
* app/api/settings/billing/checkout/route.ts (POST) — manager-only, démarre l'essai/Checkout pour l'org (accepte interval: 'month'|'year')
* app/api/settings/billing/portal/route.ts (POST) — manager-only, session Billing Portal
* app/api/settings/billing/status/route.ts (GET) — tout user actif, statut + fin de grâce (alimente BillingGraceBanner)
* app/api/admin/organizations/[orgId]/billing/route.ts (PATCH) — admin uniquement, override support unblock|extend_grace


Routes Objections


* app/api/objections/similar/route.ts (POST) — tout user actif, recherche par similarité scope organization_id, enrichit avec le badge d'issue (deal_outcomes)


Routes supprimées (nettoyage historique) check-calendar, connect-google, get-calendar, get-transcript, list-bots, list-events, set-preferences, trigger-transcript, create-calendar-v2, init-prompts, /admin/impersonation-logs (dédoublonné dans /admin/dashboard/users/[userId])


________________


Tables Supabase — schéma complet
-- users (colonnes ajoutées progressivement)


recall_calendar_id text


google_access_token text


google_refresh_token text


google_id text  -- avec unique index partiel WHERE NOT NULL


microsoft_id text  -- avec unique index partiel WHERE NOT NULL


role text NOT NULL DEFAULT 'commercial'  -- 'commercial' | 'manager'


organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL


disabled_at timestamptz


invited_at timestamptz


invited_by uuid REFERENCES users(id) ON DELETE SET NULL


-- organizations


CREATE TABLE organizations (


  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,


  name text NOT NULL,


  created_at timestamptz DEFAULT now()


);

-- Colonnes facturation (Stripe, 18-19 juillet 2026) ajoutées à organizations :
-- stripe_customer_id text, stripe_subscription_id text, stripe_seat_item_id text,
-- billing_status text NOT NULL DEFAULT 'none',  -- none|trialing|active|grace_period|blocked|canceled (blocked ET canceled bloquent l'accès, voir middleware)
-- billing_interval text,  -- 'month' | 'year', lu depuis SubscriptionItem.price.recurring.interval
-- trial_ends_at timestamptz, grace_period_ends_at timestamptz,
-- current_period_start timestamptz, current_period_end timestamptz,
-- last_usage_reported_at timestamptz  -- curseur du cron mensuel d'usage, pas de table de ledger séparée

-- billing_events (idempotence webhook Stripe — pas de ligne métier naturelle
-- sur laquelle upserter pour tous les types d'événements, contrairement aux
-- webhooks Recall)
CREATE TABLE billing_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  processed_at timestamptz DEFAULT now()
);

-- call_objections (bibliothèque d'objections, 19 juillet 2026) — indexation
-- vectorielle par organisation (pas par user, comme le playbook), RPC
-- match_call_objections (même schéma que match_client_references)
CREATE TABLE call_objections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  contact_email text,
  objection text NOT NULL,
  response text NOT NULL,
  embedding vector(1024),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX call_objections_org_idx ON call_objections (organization_id);

-- deal_outcomes (signal win/loss unifié, 19 juillet 2026) — contact_email
-- comme clé de jointure (pas d'id CRM stocké côté Brief). source='quote'
-- écrit en synchrone (acceptQuoteByPublicToken/rejectQuoteByPublicToken),
-- source='hubspot'|'pipedrive' écrit par le cron syncDealOutcomes
CREATE TABLE deal_outcomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  source text NOT NULL,        -- 'quote' | 'hubspot' | 'pipedrive'
  outcome text NOT NULL,       -- 'won' | 'lost'
  amount numeric,
  closed_at timestamptz,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, contact_email, source)
);

-- call_analysis.objections (jsonb, colonne préexistante) : contient
-- désormais {objection, response}[] au lieu de toujours []. Lignes plus
-- anciennes que le 19 juillet 2026 peuvent encore contenir un format legacy
-- (string[] brut, voir bug #50) — normalisé à la lecture par
-- normalizeCallAnalysis (lib/db.ts), pas besoin de migration de données.


-- manager_commercial_links (many-to-many)


CREATE TABLE manager_commercial_links (


  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,


  manager_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,


  commercial_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,


  created_at timestamptz DEFAULT now(),


  UNIQUE(manager_id, commercial_id)


);


-- admin_impersonation_logs


CREATE TABLE admin_impersonation_logs (


  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,


  target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,


  admin_identifier text NOT NULL,


  started_at timestamptz DEFAULT now(),


  ended_at timestamptz,


  ip_address text,


  user_agent text


);


-- briefs


-- id, user_id, company_name, contact_email, calendar_event_id, content (jsonb), model_used, created_at


UNIQUE (user_id, calendar_event_id)  -- upsert idempotent


-- client_references


-- id, user_id, client_name, sector, company_size, problem, solution, result, raw_text, source, embedding vector(1024), created_at


-- import_jobs


-- id, user_id, status, total, processed, chunks_total, chunks_done, created_at, updated_at


-- calls


-- id, user_id, brief_id, calendar_event_id, contact_email, company_name,


-- recall_bot_id, status, transcript, transcript_json (jsonb), speaker_names_override (jsonb DEFAULT '{}'),


-- duration_seconds, started_at, ended_at, created_at, recording_id, transcript_id,


-- follow_up_email jsonb, follow_up_sent_at timestamptz, gmail_thread_id text,


-- reply_message_id text, replied_at timestamptz, participant_count int4,


-- recall_bot_status text, recall_bot_status_fetched_at timestamptz


UNIQUE (recall_bot_id)  -- idempotent, évite les doublons de calls sur retry webhook


-- call_analysis


-- id, call_id FK UNIQUE, strengths jsonb, weaknesses jsonb, objections jsonb, next_steps jsonb,


-- summary text, sentiment ('positif'/'neutre'/'négatif'), scores jsonb (dynamique selon playbook),


-- playbook_snapshot jsonb, key_points text, key_points_generated_at timestamptz, created_at


-- contacts


-- id, user_id, email, company_name, total_calls, last_call_summary,


-- relationship_stage default 'prospect', created_at, updated_at, UNIQUE(user_id, email)


-- crm_connections


CREATE TABLE crm_connections (


  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,


  user_id uuid REFERENCES users(id) ON DELETE CASCADE,


  provider text NOT NULL, -- 'pipedrive', 'hubspot', 'sellsy', 'slack' (api_domain détourné pour le slackUserId)


  access_token text,


  refresh_token text,


  api_domain text,  -- Pipedrive uniquement


  created_at timestamptz DEFAULT now(),


  updated_at timestamptz DEFAULT now(),


  UNIQUE(user_id, provider)


);


-- admin_config (key/value pour prompts + config)


-- id, key, value (jsonb), updated_at


-- scheduled_meetings


CREATE TABLE scheduled_meetings (


  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,


  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,


  calendar_event_id text NOT NULL,


  event_title text,


  event_start_at timestamptz NOT NULL,


  bot_scheduled boolean NOT NULL DEFAULT false,


  ineligibility_reason text,


  last_synced_at timestamptz DEFAULT now(),


  recall_bot_id text,


  recall_bot_status text,


  recall_bot_status_fetched_at timestamptz,


  UNIQUE(user_id, calendar_event_id)


);


-- quote_settings (1 par user)


CREATE TABLE quote_settings (


  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,


  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,


  company_name text, company_siret text, company_vat_number text,


  company_address text, company_email text, company_phone text, company_website text,


  company_logo_url text, company_rib text, legal_mentions text,


  default_vat_rate numeric(5,2) DEFAULT 20.00,


  payment_terms text, quote_number_prefix text DEFAULT 'DEV', next_quote_number integer DEFAULT 1,


  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()


);


-- quote_offers (catalogue)


CREATE TABLE quote_offers (


  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,


  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,


  name text NOT NULL, description text, unit_price numeric(10,2) NOT NULL,


  unit text DEFAULT 'unité', vat_rate numeric(5,2) DEFAULT 20.00,


  sort_order integer DEFAULT 0, archived_at timestamptz,


  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()


);


-- quotes + quote_lines (avec snapshots)


-- quotes : id, user_id, contact_id, quote_number, status (draft/sent/accepted/rejected),


--   company_snapshot jsonb, client_name, client_email, client_address, client_siret, client_vat_number,


--   notes, legal_mentions, payment_terms, subtotal_ht, total_discount, total_vat, total_ttc,


--   issued_at, valid_until, sent_at, viewed_at, accepted_at, rejected_at,


--   public_token text UNIQUE, rejection_reason, acceptance_notified boolean DEFAULT false,


--   sent_email_subject, sent_email_body,


--   UNIQUE (user_id, quote_number)


-- quote_lines : id, quote_id FK, offer_id, name, description, quantity, unit, unit_price,


--   vat_rate, discount_type ('percent'|'amount'|null), discount_value, sort_order


-- task_templates + tasks


CREATE TABLE task_templates (


  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,


  trigger_type text NOT NULL,  -- 'post_call' | 'email_sent_no_reply' | 'quote_sent_no_reply'


  offset_hours integer NOT NULL DEFAULT 0,


  task_type text NOT NULL, title text NOT NULL, description text,


  action_type text NOT NULL DEFAULT 'none',


  enabled boolean NOT NULL DEFAULT true, sort_order integer DEFAULT 0


);


CREATE TABLE tasks (


  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,


  template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL,


  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,


  contact_email text, contact_name text,


  source_type text NOT NULL,  -- 'call' | 'email' | 'quote' | 'hubspot' (littéral, pas dans le type TaskSourceType — voir sous-étape sync HubSpot)


  source_id uuid, task_type text NOT NULL, title text NOT NULL,


  description text, action_type text NOT NULL DEFAULT 'none',


  hubspot_task_id text,  -- lien vers la task HubSpot correspondante (sync bidirectionnel, 18 juillet 2026)


  due_at timestamptz NOT NULL, completed_at timestamptz, dismissed_at timestamptz,


  UNIQUE(user_id, template_id, source_type, source_id)  -- idempotent (tasks générées par template)
  -- tasks importées depuis HubSpot (template_id NULL) : idempotence en check-then-insert applicatif,
  -- pas via cette contrainte (les NULL ne s'entrechoquent jamais entre eux dans une UNIQUE Postgres)


);


-- task_templates.push_to_hubspot boolean NOT NULL DEFAULT false — toggle par template : chaque task
-- générée par ce template crée aussi une task HubSpot

-- users.import_hubspot_tasks boolean NOT NULL DEFAULT false — toggle par user : importe les tasks
-- créées nativement dans HubSpot (assignées à l'owner correspondant) vers Brief


-- playbooks + dimensions + criteria (1 par org)


CREATE TABLE playbooks (


  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,


  name text NOT NULL DEFAULT 'Playbook par défaut',


  created_by uuid REFERENCES users(id) ON DELETE SET NULL


);


CREATE TABLE playbook_dimensions (


  id uuid PRIMARY KEY, playbook_id uuid NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,


  key text NOT NULL, label text NOT NULL, description text,


  weight integer NOT NULL DEFAULT 1, sort_order integer NOT NULL DEFAULT 0,


  UNIQUE(playbook_id, key)


);


CREATE TABLE playbook_criteria (


  id uuid PRIMARY KEY, dimension_id uuid NOT NULL REFERENCES playbook_dimensions(id) ON DELETE CASCADE,


  question text NOT NULL, sort_order integer NOT NULL DEFAULT 0


);


-- email_templates + overrides


CREATE TABLE email_templates (


  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,


  name text NOT NULL, description text, system_prompt text NOT NULL,


  sort_order integer NOT NULL DEFAULT 0, is_default boolean NOT NULL DEFAULT false,


  created_by uuid REFERENCES users(id) ON DELETE SET NULL


);


CREATE TABLE email_template_overrides (


  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,


  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,


  system_prompt text NOT NULL,


  UNIQUE(user_id, template_id)


);


-- notification_preferences


CREATE TABLE notification_preferences (


  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,


  event_type text NOT NULL,  -- 'brief_precall' | 'analyse_postcall'


  channel text NOT NULL,  -- 'email' | 'calendar' | 'hubspot' | 'pipedrive' | 'slack'


  enabled boolean NOT NULL DEFAULT false,


  UNIQUE(user_id, event_type, channel)


);


-- digest_preferences (1 par user)


CREATE TABLE digest_preferences (


  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,


  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,


  enabled boolean NOT NULL DEFAULT false,


  timing text NOT NULL DEFAULT 'friday_evening',  -- 'friday_evening' | 'monday_morning'


  updated_at timestamptz DEFAULT now()


);


-- playbook_notion_connections (1 par organisation, pas par user)


CREATE TABLE playbook_notion_connections (


  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,


  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,


  access_token text NOT NULL,  -- token d'intégration interne Notion, pas OAuth


  connected_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,


  updated_at timestamptz DEFAULT now()


);


-- Slack : pas de table dédiée. Réutilise crm_connections avec provider='slack'
-- (même forme access_token + un champ texte en plus) : api_domain est détourné
-- pour stocker le slackUserId (cible du DM chat.postMessage), pas un domaine
-- — même logique de réutilisation que Pipedrive détournant api_domain pour
-- une URL complète https://... au lieu d'un simple domaine.


________________


Variables d'environnement (Vercel + .env.local)
ANTHROPIC_API_KEY


GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET


AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID


NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL


NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY


PAPPERS_API_KEY (sans crédits actuellement)


SERPER_API_KEY, NEWS_API_KEY


ADMIN_PASSWORD


VOYAGE_API_KEY


INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY


RECALL_API_KEY


RECALL_GOOGLE_CLIENT_ID, RECALL_GOOGLE_CLIENT_SECRET  -- SÉPARÉ de GOOGLE_CLIENT_ID


RECALL_BOT_WEBHOOK_SECRET (Svix pour /api/recall/bot-webhook)


RECALL_CALENDAR_WEBHOOK_SECRET (Svix pour /api/recall/webhook)


RECALL_MICROSOFT_CLIENT_ID, RECALL_MICROSOFT_CLIENT_SECRET


PIPEDRIVE_CLIENT_ID, PIPEDRIVE_CLIENT_SECRET


HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET


RESEND_API_KEY, RESEND_FROM_EMAIL


STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_SEAT, STRIPE_PRICE_ID_SEAT_ANNUAL


ADMIN_TEST_USER_ID=ee6772b4-423f-4091-a140-bf3991919c8b


________________


HubSpot Developer Portal — configuration spéciale
L'app HubSpot OAuth est créée via CLI HubSpot dans le sous-dossier Brief/ du repo Next.js.


Fichier de config : Brief/src/app/app-hsmeta.json


Deploy :


cd Brief


hs project upload


IDs :


* Project ID : 148811650
* App ID : 44449362


Scopes actuels (lecture + écriture) :


* oauth
* crm.objects.deals.read
* crm.objects.deals.write
* crm.objects.contacts.read
* crm.objects.contacts.write
* crm.objects.companies.read


Découvertes importantes sur les scopes HubSpot :


* Il n'existe PAS de scope crm.objects.notes.* ni crm.objects.meetings.*
* Les notes ET les meetings sont des engagements attachés aux contacts/deals, donc contacts.write + deals.write couvrent les deux
* Écrire dans le corps d'un meeting = PATCH sur hs_meeting_body (nécessite contacts.write)
* HubSpot ne supporte pas les tables HTML dans les notes/meetings → convertir en listes à puces


________________


Middleware et protections
middleware.ts protège en session obligatoire + disabled_at check :


* /dashboard/:path*
* /brief/:path*
* /settings/:path*
* /feedback/:path*
* /contacts/:path*
* /onboarding/:path*
* /quotes/:path*
* /tasks/:path*
* /team/:path*


Toutes les routes API sensibles utilisent requireActiveUser(session) de lib/api-auth.ts (26 routes).


Les routes /api/admin/* utilisent isAdminAuthenticated (mot de passe partagé) et ne sont jamais impactées par l'impersonation.


________________


Prompts éditables dans /admin/prompts
Stockés dans admin_config (table key/value), pas dans un fichier :


* call_analysis_system_prompt — analyse de call (dimensions dynamiques via playbook)
* email_followup_prompt — email de suivi post-call
* reply_suggestion_prompt — suggestion réponse au prospect
* quote_generation_prompt — pré-remplissage IA du devis
* quote_email_prompt — email d'envoi du devis
* task_email_prompt — brouillon email pour une task
* playbook_extraction_prompt — extraction IA du playbook depuis un doc


Prompt hardcodé : lib/key-points.ts — génération des points clés (décision volontaire, prompt fixe indépendant du manager)


________________


Modules terminés — récap chronologique

Objections mesurables — 29-30 juillet 2026 (migrations 006, 007, 008)
* Playbook d'objections du manager (objection_categories) : le directeur commercial définit les objections récurrentes ET la manière de les traiter, à la main ou par import de document (PDF/Word/collage). L'import est ADDITIF, contrairement à l'import du playbook de scoring qui remplace — on complète une bibliothèque, on ne l'écrase pas.
* Classification sémantique + évaluation (lib/objection-classifier.ts) : un appel Claude par lot de 10 objections range chaque objection dans une catégorie ET note la réponse du commercial par rapport au handling_guidance du manager (bien traitée / partiellement / non traitée + commentaire). Branché dans indexCallObjections, seul chokepoint des écritures call_objections, donc rien n'entre en base non classé.
* Verbatims (migration 007) : le transcript est envoyé au modèle AVEC SES LIGNES NUMÉROTÉES et il renvoie des intervalles de lignes, jamais du texte recopié — le code extrait le texte lui-même. Fidélité garantie par construction. La première version demandait une copie mot à mot vérifiée après coup : un tiers des citations étaient rejetées pour de simples retouches de surface. Le passage aux numéros de ligne a fait passer le taux de 12/72 à 72/72.
* Onglet Performance > Objections : filtre de période (7j/30j/3m/12m/tout/dates précises), liste des catégories avec volume + barre bien/partiellement/non traitée, et une page de détail par objection (qui l'a rencontrée, quand, verbatim des deux côtés, ce qu'il aurait fallu répondre).
* Onglet Performance > Analytics : Activité (durée, volumes, temps) lue directement depuis calls donc disponible sans backfill ; Interactions (ratio parole/écoute, monologue, réponse prospect, interactivité, patience, taux de questions) précalculées dans call_analytics par lib/call-analytics.ts.
* Playbook déplacé de /team vers /dashboard/playbook, en lecture seule pour les commerciaux (c'est la grille sur laquelle ils sont notés).
* Banc d'essai /settings/import-call : dépose un transcript et rejoue tout le pipeline. Recall ne sait PAS transcrire un fichier uploadé (vérifié dans leur doc le 29/07/2026) — d'où le choix transcript seul plutôt qu'un prestataire STT supplémentaire. Formats : .vtt, .srt, .json, et le texte horodaté « 00:45 Nom: … » des exports Google Meet / Zoom / Fathom.
* Calibrage /settings/calibrage (migration 008) : le directeur commercial annote de vrais calls dans l'app (transcript et liste côte à côte), valide, puis lance une mesure qui rejoue le pipeline et sort rappel / précision / bon rangement avec le détail des objections ratées, en trop et mal rangées. Une première version en fichiers JSON + script node a été abandonnée : la personne qui a l'expertise métier n'est pas celle qui ouvre un terminal.
* Décision d'architecture actée : le PROMPT porte la méthode (universelle : ce qu'est une objection), la CONFIGURATION CLIENT porte la spécificité (les catégories, par organisation). Il n'y a donc pas de « prompt parfait » à trouver pour le rattachement — il y a un mécanisme qui doit tenir sur n'importe quel jeu de catégories. Corollaire : ne JAMAIS mettre de contre-exemple spécifique à un client dans le prompt partagé, ça dégraderait tous les autres.

Fondations (sessions initiales)
* Setup Next.js + Supabase + NextAuth (Google + Microsoft OAuth)
* Génération de brief IA avec web search natif Claude
* Onboarding 4 étapes + profil commercial + références clients (avec embeddings Voyage AI)
* Intégration Pappers (légal FR) + Serper/NewsAPI (actualités)
* Refresh automatique tokens Google
Recall.AI + calls (sessions milieu)
* Cron Inngest sync calendriers Recall (toutes les 5 min)
* Webhook Recall bot avec signature Svix
* CSRF sur OAuth Recall (cookie recall_oauth_state)
* Envoi Gmail thread tracking, RFC 2822, encodage MIME
* Détection réponses prospects + réponse threadée avec IA
* Lecteur vidéo enregistrement
* Backoffice admin complet (dashboard, prompts éditables, test brief/analyse/email)
CRM lecture (sessions milieu)
* Pipedrive OAuth + import références + enrichissement briefs
* HubSpot OAuth + import références + enrichissement briefs
* Table crm_connections
Système de rôles + multi-tenant (session actuelle, début)
* Table organizations + colonne organization_id sur users
* Table manager_commercial_links many-to-many
* Rôles commercial / manager
* Page /team et /team/[commercialId] + calls readOnly manager
* Contraintes same-org obligatoires partout
Admin backoffice avancé (session actuelle)
* Création manuelle users depuis admin avec invitation Resend
* Soft delete (disabled_at) + hard delete + réactivation + middleware protection
* Impersonation admin avec log + bandeau rouge sticky + maxAge 4h
* Sections détail user avec RDV programmés + rendez-vous sans enregistrement
* Détection statuts bots Recall précis (bot_kicked_from_waiting_room etc.)
* Page admin/organizations (création, gestion membres, suppression)
Module Devis complet (session actuelle)
* Sous-étape A : paramètres entreprise + catalogue offres + upload logo Supabase Storage
* Sous-étape B : liste + création manuelle + éditeur temps réel + PDF react-pdf
* Sous-étape C : pré-remplissage IA depuis échanges
* Sous-étape D : envoi Gmail avec PDF joint + page publique signature simple + tracking statuts + toast + email Resend acceptation
* Refonte design PDF : bande violette en tête, pastille validité, layout pro
* Email d'envoi personnalisé par IA avec modale éditable
Module Tasks complet (session actuelle)
* Sous-étape A : templates configurables (6 par défaut, 3 catégories)
* Sous-étape B : génération auto via webhook Recall + crons Inngest (email sans réponse, devis sans acceptation)
* Sous-étape C : page /tasks avec urgences + pastille sidebar + toast
* Sous-étape D : modale IA rédaction email + envoi Gmail + auto-complétion task
* Fix bug génération : contrat JSON forcé côté serveur + max_tokens 1500 + extractJsonObject robuste
Module Playbook complet (session actuelle)
* Sous-étape A : schéma + interface manager + 4 dimensions par défaut
* Sous-étape B : intégration prompt analyse call + snapshot playbook + rétrocompat
* Sous-étape C : import IA d'un doc (PDF ou texte collé) avec extraction Claude
* Sous-étape D : affichage dynamique des scores dans /feedback et /team
Module Email Templates (session actuelle)
* Sous-étape A : templates par org (3 par défaut : Call 1/2/3), manager only
* Sous-étape B : dropdown "Type de call" dans les modales + génération avec prompt personnalisé
* Bonus : icône ⚙️ permet aux commerciaux de créer leur override personnel par template
* Fix contrat JSON forcé côté serveur (le manager écrit style/ton, le serveur garantit le format)
Transcript enrichi + analytics (session actuelle)
* Colonne transcript_json + speaker_names_override sur calls
* Bug latent trouvé et fix : transcriptToText cherchait segment.speaker alors que Recall utilise segment.participant.{id,name,email} (tous les transcripts historiques étaient "Unknown")
* buildTranscriptJson : groupement tours consécutifs même speaker
* resolveSpeakerNames : heuristique 4-branches
* Section transcript refondue : cartes par tour, recherche avec highlight, copier, édition inline des noms, horodatage mm:ss
* Bloc "🎧 Analyse de la conversation" au-dessus du transcript : barre segmentée temps de parole (avec segment "Silences"), cards (ratio commercial/prospect, questions, plus longue intervention, monologues, back-and-forth)
* Script scripts/backfill-single-call.ts : outil ponctuel pour backfill un call historique via Recall
Bloc "💡 Points clés" (session actuelle)
* Colonnes key_points + key_points_generated_at sur call_analysis
* Ancien bloc "Synthèse coaching" supprimé
* Prompt hardcodé demandant contexte + décisions + points validés + actions à impact + prochaines étapes (250-400 mots)
* Génération à la première ouverture, cache global (pas par user), persisté
* Rendu markdown avec react-markdown + remark-gfm (nécessaire pour les tableaux)
* Fix titre dupliqué : stripDuplicateTitle() côté serveur avec regex robuste testée sur 8 variantes
Landing + Login refonte + Design system app (session actuelle)
* Refonte complète direction Lovable : Inter Tight + Instrument Serif italic accent, fond lavande, boutons noirs rounded-full
* Contenu honnête : pas de fausses stats, pas de faux témoignages, "Accès sur invitation"
* Login SSO uniquement (Google + Microsoft), split 50/50
* CSS scopé via classe .brief-ui (ex-.marketing-page) + tokens --marketing-*
* Sidebar app : blanc + bordure droite, item actif fond lavande + barre violette 3px
* Contrastes adoucis (text-gray-900 au lieu de noir pur, bg-gray-900 au lieu de noir pur)
* Boutons compacts rounded-md h-8 dans l'app, pas les rounded-full de la landing
Refonte /settings avec sub-nav (session actuelle)
* 4 catégories : Général / Connexions / CRM / Notifications
* Sub-nav gauche avec icônes Lucide
* /settings redirige vers /settings/general
* Correction des 6 callbacks OAuth (redirect URLs mises à jour)
Distribution flexible (session actuelle, en cours)
Sous-étape A terminée — Préférences user


* Table notification_preferences + page /settings/notifications
* Toggles par événement (brief_precall, analyse_postcall) × canal (email, calendar, hubspot, pipedrive, slack)


Sous-étape B terminée — Email + Calendar


* Templates HTML Resend inspirés landing : sendBriefPreCallEmail, sendCallAnalysisEmail
* Calendar : appendBriefToCalendarEvent avec marqueur idempotent
* Scope Google élargi : calendar.readonly → calendar.events
* Détection écriture : hasCalendarWriteAccess via Google tokeninfo
* Bandeau UI "Reconnecter Google Calendar" quand scope pas encore accordé
* key_points généré aussi dans le webhook Recall (pour email d'analyse)


Sous-étape C1 terminée — HubSpot en écriture


* Chantier long avec debug scopes (les scopes crm.objects.notes.* et crm.objects.meetings.* n'existent pas)
* Détection écriture : hasHubSpotWriteAccess
* Bandeau UI "Reconnecter HubSpot"
* writeToHubSpotCascade : meeting body → deal (note) → contact (note)
* Idempotence via marqueur invisible <!-- brief-note-uid:{uid} -->
* Testé end-to-end : brief bien affiché dans hs_meeting_body


Sous-étape C2 terminée — Pipedrive en écriture


* Même logique que HubSpot C1, adaptée à l'API Pipedrive : hasPipedriveWriteAccess
* writeToPipedriveCascade : activity (note) → deal (note) → contact (note)
* findPipedriveActivityForEmail, findPipedriveDealForEmail, findPipedriveContactForEmail
* htmlBodyForPipedrive + appendToPipedriveActivityNote, createPipedriveNoteOnDeal, createPipedriveNoteOnContact
* Fix trouvé au passage : le dispatch de brief (sauvegarde + écriture CRM/calendar) était silencieusement droppé par Vercel dans certains cas (fix dédié)


Sous-étape D terminée — Slack (from scratch)


* Intégration complète construite de zéro, aucune existante avant
* OAuth Slack per-user (user_scope=chat:write, pas de scope bot workspace-wide)
* Réutilise crm_connections (provider='slack') plutôt qu'une table dédiée — api_domain détourné pour stocker le slackUserId
* Pas de refresh token : les tokens utilisateur xoxp- n'expirent pas côté Slack (pas de rotation activée), donc pas de wrapper retry-on-401 comme les CRM
* DM per-user uniquement (chat.postMessage avec channel = l'ID de l'utilisateur autorisé, pas de canal partagé)
* mrkdwnMessageForSlack : conversion markdown → mrkdwn Slack
* writeToSlackDM : point d'entrée pour le dispatcher, même rôle que writeToHubSpotCascade/writeToPipedriveCascade


Digest hebdomadaire terminé (module Distribution Flexible, sous-étape 3)


* Table digest_preferences (1 par user) : enabled + timing ('friday_evening' | 'monday_morning')
* Page /settings/notifications étendue avec le choix du timing
* 2 crons Inngest séparés, un par timing (TZ=Europe/Paris explicite dans le cron — contrairement aux autres crons du fichier qui n'ont pas besoin de wall-clock time) : sendFridayEveningDigests (vendredi 18h), sendMondayMorningDigests (lundi 8h)
* lib/digest.ts : orchestration au-dessus de lib/db.ts (queries) et lib/email.ts (rendu/envoi), même pattern que lib/notifications-dispatcher.ts au-dessus de lib/crm/*.ts
* Version commercial : calls/briefs/score de la semaine, insights calls, tasks en attente, devis en attente
* Version manager : mêmes stats agrégées sur toute l'équipe (via getCommercialsForManager)
* Narratif généré par IA (prompts éditables DEFAULT_DIGEST_COMMERCIAL_PROMPT / DEFAULT_DIGEST_MANAGER_PROMPT dans admin-config.ts)
* Aperçu à la demande : route /api/digest-preferences/send-preview
* lib/paris-week.ts extrait comme module pur (mostRecentParisMonday, bucketScoresByWeek) — dépendance-free, réutilisé ensuite par lib/dashboard.ts


Connexion Notion pour le playbook (module Team, sous-étape import)


* Token d'intégration interne Notion, pas OAuth — les intégrations publiques Notion nécessitent une review de sécurité par Notion avant de fonctionner, ce qui aurait rendu impossible un "connecte et utilise immédiatement" (confirmé contre developers.notion.com/docs/authorization)
* Connexion par ORGANISATION (table dédiée playbook_notion_connections), pas par user comme crm_connections, puisque le playbook est un par organisation
* Flow : onglet "Depuis Notion" dans ImportPlaybookModal → recherche auto des pages partagées avec l'intégration (searchNotionPages) → confirmation "Est-ce bien cette page : [titre] ?" → extraction (getNotionPageText + extractPlaybookDimensions, la même fonction d'extraction Claude que les flows coller/fichier, exportée depuis /api/playbook/import pour être réutilisée par /api/playbook/notion/import)
* Import playbook aussi étendu au format Word (.doc/.docx via mammoth, même pattern que lib/inngest-functions.ts) — le PDF était déjà supporté côté backend (extractTextFromPdf) mais restait caché derrière un texte "arrive prochainement" dans la modale


Nouveau /dashboard (page d'accueil réelle post-connexion)


* L'ancien outil de génération de brief occupait /dashboard, qui est aussi la page d'atterrissage post-connexion — déplacé vers /brief (symétrique avec /brief/[id]) pour libérer /dashboard pour un vrai tableau de bord. Tous les liens de connexion/onboarding/retour mis à jour en conséquence
* Deux vues selon le rôle, entièrement basées sur des données réelles (aucune stat inventée), réutilisant au maximum les fonctions déjà construites pour le digest hebdo (mêmes plages "cette semaine", mêmes seuils de couleur vert/orange/rouge)
* Commercial : calls/briefs/score/devis cette semaine, tendance de score sur 6 semaines, calls récents, tâches en attente, état des connexions (HubSpot/Pipedrive/Slack/Digest)
* Manager : mêmes indicateurs agrégés équipe, table de l'équipe avec statut "Actif"/"À suivre", scores moyens par dimension, dernière activité par commercial
* Animé avec `motion` (nouvelle dépendance) : chiffres qui comptent au chargement, entrées échelonnées, barres qui poussent, hover
* Bug trouvé et corrigé au passage : lib/dashboard.ts importait une fonction de lib/digest.ts, qui charge le SDK Anthropic — aurait fait fuiter le SDK (et potentiellement la clé API) dans le bundle client vu que ces stats sont consommées par des composants client animés. Extrait dans lib/paris-week.ts (dépendance-free) ce qui pouvait l'être


Refonte /feedback (session actuelle)


* Refonte UX /feedback/[id] : layout deux colonnes, vidéo/transcript synchronisés
* Liste /feedback passée en table triable + recherche, inspirée de Claap


Landing + login mis à jour (session actuelle)


* Contenu à jour avec les features construites cette session : Distribution automatique, Digest hebdomadaire par IA, Playbook coaching sur-mesure (3 nouvelles cartes features)
* Carte Analyse enrichie mise à jour (relecture vidéo synchronisée au transcript)
* Intégrations : ajout Slack + Notion à la liste
* Étape "Après le RDV" : mentionne la distribution CRM/Slack
* Login : accroche du panneau droit mise à jour ("distribue" ajouté)


Sync bidirectionnel tasks Brief ↔ HubSpot (session du 18 juillet 2026)


* Brief → HubSpot : chaque template de task a un toggle push_to_hubspot. Une task générée par ce template crée aussi une task HubSpot (lib/tasks-hubspot-sync.ts : pushNewTasksToHubSpot)
* Complétion/suppression synchronisée dans les deux sens : compléter/supprimer côté Brief répercute côté HubSpot (best-effort dans app/api/tasks/[taskId]/complete|dismiss/route.ts) ; côté HubSpot, le cron syncHubSpotTaskStatuses (30 min, lib/inngest-functions.ts) réconcilie le statut via batchGetHubSpotTaskStatuses
* HubSpot → Brief (import inverse) : une task créée nativement dans HubSpot (assignée à l'owner correspondant à l'utilisateur Brief) est importée automatiquement. Toggle par user (users.import_hubspot_tasks, UI sur /tasks/settings). Le même cron 30 min résout l'owner (getHubSpotOwnerId : token-info email → Owners API) et cherche les nouvelles tasks (findNewHubSpotTasksForOwner) sur une fenêtre de 35 min (léger overlap avec le cron précédent pour ne rater aucune task)
* Nouveau scope OAuth requis : crm.objects.owners.read — déployé via `cd Brief && hs project upload`
* Idempotence des tasks importées (template_id NULL, donc la contrainte UNIQUE existante ne les protège pas entre elles) : check-then-insert applicatif dans createTaskFromHubSpot plutôt qu'une contrainte DB
* TASK_TO_CONTACT_ASSOCIATION_TYPE_ID = 204 : valeur documentée HubSpot, pas vérifiée en live (pas de credentials HubSpot réels disponibles en sandbox de dev)


Playbook : fix import PDF + drag-and-drop (session du 18 juillet 2026)


* Bug trouvé : pdf-parse était passé en v2 (breaking change), qui remplace l'export fonction callable de la v1 (pdfParse(buffer)) par une classe (new PDFParse({ data: buffer }).getText()). Tout upload PDF plantait silencieusement avec "pdfParse is not a function" depuis la mise à jour du package. Corrigé dans app/api/playbook/import/route.ts et lib/inngest-functions.ts
* Glisser-déposer ajouté sur la zone d'import fichier de ImportPlaybookModal (feedback visuel au survol, validation du type au drop)


Refonte design admin + menus horizontaux (session du 18 juillet 2026)


* Nouveau design system sur toute la partie /admin, cohérent avec le reste de l'app (hero headers avec blur blobs, StatTile animés, cartes rounded-2xl, sidebar élargie avec icônes lucide)
* Nettoyage : suppression d'AdminClient.tsx + LoginForm.tsx (code mort, jamais importés) ; Spinner + formulaire de login dupliqués dans 6 fichiers consolidés dans AdminShell.tsx ; les 5 pages qui géraient leur propre vérification d'auth côté client passent maintenant par isAdminAuthenticated() côté serveur (uniforme avec le reste)
* Menus horizontaux là où plusieurs sections étaient empilées : /admin/prompts (10 prompts → onglets) et /admin/organizations/[orgId] (4 blocs → 3 onglets)


Facturation Stripe complète (session du 18 juillet 2026, 3 phases)


* Facturation par ORGANISATION (pas par user) : un manager souscrit pour son équipe entière, cohérent avec le modèle manager/commerciaux existant
* Deux composantes : abonnement récurrent par siège (quantité = users actifs non désactivés de l'org, synchronisée vers Stripe en best-effort à chaque mutation de composition) + usage passé au client à 0,50€/h d'enregistrement (refacturation directe du coût Recall.AI, pas une marge produit)
* Décision technique importante : usage facturé via Invoice Items standard (stripe.invoiceItems.create), PAS via l'API Billing Meters ni Metronome — Stripe pousse désormais tout nouveau usage-based billing vers Metronome (plateforme tierce rachetée par Stripe), disproportionné pour une seule métrique simple à calculer soi-même
* Essai gratuit 7 jours, carte bancaire collectée dès l'inscription (Checkout Session avec payment_method_collection: 'always' + subscription_data.trial_period_days: 7)
* Dégradation douce sur échec de paiement : bannière d'alerte site-wide immédiate (BillingGraceBanner, countdown en heures) + fenêtre de grâce de 48h avant blocage total. Blocage effectif au niveau middleware (même pattern que le check disabled_at existant, requête REST unique avec organizations embarqué via la FK), redirige vers /compte-suspendu, /settings/billing explicitement exclu pour que le manager puisse toujours régulariser
* Webhook idempotent via table billing_events (stripe_event_id UNIQUE + upsert ignoreDuplicates) — un événement Stripe n'a pas toujours de ligne métier naturelle sur laquelle upserter, contrairement aux webhooks Recall
* Découverte technique vérifiée contre le SDK Stripe installé (pas supposée) : current_period_start/end ont été déplacés de l'objet Subscription vers SubscriptionItem dans une version récente de l'API Stripe
* Deux crons Inngest, même logique de séparation que les deux crons du digest hebdo (un par fréquence) : reportBillingUsage (1er du mois — facture l'usage depuis last_usage_reported_at ou current_period_start pour le tout premier report, jamais depuis le début de l'historique) et checkBillingGracePeriods (horaire — bascule en blocked les grâces expirées)
* Onglet "Facturation" ajouté au détail organisation admin (4e onglet), et route /api/settings/billing/status accessible à tout user (pas manager-only) pour que la bannière de grâce soit visible par toute l'organisation


Facturation Stripe : 4 compléments (session du 19 juillet 2026)


* Résiliation = accès bloqué : billing_status='canceled' (déclenché par customer.subscription.deleted) était auparavant ignoré par le middleware (seul 'blocked' l'était), laissant un accès complet et illimité après résiliation volontaire. Corrigé pour bloquer sur 'blocked' OU 'canceled', même comportement, même page /compte-suspendu
* Stripe Tax activé : automatic_tax + tax_id_collection (autoliquidation TVA intracommunautaire B2B) sur la Checkout Session. Configuration manuelle côté dashboard Stripe : adresse entreprise, enregistrement TVA France (auto-immatriculation choisie plutôt que le partenaire payant Taxually), tax code produit, tax_behavior='exclusive' sur les deux prix (HT + TVA ajoutée, pas TTC)
* Override support admin : route /api/admin/organizations/[orgId]/billing (PATCH unblock|extend_grace), boutons dans l'onglet Facturation de OrganizationDetailClient.tsx, pour les cas de paiement par virement ou litige — n'agit jamais sur le véritable abonnement Stripe
* Plan annuel avec remise : 2e Price Stripe (490€/an, ≈2 mois offerts vs 12×49€) pour inciter à l'engagement long. Colonne billing_interval sur organizations, toggle Mensuel/Annuel sur /settings/billing (IntervalToggle), coût mensuel équivalent toujours affiché pour rester lisible entre les deux cas


Validation end-to-end en conditions réelles (session du 19 juillet 2026)


* Testé sur le vrai compte Oliverlist en mode Test Stripe (pas de sandbox) : Checkout complet (3 sièges, TVA calculée), essai actif, résiliation immédiate, réabonnement, blocage d'accès — chaque étape vérifiée par screenshot
* 3 bugs réels trouvés et corrigés uniquement grâce à ce test live (non détectés par la revue de code ni le typecheck) — voir bugs #46, #47, #48 ci-dessous
* Méthode de debug : reproduction directe contre l'API Stripe réelle (scripts Node ponctuels avec les vraies credentials test) pour confirmer la cause puis vérifier le fix, sans attendre de redeploy Vercel à chaque itération


Protections IA uniformisées (session du 19 juillet 2026)


* Constat : les 3 protections (max_tokens ≥1500, extractJsonObject robuste, log réponse brute sur échec parsing) n'existaient que sur app/api/tasks/[taskId]/generate-email/route.ts, la route où le bug avait été trouvé à l'origine — jamais propagées ailleurs
* Nouveau lib/ai-json.ts : extractJsonObject(raw) extrait, sans dépendance à un fichier consommateur, remplace 3 implémentations locales quasi identiques (tasks/generate-email, lib/brief-generator.ts, lib/inngest-functions.ts) qui avaient légèrement divergé dans le temps
* max_tokens relevé à 1500 sur app/api/quotes/[quoteId]/generate-email/route.ts (était à 1000, seule route sous le seuil)
* extractJsonObject appliqué aux JSON.parse nus restants : lib/brief-generator.ts, lib/call-analysis.ts, lib/email-followup.ts (generateFollowUpEmail), app/api/quotes/generate, app/api/quotes/[quoteId]/generate-email, app/api/playbook/import
* Log de la réponse brute ajouté sur les catch qui ne le faisaient pas encore (lib/call-analysis.ts, app/api/playbook/import, les deux routes quotes, lib/inngest-functions.ts)
* Volontairement laissés hors périmètre : lib/digest.ts et lib/key-points.ts (sortie markdown, pas de contrat JSON à casser) ; les deux appels à max_tokens 1000 dans lib/email-followup.ts (generateReplyToProspect / generateReplyToProspectWithTemplate — texte libre, une troncature raccourcit la réponse mais ne casse pas de parsing)


Bibliothèque d'objections & win/loss (session du 19 juillet 2026, 5 phases)


* Point de départ : call_analysis.objections (jsonb) existait déjà en base mais était mort — saveCallAnalysis l'écrivait toujours à [], et le type CallAnalysis (sortie Claude) n'avait même pas ce champ. Le bloc "Objections rencontrées" de FeedbackDetailClient.tsx existait déjà côté UI et attendait cette donnée sans jamais la recevoir
* Phase 1 — extraction + persistance : prompt étendu ({objection, response}[], la réponse effectivement apportée par le commercial dans le transcript, pas inventée), champ ajouté au type CallAnalysis, saveCallAnalysis persiste enfin la vraie valeur
* Phase 2 — indexation + backfill : table call_objections (par organisation, comme le playbook — un commercial junior bénéficie des objections déjà traitées par toute l'équipe), embeddings Voyage AI via supabaseAdmin (pas le client anon utilisé par lib/embeddings.ts historiquement — écart non reproduit), script scripts/backfill-objections.ts pour l'historique existant
* Phase 3 — recherche par similarité : app/api/objections/similar (POST, à la demande, pas préchargé), bloc "Cas similaires déjà traités" dans /feedback/[id]
* Phase 4 — signal win/loss unifié : table deal_outcomes, contact_email comme clé de jointure (aucun id CRM stocké côté Brief nulle part). Source quote écrite en synchrone au moment de l'acceptation/refus du devis (aucun cron requis, signal déjà fiable et persisté) ; sources hubspot/pipedrive via le nouveau cron syncDealOutcomes (30 min) qui n'interroge que les contacts non encore résolus pour cette source — pas tout l'historique à chaque run. findClosedDealsForEmail (lib/crm/hubspot.ts, lib/crm/pipedrive.ts) est l'inverse de findHubSpotDealForEmail/findPipedriveDealForEmail : celles-ci filtrent les deals fermés, celle-là ne garde qu'eux
* Phase 5 — écran manager : nouvelle page /team/insights (getObjectionStatsForOrganization, getDimensionScoresByOutcome — même pattern d'agrégation JS que getTeamAverageScores, les clés de dimension étant dynamiques par org/playbook donc pas agrégeables proprement en SQL), scopée à toute l'organisation (getUsersInOrganization) et non aux seuls commerciaux liés à un manager
* Validé en conditions réelles sur le compte Oliverlist : credentials Supabase/Voyage/Anthropic réels ajoutés à .env.local (gitignored), backfill exécuté sur les 9 calls existants, RPC match_call_objections vérifiée, getObjectionStatsForOrganization/getDimensionScoresByOutcome exécutées contre la vraie base et le vrai playbook (7 dimensions). 1 bug de données legacy trouvé et corrigé au passage — voir bug #50


Refonte visuelle complète direction Lovable + version mobile (session du 20 juillet 2026)


* Reproduction dans le vrai code du redesign fait sur Lovable (export React/Vite statique dans ~/Downloads/Brief Visual Studio, non committé) : nouveau système de tokens oklch avec le bleu #2A5CE0 comme couleur de marque. Les tokens gardent leurs noms historiques (--violet = désormais le bleu de marque, --lavender, --lavender-strong, border-border, ombres via les variables --shadow-xs/sm/md/glow, classe brand-gradient pour les boutons primaires + hover:brightness-110) — une seule source de vérité dans app/globals.css, les anciens noms --marketing-* aliasés dessus
* Primitives partagées créées (le repo n'avait AUCUN composant UI partagé avant) : app/components/ui/ui-bits.tsx (Button, Card, ScoreChip, SentimentChip, StatCard, StatusChip, Eyebrow) + PageHeader.tsx + TopBar.tsx (breadcrumb via dict LABELS, recherche désactivée volontairement, cloche → /notifications, avatar → /settings) insérée dans les 10 layouts
* Refonte complète : landing (structure ~1478 lignes du mockup, témoignage/stats gardés tels quels sur décision explicite, cas clients anonymisés "SaaS RH"/"Fintech B2B"), liste /feedback (KPI strip + onglets filtres + cartes groupées par date), dashboard (graphe SVG 6 semaines reconstruit, carte "Essai actif" + nom d'org dans la sidebar via /api/sidebar/org-status)
* Fix au passage : le scoping fonts .brief-ui n'avait JAMAIS fonctionné (la CSS définissait .marketing-page mais le code utilisait className="brief-ui") — Inter Tight/Instrument Serif ne s'affichaient nulle part
* Version mobile responsive : sidebar en drawer auto-contenu (useState + translate-x + auto-close sur changement de pathname, hamburger fixed lg:hidden), layouts passés en ml-0 lg:ml-60 — vérifiée sur ~7 pages
* Bug "William" trouvé et corrigé (voir bug #51) : un call analysé sans points forts/axes d'amélioration


Audit complet + 6 correctifs + fin de migration visuelle (session du 21 juillet 2026)


* Audit systématique du repo (sécurité routes, parsing IA, idempotence, design, mobile) — verdict : multi-tenant/idempotence/webhooks sains, 3 bugs latents corrigés + 3 durcissements
* after() généralisé (bug #52) : tasks/complete, tasks/dismiss, public/quotes/[token] — dernières promesses post-réponse encore tuables par Vercel
* /notifications ajouté au matcher middleware (bug #53)
* Refresh du rôle JWT (bug #54) : callback jwt relit le rôle en base toutes les 10 min max (roleRefreshedAt) — le menu Équipe apparaît sans re-login après promotion manager
* Validation runtime de l'analyse IA : validateCallAnalysisShape (lib/call-analysis.ts) — un prompt admin_config périmé throw désormais (réponse brute loggée, fallback "Analyse indisponible" visible) au lieu de persister des null silencieux. À répliquer sur les autres prompts JSON éditables
* requireActiveUser ajouté sur /api/recall/google-oauth/start (aligné sur le jumeau Microsoft)
* Rate limiting étendu : lib/rate-limit.ts refactoré en fabrique — checkRateLimit (briefs, quotas historiques) + checkAiGenerationRateLimit (60/h IP, 200/j user, buckets séparés) branché sur les 9 autres routes de génération IA (quotes/generate, generate-email ×2, reply-suggestion, playbook/import ×2, key-points, objections/similar, digest send-preview). Toute nouvelle route de génération IA doit le brancher
* Fin de migration visuelle : les 25 fichiers non-admin encore sur l'ancien style indigo (onboarding, ImportPlaybookModal, références clients, TaskTemplatesClient, TaskEmailModal, SendQuoteModal, TemplatePromptSettingsModal, InviteCommercialModal, ManageTeamModal, help, compte-suspendu, page publique devis q/[token], + résidus dans 13 fichiers migrés) passés aux tokens — zéro classe indigo-* hors /admin (qui garde volontairement son design dédié). TeamRosterTable enveloppée en overflow-x-auto (débordait sur mobile)
* Vérifié : tsc + next build OK, rendu contrôlé navigateur (aide, onboarding, références, paramètres tasks)


________________


Bugs documentés (numérotation continue depuis session 1)
1-16. Session initiale (setup + brief + Recall + OAuth).


17. Svix headers format webhook-* : Recall envoie webhook-id/timestamp/signature, pas svix-*. Fallback dans les routes.


18. Double https:// Pipedrive : api_domain contient déjà https://.


19. Pipedrive 403 sur searchCompany : scope "Search all data" à activer dans developer dashboard.


20. supabaseKey is required côté client : imports dynamiques dans admin-config.ts pour éviter le bundle client.


21. Doublons briefs : saveBrief en UPSERT + contrainte unique.


22. Scope gmail.send manquant : ajouté dans lib/auth.ts, users existants doivent se reconnecter.


23. reply_message_id absent : erreur explicite si send-reply appelé sans ce champ.


24. libelle_naf vs libelle_code_naf : bon champ Pappers = libelle_code_naf.


25. JSON tronqué avec web_search : utiliser .filter(b => b.type === "text").pop() (pas .find()).


26. PostgREST retour objet vs tableau selon contrainte UNIQUE : après ajout d'une contrainte UNIQUE sur call_analysis.call_id, PostgREST infère 1:1 et retourne un objet, pas un tableau. Helper normalizeCallAnalysis() gère les 2 formes.


27. useState(initialData) figé : React ne re-lit pas la prop au re-render. Pattern "Adjusting state during render" pour resync (utilisé sur PlaybookClient après import).


28. max_tokens trop serré (800) sur génération JSON complexe : passer à 1500. Avec logs bruts en erreur pour debug futur.


29. extractJsonObject robuste : préambule/postambule Claude peut casser JSON.parse. Regex sur {...} + sanitizer chars de contrôle.


30. Contrat de sortie JSON dans le prompt : à FORCER côté serveur, jamais laisser à la charge du manager qui édite un template.


31. Structure Recall transcript : segment.participant.{id,name,email}, pas segment.speaker. Bug latent qui affichait "Unknown" partout.


32. Calls dupliqués sur retry webhook Recall : contrainte UNIQUE sur recall_bot_id + upsert.


33. Google Calendar scope readonly vs events : demander calendar.events pour écriture, users existants doivent reconsentir via signIn("google").


34. HubSpot pas de scopes séparés notes/meetings : c'est géré via contacts.write + deals.write.


35. HubSpot hs project upload échoue si hsproject.json absent : commande à lancer depuis Brief/, pas racine.


36. HubSpot pas d'association note↔meeting : écrire dans hs_meeting_body directement.


37. Bug workflow Claude Code : peut modifier des fichiers sans les commiter. Vérifier git status avant chaque git push — les commits "Fix X" peuvent contenir 0 modification effective.


38. Recall descarte les timestamps dans transcriptToText (garde juste le texte). Pour les analytics conversation, il faut passer par transcript_json.


39. Fuite bundle client via import transitif : lib/dashboard.ts (consommé par des composants client animés) importait une fonction de lib/digest.ts, qui charge le SDK Anthropic — aurait fait fuiter le SDK (et potentiellement la clé API) dans le bundle client. Fix : lib/dashboard.ts reste dépendance-free (pas de lib/digest.ts, pas de lib/db.ts), la logique de bucketing par semaine partagée vit dans lib/paris-week.ts sans dépendance.


40. Brief dispatch silencieusement droppé par Vercel : la sauvegarde + écriture CRM/calendar du dispatch de brief pouvait échouer silencieusement dans certains cas sur Vercel. Fix dédié (commit 7050edb).


41. Notion : les intégrations publiques/OAuth nécessitent une review de sécurité Notion avant de fonctionner pour de vrais utilisateurs — bloquant pour un "connecte et utilise immédiatement". Solution : token d'intégration interne, pas OAuth (confirmé contre developers.notion.com/docs/authorization).


42. pdf-parse v2 breaking change : export fonction callable (v1, pdfParse(buffer)) remplacé par une classe (v2, new PDFParse({ data: buffer }).getText()). Tout upload PDF plantait silencieusement. Fix dans les deux consommateurs (app/api/playbook/import/route.ts, lib/inngest-functions.ts).


43. Migration SQL pas exécutée en prod → page entière plantée : une nouvelle colonne (users.import_hubspot_tasks) lue dans un Promise.all d'une page serveur fait planter toute la page si la migration n'a pas encore été passée sur Supabase prod (le workflow de ce projet donne la SQL à exécuter manuellement, pas de migrations committées). Pattern : wrapper en .catch() avec fallback les requêtes sur des colonnes récemment ajoutées, le temps que la migration soit confirmée passée.


44. Stripe API : current_period_start/end déplacés de Subscription vers SubscriptionItem dans une version récente de l'API — vérifié contre le SDK installé (types TypeScript du package) avant d'écrire le webhook, pas supposé depuis la mémoire/doc générale. Un seul subscription item par abonnement dans ce modèle (le siège), donc items.data[0] suffit pour les récupérer.


45. Stripe usage-based billing : Billing Meters (l'ancienne API dédiée à l'usage) n'est pas dépréciée mais n'est plus recommandée pour les nouvelles intégrations — Stripe pousse vers Metronome (plateforme tierce rachetée). Pour une métrique unique et simple (0,50€/h), plus pragmatique de calculer le total soi-même et de pousser un Invoice Item standard (API stable, non concernée par ce virage) plutôt que d'intégrer Metronome ou la mécanique de Meter/meter events.


46. Stripe invoice.payment_succeeded écrasait 'trialing' : Stripe émet cet événement aussi pour la facture à 0€ générée au démarrage d'un essai (rien à payer). Le handler mettait billing_status à 'active' sans condition, court-circuitant 'trialing' dès le jour 1 — découvert en testant un vrai Checkout (l'état Stripe était correct, seul l'état Brief était faux). Fix : n'agir que si billing_status === 'grace_period' (le seul vrai cas d'usage de ce handler — sortie de grâce après paiement qui finit par passer).


47. Webhook Stripe : customer.subscription.created non coché côté dashboard : le code gérait déjà ce cas dans son switch, mais Stripe ne l'envoyait jamais car l'endpoint n'était souscrit qu'à 5 événements sur 6 nécessaires. Résultat : current_period_start/end et billing_interval jamais renseignés côté Brief même une fois le bug #46 corrigé. Pas un bug de code — vérifier la liste des événements cochés sur le webhook Dashboard à chaque nouveau case ajouté au switch.


48. Réabonnement Stripe après résiliation échouait : checkout.sessions.create avec un customer existant + tax_id_collection activé exige customer_update: { name: 'auto' }, sinon Stripe refuse ("Tax ID collection requires updating business name on the customer"). Invisible au premier abonnement (customer_email, pas de customer existant) — repéré en testant un vrai réabonnement après résiliation. Reproduit et vérifié directement contre l'API Stripe réelle avant et après le fix (lib/stripe.ts, createOrganizationCheckoutSession).


49. Protections IA (max_tokens/extractJsonObject/log réponse brute) présentes sur une seule route : la robustesse JSON introduite pour corriger un bug ponctuel sur app/api/tasks/[taskId]/generate-email/route.ts n'avait jamais été propagée aux 6 autres routes de génération JSON, qui gardaient un JSON.parse nu (aucune tolérance au préambule/postambule ni aux caractères de contrôle bruts) et, pour une, un max_tokens à 1000. Fix : lib/ai-json.ts partagé, appliqué partout, cf "Protections IA uniformisées" ci-dessus. Pattern à surveiller : toute nouvelle route de génération JSON doit démarrer avec ces 3 protections dès l'écriture, pas les rattraper après un incident.


50. Format legacy sur call_analysis.objections : le call de référence Ravachol avait déjà un objections non vide, mais en string[] brut — vestige d'une version antérieure et non documentée du prompt, d'avant que la colonne soit mise à toujours écrire []. Repéré uniquement en lançant le backfill contre la vraie base (aucune trace de ce format dans le code ni la doc à ce moment-là). Fix centralisé dans normalizeCallAnalysis (lib/db.ts), le seul chokepoint par lequel passent toutes les lectures de call_analysis — coerce les strings brutes en {objection, response} avec un texte de réponse placeholder, plutôt que de patcher chacun des call sites qui lisent .objections (au moins 3 : getCallWithAnalysis, getCallContextForContact, getDigestCallInsights).


51. Prompt admin_config périmé → analyse aux champs null silencieux (bug "William", 20 juillet 2026) : call_analysis_system_prompt édité en base le 9 juillet ne correspondait plus au contrat JSON attendu par le code (architecture dimensions dynamiques arrivée après) — JSON.parse(...) as CallAnalysis laissait passer, strengths/weaknesses/scores arrivaient null en base sans aucune erreur nulle part. Découvert parce qu'un call réel (Hubert × william.bouzemarene@best-energy-control.fr) n'affichait ni points forts ni axes d'amélioration. Fix : reset du prompt au défaut (setPromptConfig) + ré-analyse du call + validateCallAnalysisShape en validation runtime (session du 21). Un seul call affecté (vérifié par requête scores IS NULL). Leçon : un prompt éditable en admin est un contrat d'API non typé — le code doit valider la forme à l'exécution.


52. Fire-and-forget tué par Vercel — récidive du bug #40 : le fix after() n'avait été appliqué qu'à generate-brief. Trois autres routes lançaient encore des promesses .catch() nues après la réponse : tasks/complete (sync statut HubSpot), tasks/dismiss (suppression task HubSpot), public/quotes/[token] (markQuoteAsViewed). Corrigées le 21 juillet. Règle : TOUT effet de bord post-réponse passe par after() de next/server, sans exception.


53. /notifications absent du matcher middleware : la page vérifiait la session elle-même (getEffectiveUserId + redirect) mais le middleware est le SEUL endroit qui applique le check disabled_at + blocage facturation — un user désactivé ou une org bloquée/résiliée accédait encore à /notifications. À chaque nouvelle page top-level, ajouter la route au matcher de middleware.ts.


54. token.role figé jusqu'à re-login : le callback jwt ne posait le rôle qu'à la connexion (branche if (account)) — un commercial promu manager ne voyait pas le menu "Équipe" (AppSidebar lit session.role) avant de se déconnecter/reconnecter. Fix : refresh du rôle depuis la base toutes les 10 min max (roleRefreshedAt dans le JWT, types/next-auth.d.ts). Les routes API sensibles relisaient déjà le rôle en base à chaque appel — à conserver, le JWT peut avoir jusqu'à 10 min de retard.


________________


Décisions produit explicites
* Web search natif Claude API (web_search_20250305, max_uses: 3) — activé pour tous les briefs
* Cron Recall : toutes les 5 minutes
* Cache brief : UPSERT (pas INSERT)
* Réponses prospects : stockées en base pour éviter appels Gmail répétés
* Prompts éditables depuis le backoffice sans déploiement (admin_config table key/value)
* Vision distribution in-context : Brief livre ses outputs dans les outils clients (CRM, agenda, email)
* HubSpot en lecture + écriture (contacts.write + deals.write) ; Pipedrive en lecture + écriture (cascade activity/deal/contact) ; Slack en écriture (DM per-user)
* Brief est invitation only (pas d'inscription libre)
* Signature devis : simple (tracking + clic accepter/refuser), pas de signature qualifiée pour l'instant
* Emails de brief/analyse envoyés via Resend depuis jean@lartisangroupe.com, pas Gmail du commercial
* Playbook : 1 par organisation, éditable manager only, dimensions dynamiques dans l'analyse call
* Tasks : cron toutes les 30 min pour email/quote sans réponse (pas 5 min, pas urgent)
* Impersonation admin : maxAge cookie 4h + log toutes les actions, bandeau rouge visible partout


________________


Workflow de développement habituel
1. J'ouvre Claude Code dans mon terminal : cd brief-precall puis claude
   * Si HubSpot config à uploader : cd brief-precall/Brief puis hs project upload
2. Je te demande la prochaine étape
3. Tu me donnes UNE instruction précise à coller dans Claude Code (souvent en 2 parties : SQL Supabase + code)
4. Je colle, Claude Code exécute, résume
5. Je te renvoie le résumé
6. Tu me donnes la commande git : git add . && git commit -m "..." && git push
   * Attention : si Claude Code est dans le sous-dossier Brief/, cd .. d'abord
   * Toujours faire git status avant push pour vérifier que les vrais fichiers sont bien inclus
7. Je teste en prod sur brief-ai.fr (screenshots)
8. Je te renvoie le screenshot ou dis "OK"
9. On enchaine ou on ajuste
55. call_objections empilait les objections à chaque ré-analyse : indexCallObjections faisait un insert nu, sans idempotence. Trois calls d'Oliverlist ré-analysés 5 à 7 fois en juillet avaient produit 72 lignes pour 13 objections réelles, et la même objection s'affichait huit fois dans le détail d'une catégorie. Bug latent depuis juillet, rendu visible seulement par la nouvelle page de détail. Pas de contrainte UNIQUE possible (le texte de l'objection est reformulé à chaque extraction, il ne peut pas servir de clé) : on relève les ids existants du call, on insère la nouvelle version, PUIS on supprime les anciens — dans cet ordre, pour qu'un insert en échec laisse l'ancienne version plutôt qu'un call sans rien. Règle : « UPSERT + contrainte UNIQUE » de la doc vaut aussi quand la clé naturelle n'existe pas, il faut alors un remplacement explicite par parent.

56. L'extraction confondait objection et question : « vos équipes sont basées où ? » remontait comme objection, et la moitié des lignes n'en étaient pas. Fix : constante OBJECTION_DEFINITION (lib/admin-config.ts) injectée dans les DEUX chemins d'extraction — le prompt d'analyse éditable en admin ET extractObjectionsFromTranscript codé en dur — pour qu'ils ne divergent pas. Règle centrale : une objection doit pouvoir se reformuler en « oui mais… ». Effet mesuré : 30 → 11 objections, toutes réelles.

57. Un prompt admin_config édité en base prime silencieusement sur le défaut du code : modifier DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT n'avait AUCUN effet sur Oliverlist, dont la ligne admin_config contenait une version personnalisée. Toute évolution d'un prompt par défaut doit être répercutée dans la ligne en base — en vérifiant d'abord si elle est une copie conforme de l'ancien défaut (remplacement complet) ou une vraie personnalisation (n'insérer que le bloc concerné). Cousin du bug #51 (« William »), mais dans l'autre sens : là c'était le prompt en base qui était périmé, ici c'est le fix du code qui n'atteignait pas la base.

58. Une réponse JSON tronquée fait perdre TOUT le lot, pas seulement le surplus : deux calls portant 34 et 26 objections dépassaient max_tokens, le JSON arrivait coupé et la classification de toutes les objections du call était perdue d'un coup (60 sur 72). Fix à trois niveaux : découpage en lots de 10, sortie raccourcie (numéros de ligne au lieu de citations recopiées), et reprise sur échec de parsing — un nouvel essai (l'échec observé était un « } » surnuméraire au milieu d'un JSON par ailleurs valide, dérapage intermittent), puis découpage du lot en deux. Après correction : 0 échec sur les 5 calls.

59. Barre d'onglets non collante = navigation perdue : la TopBar était sticky, pas PerformanceTabs. Sur une page à peine plus haute que l'écran (Objections), quelques pixels de défilement suffisaient à faire glisser les onglets sous la TopBar sans aucun moyen de revenir. Corrigé sur PerformanceTabs et TeamTabs (sticky top-14, sous la TopBar de 56px de haut).


________________


Roadmap restante (au 20 août 2026)

Fait les 19-20 août — chantier « domaine + vérification Google » :
* brief-ai.fr acheté chez OVH, branché sur Vercel, en production. brief-precall.vercel.app reste un alias actif et doit le rester indéfiniment (le webhook Recall est figé à la création de chaque agenda).
* L'origine publique centralisée dans lib/app-url.ts — elle était recopiée en dur dans 21 fichiers. Toute URL absolue vers Brief passe désormais par ce module.
* Huit intégrations redéclarées sur le nouveau domaine (2 apps Google, Azure, Slack, HubSpot, Stripe, Recall, Inngest). Pipedrive reste à faire, essai expiré.
* gmail.metadata retiré : Brief ne lit plus rien dans Gmail, il ne fait qu'envoyer. Supprimés avec le scope : la détection des réponses de prospect et les agrégats de taux de réponse, qui seraient restés figés à 0 %.
* Politique de confidentialité réécrite pour décrire l'accès réel, robots.txt et sitemap.xml ajoutés, données structurées (og:site_name, JSON-LD) déclarant le nom de l'application.
* Vérification Google soumise le 20/08 avec vidéo de démonstration (https://youtu.be/YQEbVl19VN0). Surtout : le projet est passé en Publishing status « In production », ce qui met fin à l'expiration des refresh tokens tous les 7 jours — la panne qui arrêtait l'ingestion pour tout le monde.
* Deux bugs de production trouvés au passage : 404 sur tous les boutons « Préparer le brief » (garde isUuid posé sur une route qui reçoit un id d'événement Google Calendar), et un écran Connexions qui promettait une lecture de messagerie que l'app ne demande plus.
* Jeton GitHub en clair dans .git/config révoqué, remote nettoyé, credential helper osxkeychain.

Priorité immédiate :
1. Stripe en mode Live — et trancher le pricing usage AVANT la bascule. C'est le premier déblocant business maintenant que Google est levé.
2. Faire reconnecter Google une fois à chaque utilisateur (Jean, Hubert, l'associé) : le passage en production n'émet pas de nouveau jeton tout seul.
3. Basculer le domaine émetteur des emails de lartisangroupe.com vers brief-ai.fr (fusionner l'include Resend dans le SPF OVH existant, jamais un second v=spf1).
4. Répondre au fil Trust and Safety quand il arrive (contact développeur : jeandereviersde@gmail.com) — un grief de branding reste ouvert sur le nom de l'application.

EN STANDBY, décision de Jean du 20 août 2026 : le chantier objections. Ce n'est pas la priorité. Le socle livré fin juillet fonctionne ; c'est l'amélioration mesurée du classifieur qui est en pause. Il reprend là où il s'arrête — voir le détail ci-dessous, qui reste valable tel quel.

________________


Roadmap restante (au 30 juillet 2026)

Fait les 29-30 juillet : bloc « Objections mesurables » complet (voir Modules terminés) — playbook d'objections du manager, classification sémantique + évaluation contre la méthode du manager, verbatims des deux côtés, filtre de période et page de détail par objection, onglet Analytics, Playbook déplacé dans Performance, banc d'essai d'import de transcript, et socle de calibrage mesurable. Bugs #55 à #59 documentés au passage.

Actions manuelles en attente côté Jean (bloquantes) :
* Exécuter la migration 008 (objection_eval_annotations) sur Supabase prod — sans elle la page /settings/calibrage ne peut rien enregistrer. Migrations 006 et 007 déjà passées.
* Faire annoter 3-4 calls par l'associé (directeur commercial) dans Paramètres > Calibrage, puis lancer la mesure. C'est ce qui débloque toute la suite du chantier objections.
* Test d'accord inter-annotateur : Jean ET l'associé annotent le MÊME call chacun de leur côté, sans se concerter, puis comparent. Ce pourcentage d'accord est le plafond réel de l'IA — inutile de viser au-delà, elle ne peut pas être plus cohérente que la définition elle-même. Vingt minutes, et ça cadre tout le reste.

Prochaines étapes du chantier objections, dans l'ordre (à décider APRÈS la première mesure — c'est elle qui dit quel levier tirer) :
1. Contre-exemples réels dans le prompt, tirés de ce que l'associé aura marqué « RATÉE » et « EN TROP ». ATTENTION au sur-apprentissage : seuls les cas vrais pour n'importe quel commercial B2B vont dans le prompt partagé ; un cas propre à un client devra passer par sa configuration (prévoir un champ « ce qui ne compte pas comme une objection chez nous » par organisation si le besoin se confirme).
2. Passe de vérification sur le rattachement (« cette objection appartient-elle vraiment à cette catégorie ? oui/non »), seulement si le « bon rangement » reste bas après l'étape 1.
3. Clustering Voyage des objections non classées, pour que l'app propose elle-même les catégories manquantes au manager. Indépendant des deux précédents, peut être lancé en parallèle.
4. Vote à trois sur l'extraction (triple le coût) — en dernier recours seulement.

Discipline de mesure : UN changement à la fois, mesure avant, mesure après. Avec 4 calls et une quinzaine d'objections, une objection pèse ~7 points : ne poursuivre que les écarts francs (15 points et plus). Ajouter un call au jeu de référence à chaque fois qu'un cas surprend en production — c'est ce qui empêche une régression de revenir.
Fait depuis la dernière mise à jour (19 juillet) : refonte visuelle complète direction Lovable (tokens bleus #2A5CE0, primitives ui-bits.tsx/PageHeader/TopBar, landing, liste feedback, dashboard, fix .brief-ui) + version mobile responsive (sidebar drawer), fix bug "William" (prompt d'analyse périmé, bug #51), audit complet du repo suivi de 6 correctifs (after() généralisé, /notifications au middleware, refresh rôle JWT, validation runtime analyse IA, auth google-oauth/start, rate limiting sur les 9 routes de génération IA — bugs #52-54) et fin de la migration visuelle (zéro indigo-* hors /admin, y compris onboarding, modales, références, page publique devis) — voir "Modules terminés" ci-dessus. L'ancien item "Harmoniser design system" et la "Restructuration finale UI de tous les modules" sont soldés.

Actions manuelles en attente côté Jean :
* Se réabonner sur le compte Oliverlist ("Se réabonner" sur /settings/billing) — l'org est restée en 'canceled'/bloquée depuis les tests de résiliation live, le fix customer_update est déployé et vérifié contre l'API réelle
* Exécuter la migration SQL users.import_hubspot_tasks sur Supabase prod (donnée en session, page /tasks/settings dégrade proprement en attendant mais le toggle reste inopérant)
* cd Brief && hs project upload pour déployer le nouveau scope crm.objects.owners.read (nécessaire à l'import inverse HubSpot → Brief, les users déjà connectés devront reconnecter HubSpot une fois déployé)
* Vérifier dans app.inngest.com que reportBillingUsage, checkBillingGracePeriods et syncDealOutcomes apparaissent bien dans la liste des fonctions déployées (resync généralement automatique au déploiement Vercel, à confirmer manuellement la première fois)
* Tester en pratique : sync de sièges (ajout/retrait membre), flux carte refusée → grâce → blocage (carte de test Stripe dédiée), déclenchement manuel du cron d'usage mensuel plutôt que d'attendre le 1er août
Priorité immédiate (déblocants business)
* Google OAuth — sortir du mode Testing (bloque toute croissance au-delà des comptes de test whitelistés)
* Sortir Stripe du mode Test — activation du compte (vérification entreprise, IBAN), nouveau webhook + price_id en mode Live ; le système est validé de bout en bout en Test. AVANT la bascule, trancher le pricing usage : recommandation audit = quota d'heures inclus par siège (ex. 10h/mois puis 0,50€/h) plutôt que la refacturation sèche dès la 1ère heure — évite les petites lignes de facture qui font poser des questions, et "10h incluses" devient un argument de vente
Recommandations audit du 21 juillet 2026 (classées par ratio effort/valeur)
* Sentry sur webhooks (Recall, Stripe) + crons Inngest — le fil rouge des bugs #46/#40/#42/#51 est l'échec silencieux découvert des jours après ; tier gratuit suffisant, meilleur ratio effort/valeur de la liste
* Checklist d'activation sur le dashboard ("Démarrage : 2/4 étapes" — agenda Recall, CRM, playbook, premier brief) — à faire AVANT d'ouvrir Google OAuth : le "aha moment" dépend de 3 connexions, un invité qui n'a rien connecté voit un dashboard vide et décroche
* Notifications inbox : la cloche TopBar mène vers des préférences, pas une inbox — incohérence UX. Les événements existent déjà tous en base (devis accepté, réponse prospect détectée, call analysé), il manque une table notifications + un compteur. Remplace l'ancien item "système de notifications transverse"
* Recherche globale v1 (contacts + calls, simple ilike) — l'input désactivé de la TopBar est l'élément "pas fini" le plus visible de l'app
* Dossier migrations/ committé (SQL numérotées, même appliquées à la main) — le workflow actuel (SQL donnée en session) a déjà produit le bug #43
* Tests sur les flux irréversibles uniquement (pas de couverture générale) : webhook Stripe, webhook Recall, acceptation devis — les endroits où un bug coûte de l'argent ou un client
* Validation runtime des 6 autres prompts JSON admin_config (même pattern que validateCallAnalysisShape) + bouton "restaurer le défaut" par prompt dans /admin/prompts
* À terme : découper lib/db.ts (~5000 lignes) par domaine ; passer le rate limiter in-memory sur Upstash/Redis quand il y aura plusieurs instances
Court terme (haute valeur produit)
* Backfill de tous les calls historiques restants avec le script (aujourd'hui seul Ravachol/Hubert est backfilé)
* Mobile : dashboard mobile orienté "Prochain RDV + son brief" (le vrai cas d'usage mobile = relire son brief 5 min avant le RDV)
CRM et intégrations
* Téléphonie Ringover/Aircall — capture automatique des appels téléphoniques. PASSÉE DEVANT Sellsy (reco audit) : la cible PME/ETI FR fait plus d'appels tél que de visios, Brief ne voit aujourd'hui qu'une fraction de l'activité réelle d'un commercial — c'est l'expansion de marché adressable la plus rentable
* Sellsy CRM (lecture, même architecture que HubSpot/Pipedrive)
* Salesforce CRM
Enrichissement
* Activer Pappers payant — "données légales FR" est dans le positionnement marketing mais tourne sans crédits (fallback mémoire Claude) : à financer avant d'en faire un argument
* Enrichissement Pappers — auto-remplir SIRET/adresse client dans les devis
* Enrichissement Proxycurl LinkedIn — poste, ancienneté, décideur
Infra & business
* Microsoft OAuth Recall — valider avec un vrai compte Outlook (déployé, jamais testé)
* Notifications push quand un prospect répond à un email de suivi
Plus tard
* Signature électronique qualifiée Yousign/DocuSign (actuellement signature simple)
* Webhook calendar Recall temps réel (actuellement polling cron 5 min)
* Notation briefs 👍/👎 dans backoffice
* Badge "prévenir le prospect de la présence du bot" (issue trouvée : les bots peuvent être kick de la salle d'attente sans consentement explicite)
* Amélioration UX édition des templates emails : note d'aide + preview
* Bibliothèque objections + win/loss agrégée/anonymisée par secteur = potentiel tier premium "benchmarks marché FR" — moat défendable sur le marché FR, à valider RGPD (la donnée se construit déjà toute seule)


________________


Style de travail à respecter impérativement
* Toujours donner UNE instruction Claude Code à la fois, complète et copiable telle quelle
* Format préféré : PARTIE 1 SQL (si migration) puis PARTIE 2 Claude Code
* Toujours donner la commande git complète quand il faut pousser
* Je teste après chaque étape, souvent avec screenshot — toujours interpréter le screenshot
* Ne jamais supposer que je sais adapter une commande — tout expliciter
* Toujours en français
* Réponses concises (je l'ai demandé explicitement)
* Ne jamais suggérer de s'arrêter ou de faire une pause — continuer tant que je veux avancer
* Sous-étapes numérotées A/B/C/D quand un chantier est gros
* Toujours confirmer la rétrocompat pour les données existantes
* Investigation en base directe > lecture de code seule (les vraies structures Recall/HubSpot réservent plein de surprises)
* Push proactif si besoin de mettre à jour scope OAuth : bandeau UI + bouton reconnexion, jamais silencieux
* JAMAIS inventer un scope OAuth — toujours vérifier la doc officielle


________________


Observations importantes sur Claude Code (leçons apprises)
* Peut modifier des fichiers sans les commiter → git status avant git push
* Les instructions complexes doivent être découpées en sous-étapes explicites
* Bonne discipline quand on lui donne une contrainte de rétrocompat explicite
* Tests concrets en base directe > simulations
* Découvertes de bugs latents (transcriptToText, structure Recall, etc.) quand on lui demande d'investigation avant d'implémenter
* Bon avec les patterns défensifs (index signatures TypeScript pour extension progressive, helpers utilitaires purs, etc.)