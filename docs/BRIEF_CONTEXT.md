Contexte Brief — reprise de session (version complète unifiée) — MàJ 18 juillet 2026
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
* Site prod : brief-precall.vercel.app
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
* app/team/ManageTeamModal.tsx — gestion rattachements
* app/team/InviteCommercialModal.tsx — invitation commercial


Settings (avec sub-navigation)


* app/settings/page.tsx (redirect vers /general)
* app/settings/_components/SettingsNav.tsx
* app/settings/general/page.tsx — profil commercial + références clients
* app/settings/connexions/page.tsx — Recall Google/Microsoft + bouton "Reconnecter Google Calendar" (scope events)
* app/settings/crm/page.tsx — HubSpot + Pipedrive
* app/settings/notifications/page.tsx + NotificationSettingsClient.tsx — préférences distribution


Admin backoffice (refonte design complète le 18 juillet 2026 — voir "Modules terminés")


* app/admin/page.tsx — interface admin principale (config brief + zone de test), auth login inline (seule page qui gère l'état non-authentifié)
* app/admin/AdminShell.tsx — Spinner + AdminLoginForm + AdminPageShell + AdminPageHeader + AdminCard, partagés par toutes les pages admin (avant : dupliqués dans 6 fichiers)
* app/admin/AdminNav.tsx — sidebar navigation admin (icônes lucide, largeur 256px)
* app/admin/dashboard/page.tsx + DashboardAdminClient.tsx — dashboard utilisateurs avec role, filtres, actions (désactiver/réactiver/supprimer/impersonate)
* app/admin/dashboard/users/[userId]/page.tsx + UserDetailAdminClient.tsx — détail user avec RDV programmés + rendez-vous sans enregistrement + historique impersonation
* app/admin/dashboard/RecallStatusSection.tsx + RecallStatusTables.tsx + AdminBadges.tsx
* app/admin/organizations/page.tsx + OrganizationsAdminClient.tsx
* app/admin/organizations/[orgId]/page.tsx + OrganizationDetailClient.tsx — détail organisation en 3 onglets horizontaux (Membres / Ajouter un membre / Zone dangereuse)
* app/admin/prompts/page.tsx + PromptsAdminClient.tsx — éditeur des prompts, 10 prompts en onglets horizontaux (un affiché à la fois, point ambre si valeur ≠ défaut)
* app/admin/test-brief/page.tsx — test génération brief
* app/admin/test-analysis/page.tsx — test analyse call
* app/admin/test-email/page.tsx — test email suivi

Toutes les pages sauf `/admin` (le login) sont gatées côté serveur via `isAdminAuthenticated()` + `redirect("/admin")` (uniforme depuis la refonte — avant, 5 pages géraient leur propre état loading/login/ready côté client).


Sidebar principale (app/components/AppSidebar.tsx)


* Brief (ancien "Brief pré-call")
* Analyse rendez-vous (ancien "Feedback post-call")
* Historique (ancien "Contacts")
* Devis
* Tasks (avec pastille rouge compteur)
* Équipe (avec sous-liens Playbook + Templates emails si manager)
* Paramètres + Déconnexion en bas
Lib (logique métier)
Fichiers principaux


* lib/db.ts — TOUTES les fonctions utilisent supabaseAdmin (service_role, bypass RLS)
* lib/auth.ts — NextAuth config, scopes Google : openid email profile calendar.events gmail.readonly gmail.send (calendar.events depuis sous-étape B distribution)
* lib/impersonation.ts — getImpersonationTarget() lit le cookie brief_impersonate_user_id
* lib/api-auth.ts — requireActiveUser(session) : vérifie session + disabled_at, gère l'impersonation
* lib/session-user.ts — getEffectiveUserId() pour les server components pages


Génération et IA


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
* lib/calendar.ts — getUpcomingMeetings(accessToken, provider, userEmail) (Google Calendar API ou Microsoft Graph)
* lib/google-calendar.ts — appendBriefToCalendarEvent, hasCalendarWriteAccess (interroge Google tokeninfo)
* lib/recall.ts — toutes les fonctions Recall EU. buildTranscriptJson, resolveSpeakerNames (heuristique 4 branches), getTranscriptContent, transcriptToText (attention : structure Recall utilise participant.{id,name,email}, pas speaker), getBotInfo, syncAndScheduleForUser, getVideoUrl
* lib/gmail.ts — getEmailHistory, refreshGoogleAccessToken, checkThreadReply
* lib/email.ts — Resend : sendInvitationEmail, sendQuoteAcceptedEmail, sendBriefPreCallEmail, sendCallAnalysisEmail


CRM


* lib/crm/pipedrive.ts — OAuth + lecture + écriture (sous-étape C2). api_domain contient déjà https://, ne jamais préfixer. hasPipedriveWriteAccess, findPipedriveContactForEmail, findPipedriveDealForEmail, findPipedriveActivityForEmail, appendToPipedriveActivityNote, createPipedriveNoteOnDeal, createPipedriveNoteOnContact, writeToPipedriveCascade (activity → deal → contact), htmlBodyForPipedrive
* lib/crm/hubspot.ts — OAuth + lecture + écriture (sous-étape C1). hasHubSpotWriteAccess, findHubSpotContactForEmail, findHubSpotDealForEmail (filtre closedwon/closedlost), findHubSpotMeetingForEmail, appendToHubSpotMeetingBody (écrit dans hs_meeting_body — pas d'association note↔meeting côté HubSpot), createHubSpotNoteOnDeal, createHubSpotNoteOnContact, writeToHubSpotCascade (meeting → deal → contact), htmlBodyForHubSpot (markdown → HTML + tables → listes à puces), idempotence via marqueur invisible <!-- brief-note-uid:{uid} -->. Sync tasks (18 juillet 2026) : createHubSpotTask, updateHubSpotTaskStatus, deleteHubSpotTask, batchGetHubSpotTaskStatuses, getHubSpotOwnerId (résout l'owner HubSpot via token-info email → Owners API), findNewHubSpotTasksForOwner (import inverse). Scope ajouté : crm.objects.owners.read
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


NEXTAUTH_SECRET, NEXTAUTH_URL


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
7. Je teste en prod sur brief-precall.vercel.app (screenshots)
8. Je te renvoie le screenshot ou dis "OK"
9. On enchaine ou on ajuste


________________


Roadmap restante (au 18 juillet 2026)
Fait depuis la dernière mise à jour : sync bidirectionnel tasks Brief ↔ HubSpot (par template + import inverse natif), fix import PDF playbook (pdf-parse v2) + drag-and-drop, refonte design complète de /admin + menus horizontaux — voir "Modules terminés" ci-dessus.

Actions manuelles en attente côté Jean :
* Exécuter la migration SQL users.import_hubspot_tasks sur Supabase prod (donnée en session, page /tasks/settings dégrade proprement en attendant mais le toggle reste inopérant)
* cd Brief && hs project upload pour déployer le nouveau scope crm.objects.owners.read (nécessaire à l'import inverse HubSpot → Brief, les users déjà connectés devront reconnecter HubSpot une fois déployé)
Court terme (haute valeur produit)
* Backfill de tous les calls historiques restants avec le script (aujourd'hui seul Ravachol/Hubert est backfilé)
Améliorations techniques
* Appliquer les 3 protections IA (max_tokens 1500, extractJsonObject, log réponse brute) à toutes les routes de génération IA restantes (generate-brief, generate-quote, etc.)
* Harmoniser design system (slate-* vs gray-*) entre /feedback et le reste
* Investigation bundle client qui référence SUPABASE_SERVICE_ROLE_KEY (pas de fuite active mais signal d'un import serveur non isolé)
* Amélioration UX édition des templates emails : note d'aide + preview
CRM et intégrations
* Sellsy CRM (lecture, même architecture que HubSpot/Pipedrive)
* Téléphonie Ringover/Aircall — capture automatique des appels téléphoniques (pas juste visio)
* Salesforce CRM
Enrichissement
* Enrichissement Pappers — auto-remplir SIRET/adresse client dans les devis
* Enrichissement Proxycurl LinkedIn — poste, ancienneté, décideur
* Activer Pappers payant (données légales FR précises en complément du web search)
Infra & business
* Stripe — facturation clients Brief
* Sortir Google OAuth du mode Testing — scopes sensibles à justifier, politique confidentialité publique
* Microsoft OAuth Recall — valider avec un vrai compte Outlook (déployé, jamais testé)
* Notifications push quand un prospect répond à un email de suivi
Plus tard
* Signature électronique qualifiée Yousign/DocuSign (actuellement signature simple)
* Webhook calendar Recall temps réel (actuellement polling cron 5 min)
* Notation briefs 👍/👎 dans backoffice
* Système de notifications transverse (cloche + table, aujourd'hui juste toast simple sur devis accepté)
* Badge "prévenir le prospect de la présence du bot" (issue trouvée : les bots peuvent être kick de la salle d'attente sans consentement explicite)
* Restructuration finale UI de tous les modules dans le nouveau design system


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