// Un seul passage pour tous les appels à api.hubapi.com : espacement des
// recherches, et reprise quand HubSpot renvoie 429.
//
// ⚠ Pourquoi (25/11/2026) : le cron de 7 h est tombé sur « Recherche des deals
// HubSpot refusée ». HubSpot limite les endpoints /search à 5 appels par
// seconde et par portail, or la pagination du parcours des pipelines enchaîne
// une recherche par centaine de deals — 21 pages sur le portail d'Oliverlist,
// envoyées à ~7 par seconde. Elle mourait à la 10ᵉ page, avec
// `policyName: SECONDLY`. Le quota se mesure côté HubSpot : l'espacement ici
// est la seule chose qui l'évite, la reprise n'est que le filet.
//
// Ces fonctions sont pures ou presque, et testées (tests/hubspot-fetch.test.ts).

/** Les endpoints de recherche, seuls soumis à la limite par seconde. */
export function isSearchUrl(url: string): boolean {
  return url.includes("/search");
}

/** 429 seulement : un appel refusé pour débit n'a pas été exécuté, le reprendre
 *  ne peut rien dupliquer. Un 5xx sur une écriture, lui, a pu passer. */
export function shouldRetry(status: number): boolean {
  return status === 429;
}

const MAX_ATTEMPTS = 4;
const RETRY_CAP_MS = 10_000;

/** L'attente avant la reprise n° `attempt` (1 = première reprise). HubSpot
 *  n'envoie pas toujours `Retry-After` sur la limite par seconde : à défaut,
 *  1 s, 2 s, 4 s, avec un peu de dispersion pour ne pas repartir en rafale. */
export function retryDelayMs(attempt: number, retryAfter: string | null, jitter = Math.random()): number {
  const fromHeader = retryAfter === null ? NaN : Number(retryAfter);
  if (Number.isFinite(fromHeader) && fromHeader > 0) return Math.min(fromHeader * 1000, RETRY_CAP_MS);
  return Math.min(2 ** (attempt - 1) * 1000 + Math.round(jitter * 250), RETRY_CAP_MS);
}

/** Le créneau réservé au prochain appel, à partir du dernier réservé. Pure
 *  pour être vérifiable : trois appels dans la même milliseconde partent à
 *  0, gap, 2 × gap. */
export function nextSlot(now: number, lastSlot: number, gapMs: number): { at: number; lastSlot: number } {
  const at = Math.max(now, lastSlot);
  return { at, lastSlot: at + gapMs };
}

const SEARCH_GAP_MS = 220; // 4,5 recherches/s, sous la limite de 5
let lastSearchSlot = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `fetch` pour HubSpot : même signature, même réponse. À utiliser partout dans
 * lib/crm/hubspot*.ts à la place de `fetch` — sauf l'échange de jetons OAuth,
 * qui ne relève pas de ces quotas.
 */
export async function hubspotFetch(url: string, init?: RequestInit): Promise<Response> {
  const search = isSearchUrl(url);

  for (let attempt = 0; ; attempt++) {
    if (search) {
      const slot = nextSlot(Date.now(), lastSearchSlot, SEARCH_GAP_MS);
      lastSearchSlot = slot.lastSlot;
      const wait = slot.at - Date.now();
      if (wait > 0) await sleep(wait);
    }

    const res = await fetch(url, init);
    if (!shouldRetry(res.status) || attempt + 1 >= MAX_ATTEMPTS) return res;

    const delay = retryDelayMs(attempt + 1, res.headers.get("retry-after"));
    console.warn(`[hubspot] ${res.status} sur ${new URL(url).pathname} — reprise dans ${delay} ms`);
    await sleep(delay);
  }
}
