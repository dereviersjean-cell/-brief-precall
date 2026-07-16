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

1. Distribution C2 — Pipedrive en écriture (même logique HubSpot C1)
2. Distribution D — Slack (from scratch)
3. Digest hebdo — commercial + manager, vendredi soir ou lundi matin
4. Protections IA — uniformiser max_tokens 1500 + extractJsonObject sur toutes les routes génération
5. Sellsy CRM — lecture
6. Stripe — facturation
7. Google OAuth — sortir du mode Testing
8. Ringover/Aircall — téléphonie (pas juste visio)
9. Proxycurl LinkedIn — enrichissement contact

## Comptes de test
- Jean (manager) : `jean.dereviers@oliverlist.com` — user_id `ee6772b4-423f-4091-a140-bf3991919c8b`
- Hubert (commercial) : `hubert.delalance@oliverlist.com` — user_id `39addb01-3110-4c96-ad24-2b22904bcd68`
- Org Oliverlist : `5a90c843-b6c2-4be2-ab64-7469216253d0`
- Call de référence backfilé : `16729b33-f56b-42a0-8687-c7dc0ae706f9` (Ravachol / Velbrun Capital)
