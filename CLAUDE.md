# CLAUDE.md — Brief (Sales Enablement B2B)

## Contexte business
- **Produit** : Brief = conversation intelligence pour commerciaux B2B FR (PME/ETI)
- **Société** : Oliverlist — COO Jean de Reviers. Brief est le premier module d'un SaaS plus large.
- **Positionnement** : marché FR, données légales Pappers, prix accessible vs Gong/Sybill
- **Accès** : invitation uniquement, pas d'inscription libre

## Vision produit
Distribution in-context : Brief livre ses outputs (briefs, analyses) là où le commercial travaille déjà — HubSpot, Google Calendar, email. L'utilisateur ne doit pas venir sur Brief pour en bénéficier.

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
- `lib/auth.ts` : scopes Google = `openid email profile calendar.events gmail.readonly gmail.send`

## Facturation (Stripe)

- `billing_status` sur `organizations` : `none` (jamais souscrit) → `trialing` (essai 7j, carte requise dès l'inscription) → `active` ↔ `grace_period` (échec de paiement, 48h de grâce, bannière d'alerte site-wide) → `blocked` (grâce expirée, accès bloqué par middleware sauf `/settings/billing`) → `canceled`
- Sièges = users actifs (`disabled_at IS NULL`) de l'org, synchronisés vers Stripe en best-effort à chaque mutation de composition (ajout/retrait/changement de rôle admin, invitation self-serve manager) — `syncSeatsForOrganization` dans `lib/stripe.ts`
- Usage facturé mensuellement (cron `reportBillingUsage`, 1er du mois), depuis `last_usage_reported_at` ou `current_period_start` pour le tout premier report (jamais depuis le début de l'historique — pas de facture rétroactive géante)
- Webhook `app/api/webhooks/stripe/route.ts` : idempotence via table `billing_events` (`stripe_event_id UNIQUE` + upsert `ignoreDuplicates`), calqué sur le webhook Recall existant (body brut, signature vérifiée avant parsing, `200` même si un effet de bord échoue)
- `lib/stripe.ts` : un seul subscription item par abonnement (le siège) — `current_period_start/end` vivent sur le `SubscriptionItem`, **pas** sur la `Subscription` elle-même (déplacé dans une version récente de l'API Stripe, vérifié contre le SDK installé avant d'écrire le code, pas supposé)

## Conventions de code

### Patterns clés
- `lib/db.ts` : toutes les fonctions DB centralisées ici, toujours `supabaseAdmin`
- `lib/api-auth.ts` : `requireActiveUser(session)` en tête de toutes les routes sensibles
- `lib/admin-config.ts` : imports dynamiques obligatoires (évite le bundle client — SERVICE_ROLE_KEY ne doit jamais fuiter)
- Prompts éditables : stockés dans `admin_config` (table key/value), pas dans des fichiers
- Idempotence systématique : contraintes UNIQUE en base + upserts partout (briefs, calls, tasks, notes HubSpot)
- Server components : `getEffectiveUserId()` de `lib/session-user.ts`
- Route handlers : `requireActiveUser(session)` de `lib/api-auth.ts`

### Génération IA — règles critiques
- Modèle principal : `claude-sonnet-4-6` / léger : `claude-haiku-4-5-20251001`
- `max_tokens` : minimum 1500 pour les sorties JSON (800 = troncature garantie)
- Toujours `extractJsonObject` robuste après réponse IA (préambule/postambule possible)
- Toujours logger la réponse brute en cas d'erreur JSON parsing
- Contrat JSON : forcer côté serveur dans le system prompt, jamais dans le template manager
- Web search : `web_search_20250305`, max_uses: 3 — activé pour tous les briefs

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

## Commandes

```bash
# Dev
npm run dev                          # Turbopack, port 3000

# HubSpot deploy (depuis sous-dossier uniquement)
cd Brief && hs project upload && cd ..

# Backfill call unique
npx ts-node scripts/backfill-single-call.ts <call_id>

# Toujours avant push
git status
git add . && git commit -m "..." && git push
```

## Roadmap prioritaire

Fait depuis la dernière mise à jour (18 juillet 2026) : sync bidirectionnel tasks Brief↔HubSpot par template + import inverse (task créée nativement dans HubSpot → créée sur Brief, toggle par user, nécessite le scope `crm.objects.owners.read`), fix import PDF playbook (pdf-parse v2) + drag-and-drop sur la zone fichier, refonte design complète de la partie `/admin` (nouveau design system + menus horizontaux sur `/admin/prompts` et détail organisation), fix résilience `/tasks/settings`, **système de facturation Stripe complet** (abonnement par siège + usage 0,50€/h + essai 7j + fenêtre de grâce 48h + blocage — voir section Facturation ci-dessus).

1. Protections IA — uniformiser max_tokens 1500 + extractJsonObject sur toutes les routes génération
2. Sellsy CRM — lecture
3. Sortir Stripe du mode Test — activation compte (vérification entreprise) pour encaisser réellement
4. Google OAuth — sortir du mode Testing
5. Ringover/Aircall — téléphonie (pas juste visio)
6. Proxycurl LinkedIn — enrichissement contact

## Comptes de test
- Jean (manager) : `jean.dereviers@oliverlist.com` — user_id `ee6772b4-423f-4091-a140-bf3991919c8b`
- Hubert (commercial) : `hubert.delalance@oliverlist.com` — user_id `39addb01-3110-4c96-ad24-2b22904bcd68`
- Org Oliverlist : `5a90c843-b6c2-4be2-ab64-7469216253d0`
- Call de référence backfilé : `16729b33-f56b-42a0-8687-c7dc0ae706f9` (Ravachol / Velbrun Capital)
