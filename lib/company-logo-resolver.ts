import { guessHostsFromName, hostMatchesCompanyName, isPublicHostname } from "./company-logo";

// Recherche du logo d'une entreprise (voir app/api/company-logo/route.ts pour
// l'ordre et les raisons). Serveur uniquement : appels réseau et clé Serper.
// Chaque étape est tracée : le mode diagnostic de la route la renvoie telle
// quelle, pour comprendre un logo absent sans accès aux logs.

const TIMEOUT_MS = 4000;

export type LogoTraceStep = { step: string; detail: string };

async function fetchStatus(url: string, trace: LogoTraceStep[], label: string): Promise<Response | null> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    trace.push({ step: label, detail: `HTTP ${res.status}` });
    return res.ok ? res : null;
  } catch (err) {
    trace.push({ step: label, detail: `échec : ${err instanceof Error ? err.message : String(err)}` });
    return null;
  }
}

// Google répond 404 (avec un globe générique) quand il n'a pas de favicon :
// un 200 est donc un vrai logo. DuckDuckGo en connaît d'autres.
async function logoForHost(host: string, trace: LogoTraceStep[]): Promise<string | null> {
  const google = await fetchStatus(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`, trace, `Google ${host}`);
  if (google) return google.url;
  const ddg = await fetchStatus(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`, trace, `DuckDuckGo ${host}`);
  if (ddg) return ddg.url;
  return null;
}

// Le site officiel de l'entreprise d'après une recherche web (Serper, déjà
// utilisé pour les actualités). Premier résultat dont le domaine porte le nom.
async function findCompanyHost(name: string, trace: LogoTraceStep[]): Promise<string | null> {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    trace.push({ step: "recherche web", detail: "SERPER_API_KEY absente" });
    return null;
  }
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${name} site officiel`, gl: "fr", hl: "fr", num: 8 }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      trace.push({ step: "recherche web", detail: `HTTP ${res.status}` });
      return null;
    }
    const data = (await res.json()) as { organic?: { link?: string }[] };
    const hosts: string[] = [];
    for (const result of data.organic ?? []) {
      if (!result.link) continue;
      try {
        hosts.push(new URL(result.link).hostname.toLowerCase().replace(/^www\./, ""));
      } catch {
        // lien illisible
      }
    }
    const match = hosts.find((h) => isPublicHostname(h) && hostMatchesCompanyName(h, name)) ?? null;
    trace.push({ step: "recherche web", detail: `${hosts.slice(0, 5).join(", ") || "aucun résultat"} → ${match ?? "aucun site au nom de l'entreprise"}` });
    return match;
  } catch (err) {
    trace.push({ step: "recherche web", detail: `échec : ${err instanceof Error ? err.message : String(err)}` });
    return null;
  }
}

export async function resolveCompanyLogo(
  domain: string | null,
  name: string | null,
  trace: LogoTraceStep[] = []
): Promise<string | null> {
  const tried = new Set<string>();
  async function tryHost(host: string): Promise<string | null> {
    if (tried.has(host)) return null;
    tried.add(host);
    return logoForHost(host, trace);
  }

  if (domain) {
    const direct = await tryHost(domain);
    if (direct) return direct;
  }
  if (name) {
    const host = await findCompanyHost(name, trace);
    if (host) {
      const found = await tryHost(host);
      if (found) return found;
    }
    for (const guess of guessHostsFromName(name)) {
      const found = await tryHost(guess);
      if (found) return found;
    }
  }
  return null;
}
