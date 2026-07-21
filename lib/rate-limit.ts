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
