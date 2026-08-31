// In-memory sliding-window rate limiter.
// Resets on server restart; not shared across multiple instances.

type Limits = {
  ip: { max: number; windowMs: number };
  user: { max: number; windowMs: number };
  global: { max: number; windowMs: number };
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number; scope: "global" | "ip" | "user" };

function recent(timestamps: number[], windowMs: number): number[] {
  return timestamps.filter((t) => t > Date.now() - windowMs);
}

function retryAfterMs(timestamps: number[], windowMs: number): number {
  const oldest = Math.min(...timestamps);
  return Math.max(0, oldest + windowMs - Date.now());
}

function createRateLimiter(limits: Limits) {
  const ipStore = new Map<string, number[]>();
  const userStore = new Map<string, number[]>();
  const globalTimestamps: number[] = [];
  let lastCleanup = Date.now();

  // Prune stale entries every 5 minutes to avoid memory leaks
  function maybeCleanup() {
    if (Date.now() - lastCleanup < 5 * 60 * 1000) return;
    lastCleanup = Date.now();
    for (const [key, ts] of ipStore) {
      const fresh = recent(ts, limits.ip.windowMs);
      if (fresh.length === 0) ipStore.delete(key);
      else ipStore.set(key, fresh);
    }
    for (const [key, ts] of userStore) {
      const fresh = recent(ts, limits.user.windowMs);
      if (fresh.length === 0) userStore.delete(key);
      else userStore.set(key, fresh);
    }
  }

  return function check(ip: string, userId: string | null): RateLimitResult {
    maybeCleanup();

    // ── Pure checks (no mutation yet) ───────────────────────────────────────
    const recentGlobal = recent(globalTimestamps, limits.global.windowMs);
    if (recentGlobal.length >= limits.global.max) {
      return { allowed: false, retryAfterMs: retryAfterMs(recentGlobal, limits.global.windowMs), scope: "global" };
    }

    const recentIp = recent(ipStore.get(ip) ?? [], limits.ip.windowMs);
    if (recentIp.length >= limits.ip.max) {
      return { allowed: false, retryAfterMs: retryAfterMs(recentIp, limits.ip.windowMs), scope: "ip" };
    }

    const recentUser = userId ? recent(userStore.get(userId) ?? [], limits.user.windowMs) : [];
    if (userId && recentUser.length >= limits.user.max) {
      return { allowed: false, retryAfterMs: retryAfterMs(recentUser, limits.user.windowMs), scope: "user" };
    }

    // ── All checks passed — consume slots ───────────────────────────────────
    const now = Date.now();

    globalTimestamps.splice(0, globalTimestamps.length, ...recentGlobal, now);

    recentIp.push(now);
    ipStore.set(ip, recentIp);

    if (userId) {
      recentUser.push(now);
      userStore.set(userId, recentUser);
    }

    return { allowed: true };
  };
}

// Briefs — the most expensive generation (web search + Pappers + CRM), keeps
// its historical tight quotas and its own buckets.
export const checkRateLimit = createRateLimiter({
  ip:     { max: 10,  windowMs: 60 * 60 * 1000 },        // 10 / heure
  user:   { max: 20,  windowMs: 24 * 60 * 60 * 1000 },   // 20 / jour
  global: { max: 100, windowMs: 60 * 60 * 1000 },        // 100 / heure
});

// Other AI generation routes (quote pre-fill, email drafts, reply
// suggestions, playbook import…) — cheaper per call and used more often in a
// normal workflow, so quotas are looser. Separate buckets: generating emails
// must not eat into the brief quota or vice versa.
export const checkAiGenerationRateLimit = createRateLimiter({
  ip:     { max: 60,  windowMs: 60 * 60 * 1000 },        // 60 / heure
  user:   { max: 200, windowMs: 24 * 60 * 60 * 1000 },   // 200 / jour
  global: { max: 600, windowMs: 60 * 60 * 1000 },        // 600 / heure
});

export function retryAfterMinutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}

