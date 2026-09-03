import { reportWarning } from "./monitoring";

export type ApolloEmploymentEntry = {
  organizationName: string | null;
  title: string | null;
  current: boolean;
  startDate: string | null;
};

export type ApolloContact = {
  name: string | null;
  title: string | null;
  // Valeurs Apollo : intern, entry, senior, manager, director, vp, c_suite,
  // owner, partner, founder — cf. seniorityLabel ci-dessous pour la
  // traduction en évaluation "décisionnaire probable" utilisable telle
  // quelle, sans faire deviner ça à l'IA à partir de rien.
  seniority: string | null;
  linkedinUrl: string | null;
  headline: string | null;
  employmentHistory: ApolloEmploymentEntry[];
};

const BASE_URL = "https://api.apollo.io/api/v1";

async function fetchWithTimeout(url: string, apiKey: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

// Décisionnaire probable, déduit directement du champ `seniority` renvoyé par
// Apollo — un fait structuré, pas une estimation IA. Volontairement conservé
// ici plutôt que délégué au prompt : le mapping ne change jamais, une
// fonction déterministe ne peut pas "halluciner" un niveau différent d'un
// appel à l'autre comme pourrait le faire un LLM.
export function seniorityLabel(seniority: string | null): string | null {
  switch (seniority) {
    case "c_suite":
    case "owner":
    case "founder":
    case "partner":
      return "Décisionnaire probable (direction)";
    case "vp":
    case "director":
      return "Décisionnaire probable ou fort pouvoir d'influence";
    case "manager":
    case "senior":
      return "Probablement impliqué dans la décision, sans en être le décideur final";
    case "entry":
    case "intern":
      return "Rôle plutôt opérationnel, probablement pas décisionnaire";
    default:
      return null;
  }
}

function yearsSince(startDate: string | null): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const years = (Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (years < 1) return "moins d'un an";
  const rounded = Math.floor(years);
  return `${rounded} an${rounded > 1 ? "s" : ""}`;
}

// Résumé de carrière factuel (poste actuel + un poste précédent), affiché
// directement dans la fiche contact — construit ici en code plutôt que
// rédigé par l'IA : ce sont des faits qu'Apollo fournit déjà structurés, les
// reformuler via un LLM n'ajouterait qu'un risque de déformation sans rien
// apporter.
export function formatContactSummary(contact: ApolloContact): string {
  const parts: string[] = [];

  const label = seniorityLabel(contact.seniority);
  if (label) parts.push(label);

  const current = contact.employmentHistory.find((e) => e.current) ?? contact.employmentHistory[0];
  const tenure = current ? yearsSince(current.startDate) : null;
  if (tenure) parts.push(`En poste depuis ${tenure}`);

  const previous = contact.employmentHistory.find((e) => !e.current && e.organizationName);
  if (previous?.organizationName) {
    parts.push(`Auparavant ${previous.title ?? "en poste"} chez ${previous.organizationName}`);
  }

  return parts.join(" · ");
}

export async function enrichContact(email: string): Promise<ApolloContact | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout(
      `${BASE_URL}/people/match?email=${encodeURIComponent(email)}`,
      apiKey
    );

    if (!res.ok) {
      // Comme pour Pappers : un échec HTTP (401 clé invalide, 429 quota
      // dépassé — le plan gratuit ne donne que 10 crédits/mois...) doit être
      // visible, pas avalé en silence.
      reportWarning("apollo.enrich", new Error(`Apollo people/match HTTP ${res.status}`), {
        status: res.status,
      });
      return null;
    }

    const data = (await res.json()) as {
      person?: {
        name?: string;
        title?: string;
        seniority?: string;
        linkedin_url?: string;
        headline?: string;
        employment_history?: Array<{
          organization_name?: string;
          title?: string;
          current?: boolean;
          start_date?: string;
        }>;
      };
    };

    // 0 crédit consommé et `person: null` quand Apollo ne trouve rien pour
    // cet email — cas normal (contact absent de leur base), pas une erreur.
    if (!data.person) return null;

    const p = data.person;
    return {
      name: p.name ?? null,
      title: p.title ?? null,
      seniority: p.seniority ?? null,
      linkedinUrl: p.linkedin_url ?? null,
      headline: p.headline ?? null,
      employmentHistory: (p.employment_history ?? []).map((e) => ({
        organizationName: e.organization_name ?? null,
        title: e.title ?? null,
        current: e.current ?? false,
        startDate: e.start_date ?? null,
      })),
    };
  } catch (err) {
    reportWarning("apollo.enrich", err, { email });
    return null;
  }
}
