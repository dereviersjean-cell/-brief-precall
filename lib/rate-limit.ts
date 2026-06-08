// In-memory sliding-window rate limiter.
// Resets on server restart; not shared across multiple instances.

const ipStore = new Map<string, number[]>();
const userStore = new Map<string, number[]>();
const globalTimestamps: number[] = [];

const LIMITS = {
  ip:     { max: 10,  windowMs: 60 * 60 * 1000 },        // 10 / heure
  user:   { max: 20,  windowMs: 24 * 60 * 60 * 1000 },   // 20 / jour
  global: { max: 100, windowMs: 60 * 60 * 1000 },         // 100 / heure
};

let lastCleanup = Date.now();

function recent(timestamps: number[], windowMs: number): number[] {
  return timestamps.filter((t) => t > Date.now() - windowMs);
}

function retryAfterMs(timestamps: number[], windowMs: number): number {
  const oldest = Math.min(...timestamps);
  return Math.max(0, oldest + windowMs - Date.now());
}

// Prune stale entries every 5 minutes to avoid memory leaks
function maybeCleanup() {
  if (Date.now() - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = Date.now();
  for (const [key, ts] of ipStore) {
    const fresh = recent(ts, LIMITS.ip.windowMs);
    if (fresh.length === 0) ipStore.delete(key);
    else ipStore.set(key, fresh);
  }
  for (const [key, ts] of userStore) {
    const fresh = recent(ts, LIMITS.user.windowMs);
    if (fresh.length === 0) userStore.delete(key);
    else userStore.set(key, fresh);
  }
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number; scope: "global" | "ip" | "user" };

export function checkRateLimit(ip: string, userId: string | null): RateLimitResult {
  maybeCleanup();

  // ── Pure checks (no mutation yet) ─────────────────────────────────────────
  const recentGlobal = recent(globalTimestamps, LIMITS.global.windowMs);
  if (recentGlobal.length >= LIMITS.global.max) {
    return { allowed: false, retryAfterMs: retryAfterMs(recentGlobal, LIMITS.global.windowMs), scope: "global" };
  }

  const recentIp = recent(ipStore.get(ip) ?? [], LIMITS.ip.windowMs);
  if (recentIp.length >= LIMITS.ip.max) {
    return { allowed: false, retryAfterMs: retryAfterMs(recentIp, LIMITS.ip.windowMs), scope: "ip" };
  }

  const recentUser = userId ? recent(userStore.get(userId) ?? [], LIMITS.user.windowMs) : [];
  if (userId && recentUser.length >= LIMITS.user.max) {
    return { allowed: false, retryAfterMs: retryAfterMs(recentUser, LIMITS.user.windowMs), scope: "user" };
  }

  // ── All checks passed — consume slots ─────────────────────────────────────
  const now = Date.now();

  globalTimestamps.splice(0, globalTimestamps.length, ...recentGlobal, now);

  recentIp.push(now);
  ipStore.set(ip, recentIp);

  if (userId) {
    recentUser.push(now);
    userStore.set(userId, recentUser);
  }

  return { allowed: true };
}

export function retryAfterMinutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}
