export type NewsArticle = {
  titre: string;
  description: string;
  url: string;
  source: string;
  date: string | null;
};

// ── NewsAPI ───────────────────────────────────────────────────────────────────

const TRUSTED_DOMAINS =
  "lefigaro.fr,lemonde.fr,lesechos.fr,bfmtv.com,techcrunch.com,forbes.com,bloomberg.com";

const BLACKLISTED_HOSTNAMES = new Set([
  "johnchow.com",
  "casinosites.net",
  "casinosites.com",
  "gambling.com",
  "bettingnews.com",
  "bestcasino.com",
]);

function isBlacklisted(articleUrl: string): boolean {
  try {
    const hostname = new URL(articleUrl).hostname.toLowerCase().replace(/^www\./, "");
    return BLACKLISTED_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

function buildQuery(companyName: string, contactDomain: string | null): string {
  if (contactDomain) return `"${companyName}" OR "${contactDomain}"`;
  return companyName;
}

function parseNewsApiArticles(raw: Array<Record<string, unknown>>): NewsArticle[] {
  return raw
    .filter(
      (a) =>
        typeof a.title === "string" &&
        a.title !== "[Removed]" &&
        a.title.length > 0 &&
        !isBlacklisted(typeof a.url === "string" ? a.url : "")
    )
    .map((a) => ({
      titre: a.title as string,
      description: typeof a.description === "string" ? a.description : "",
      url: typeof a.url === "string" ? a.url : "",
      source:
        a.source && typeof (a.source as Record<string, unknown>).name === "string"
          ? ((a.source as Record<string, unknown>).name as string)
          : "",
      date: typeof a.publishedAt === "string" ? a.publishedAt : "",
    }));
}

async function fetchNewsApiRaw(
  query: string,
  language: string,
  apiKey: string,
  withDomains: boolean
): Promise<Array<Record<string, unknown>>> {
  const params = new URLSearchParams({
    q: query,
    language,
    sortBy: "publishedAt",
    pageSize: "7",
    apiKey,
  });
  if (withDomains) params.set("domains", TRUSTED_DOMAINS);

  const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.articles as Array<Record<string, unknown>>) ?? [];
}

async function fetchWithNewsApi(
  companyName: string,
  contactDomain: string | null,
  apiKey: string
): Promise<NewsArticle[]> {
  const query = buildQuery(companyName, contactDomain);

  for (const language of ["fr", "en"]) {
    const trustedRaw = await fetchNewsApiRaw(query, language, apiKey, true);
    const trustedArticles = parseNewsApiArticles(trustedRaw);
    console.log(`[news/newsapi] "${query}" [${language}] trusted: ${trustedRaw.length} bruts → ${trustedArticles.length} après filtrage`);
    if (trustedArticles.length >= 2) return trustedArticles;

    const openRaw = await fetchNewsApiRaw(query, language, apiKey, false);
    const openArticles = parseNewsApiArticles(openRaw);
    console.log(`[news/newsapi] "${query}" [${language}] open: ${openRaw.length} bruts → ${openArticles.length} après filtrage`);
    if (openArticles.length > 0) return openArticles;
  }

  return [];
}

// ── Serper ────────────────────────────────────────────────────────────────────

function normalizeSerperDate(raw: string): string | null {
  if (!raw) return null;

  const relativeMatch = raw.match(/^(\d+)\s+(hour|day|week|month)s?\s+ago$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const ms =
      unit === "hour"  ? amount * 60 * 60 * 1000 :
      unit === "day"   ? amount * 24 * 60 * 60 * 1000 :
      unit === "week"  ? amount * 7 * 24 * 60 * 60 * 1000 :
      /* month */        amount * 30 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() - ms).toISOString();
  }

  try {
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  } catch {
    // fall through
  }

  return null;
}

function parseSerperArticles(raw: Array<Record<string, unknown>>): NewsArticle[] {
  return raw
    .filter(
      (a) =>
        typeof a.title === "string" &&
        a.title.length > 0 &&
        !isBlacklisted(typeof a.link === "string" ? a.link : "")
    )
    .map((a) => ({
      titre: a.title as string,
      description: typeof a.snippet === "string" ? a.snippet : "",
      url: typeof a.link === "string" ? a.link : "",
      source: typeof a.source === "string" ? a.source : "",
      date: normalizeSerperDate(typeof a.date === "string" ? a.date : ""),
    }));
}

async function fetchWithSerper(
  companyName: string,
  contactDomain: string | null,
  apiKey: string
): Promise<NewsArticle[]> {
  const query = buildQuery(companyName, contactDomain);

  const res = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, gl: "fr", hl: "fr", num: 5 }),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    console.log(`[news/serper] "${query}" échec HTTP ${res.status}`);
    return [];
  }

  const data = await res.json();
  const raw: Array<Record<string, unknown>> = data.news ?? [];
  const articles = parseSerperArticles(raw);
  console.log(`[news/serper] "${query}": ${raw.length} bruts → ${articles.length} après filtrage`);
  return articles;
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

export async function fetchRecentNews(
  companyName: string,
  contactDomain: string | null = null
): Promise<NewsArticle[]> {
  const serperKey = process.env.SERPER_API_KEY;
  const newsApiKey = process.env.NEWS_API_KEY;

  try {
    if (serperKey) {
      const articles = await fetchWithSerper(companyName, contactDomain, serperKey);
      if (articles.length > 0) return articles;
      console.log(`[news/serper] Aucun résultat — fallback NewsAPI`);
    }

    if (newsApiKey) {
      return await fetchWithNewsApi(companyName, contactDomain, newsApiKey);
    }
  } catch {
    return [];
  }

  return [];
}