export function requestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ---------------------------------------------------------------------------
// Limitation partagée entre instances (migration 011)
//
// Le limiteur en mémoire ci-dessus ne voit qu'une instance Vercel, et elles
// sont éphémères : deux appels consécutifs peuvent ne pas partager de
// compteur. Suffisant contre un double-clic, inopérant contre un client qui
// boucle — et chaque génération non bloquée est une facture Anthropic.
//
// Deux allers-retours (compter, insérer) sur une route qui va de toute façon
// attendre plusieurs secondes une réponse du modèle : le coût est négligeable
// là où il est payé.
//
// TOLÈRE L'ABSENCE DE LA TABLE (pattern bug #14) : tant que la migration 011
// n'est pas passée en prod, on retombe sur le limiteur en mémoire au lieu de
// faire échouer la génération. Une limitation dégradée vaut mieux qu'une
// fonctionnalité cassée — mais ce n'est pas une raison de ne pas passer la
// migration.
import { supabaseAdmin } from "./supabase";

export type SharedLimit = { max: number; windowMs: number };

// Le quota partagé reprend la fenêtre par UTILISATEUR du limiteur en mémoire
// (200 générations par jour), pas la fenêtre par IP : c'est le seul compteur
// qui a un sens quand les instances ne se voient pas. Volontairement identique
// et non plus strict — l'objectif est de rendre la limite existante réellement
// opposable, pas d'en durcir la valeur au passage.
const AI_SHARED_LIMIT: SharedLimit = { max: 200, windowMs: 24 * 60 * 60 * 1000 };

export async function checkSharedRateLimit(
  bucket: string,
  limit: SharedLimit
): Promise<{ allowed: boolean; retryAfterMs: number; degraded: boolean }> {
  const since = new Date(Date.now() - limit.windowMs).toISOString();

  const { count, error } = await supabaseAdmin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .gte("created_at", since);

  if (error) {
    // Table absente ou base injoignable : on le dit à l'appelant, qui se
    // rabattra sur le limiteur en mémoire.
    console.warn("[rate-limit] comptage partagé indisponible, repli en mémoire :", error.message);
    return { allowed: true, retryAfterMs: 0, degraded: true };
  }

  if ((count ?? 0) >= limit.max) {
    return { allowed: false, retryAfterMs: limit.windowMs, degraded: false };
  }

  const { error: insertError } = await supabaseAdmin
    .from("rate_limit_events")
    .insert({ bucket });
  if (insertError) {
    console.warn("[rate-limit] enregistrement de l'événement échoué :", insertError.message);
  }

  // Purge opportuniste : une fois sur cinquante, on efface ce qui est sorti de
  // toutes les fenêtres. Pas de cron dédié pour une table qui se vide en une
  // requête, et pas à chaque appel pour ne pas payer une suppression à chaque
  // génération.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    void supabaseAdmin
      .from("rate_limit_events")
      .delete()
      .lt("created_at", cutoff)
      .then(({ error: purgeError }) => {
        if (purgeError) console.warn("[rate-limit] purge échouée :", purgeError.message);
      });
  }

  return { allowed: true, retryAfterMs: 0, degraded: false };
}

// Le garde à appeler depuis une route de génération IA : mémoire PUIS partagé.
//
// La mémoire d'abord parce qu'elle est gratuite et attrape le cas le plus
// fréquent — le double-clic, la boucle de rendu — sans toucher la base. Le
// partagé ensuite, seul capable de voir un client qui tourne réparti sur
// plusieurs instances.
//
// Si le comptage partagé est indisponible (migration 011 non passée, base
// injoignable), on laisse passer : le verdict en mémoire fait alors seul
// autorité. Une limitation dégradée vaut mieux qu'une génération cassée.
export async function enforceAiGenerationLimit(
  ip: string,
  userId: string
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const local = checkAiGenerationRateLimit(ip, userId);
  if (!local.allowed) return local;

  const shared = await checkSharedRateLimit(`ai:${userId}`, AI_SHARED_LIMIT);
  if (!shared.allowed) return { allowed: false, retryAfterMs: shared.retryAfterMs };

  return { allowed: true, retryAfterMs: 0 };
}
