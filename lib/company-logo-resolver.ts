import { hostMatchesCompanyName, isPublicHostname } from "./company-logo";

// Recherche du logo d'une entreprise (voir app/api/company-logo/route.ts pour
// l'ordre et les raisons). Serveur uniquement : appels réseau et clé Serper.

const TIMEOUT_MS = 4000;

async function fetchOk(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

// Google répond 404 (avec un globe générique) quand il n'a pas de favicon :
// un 200 est donc un vrai logo. DuckDuckGo en connaît d'autres.
async function logoForHost(host: string): Promise<string | null> {
  const google = await fetchOk(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`);
  if (google) return google.url;
  const ddg = await fetchOk(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`);
  if (ddg) return ddg.url;
  return null;
}

// Le site officiel de l'entreprise d'après une recherche web (Serper, déjà
// utilisé pour les actualités). Premier résultat dont le domaine porte le nom.
async function findCompanyHost(name: string): Promise<string | null> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${name} site officiel`, gl: "fr", hl: "fr", num: 8 }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { organic?: { link?: string }[] };
    for (const result of data.organic ?? []) {
      if (!result.link) continue;
      let host: string;
      try {
        host = new URL(result.link).hostname.toLowerCase().replace(/^www\./, "");
      } catch {
        continue;
      }
      if (isPublicHostname(host) && hostMatchesCompanyName(host, name)) return host;
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveCompanyLogo(domain: string | null, name: string | null): Promise<string | null> {
  if (domain) {
    const direct = await logoForHost(domain);
    if (direct) return direct;
  }
  if (name) {
    const host = await findCompanyHost(name);
    if (host && host !== domain) return logoForHost(host);
  }
  return null;
}

