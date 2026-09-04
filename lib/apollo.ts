import { reportWarning } from "./monitoring";
import { deriveNameFromEmail } from "./format";
import type { Contact } from "./types";

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
  // L'adresse professionnelle telle qu'Apollo la connaît. Peut différer de
  // celle saisie : une recherche par nom rattrape une adresse erronée et
  // rend la bonne (mesuré le 04/09/2026 — « gautier.richard@bewtr.fr »
  // saisi, « gautier@bewtr.com » retrouvé). C'est elle qu'on retient
  // ensuite, y compris pour l'email de suivi.
  email: string | null;
};

// Ce dont on dispose pour retrouver la personne. Aucun champ n'est
// obligatoire à lui seul : c'est la COMBINAISON qui compte (un email, ou un
// nom accompagné de l'entreprise).
export type ContactLookup = {
  email?: string | null;
  name?: string | null;
  companyName?: string | null;
  domain?: string | null;
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

// Apollo renvoie des chaînes vides plutôt que null sur les champs qu'il ne
// connaît pas — or `??` ne réagit qu'à null/undefined, donc un `""` traversait
// tous les replis et s'affichait tel quel.
function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
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

  // Le poste précédent doit être dans une AUTRE entreprise : un changement de
  // titre en interne (« Co-Founder & CEO » → « Co-Founder & Chairman » chez
  // Apollo.io) ne dit rien à un commercial et occupe la seule ligne de
  // contexte disponible. Constaté sur la vraie réponse de l'API le
  // 04/09/2026, pas au jugé.
  const currentOrg = current?.organizationName ?? null;
  const previous = contact.employmentHistory.find(
    (e) => !e.current && e.organizationName && e.organizationName !== currentOrg
  );
  if (previous?.organizationName) {
    parts.push(`Auparavant ${previous.title ?? "en poste"} chez ${previous.organizationName}`);
  }

  return parts.join(" · ");
}

// La fiche telle qu'elle s'affiche dans le brief. Partagée entre la
// génération (/api/generate-brief) et la modification du contact
// (/api/briefs/[id]/contact) : deux copies auraient divergé, et l'écart ne se
// serait vu que sur un brief déjà envoyé à un commercial.
//
// `apollo` à null (pas de clé configurée, contact introuvable, quota épuisé)
// n'empêche pas d'afficher la fiche : on retombe sur ce que l'utilisateur a
// saisi, qui reste ce qu'on sait de mieux sur cette personne.
//
// L'adresse retenue est celle d'Apollo quand il en a une : elle corrige une
// adresse saisie de travers, et c'est elle qui servira ensuite à l'email de
// suivi. `fallback` porte ce que l'utilisateur a fourni (l'un ou l'autre, pas
// forcément les deux).
export function buildContactCard(
  apollo: ApolloContact | null,
  fallback: { email?: string | null; name?: string | null }
): Contact {
  const fallbackEmail = emptyToNull(fallback.email);
  const email = apollo?.email ?? fallbackEmail;
  const name =
    apollo?.name ??
    emptyToNull(fallback.name) ??
    (email ? deriveNameFromEmail(email) : null) ??
    email ??
    "Contact";

  return {
    name,
    title: apollo?.title ?? "",
    linkedin: apollo?.linkedinUrl ?? undefined,
    email: email ?? undefined,
    notes: apollo ? formatContactSummary(apollo) || undefined : undefined,
  };
}

// Un appel à people/match. Renvoie null si Apollo ne connaît pas la personne
// (0 crédit consommé dans ce cas) — l'appelant enchaîne alors sur un autre
// critère de recherche.
async function matchOnce(query: URLSearchParams, apiKey: string): Promise<ApolloContact | null> {
  const res = await fetchWithTimeout(`${BASE_URL}/people/match?${query.toString()}`, apiKey);

  if (!res.ok) {
    // Comme pour Pappers : un échec HTTP (401 clé invalide, 403 endpoint hors
    // du plan, 422 crédits épuisés...) doit être visible, pas avalé en
    // silence.
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
      email?: string;
      employment_history?: Array<{
        organization_name?: string;
        title?: string;
        current?: boolean;
        start_date?: string;
      }>;
    };
  };

  if (!data.person) return null;

  const p = data.person;
  const contact: ApolloContact = {
    name: emptyToNull(p.name),
    title: emptyToNull(p.title),
    seniority: emptyToNull(p.seniority),
    linkedinUrl: emptyToNull(p.linkedin_url),
    headline: emptyToNull(p.headline),
    email: emptyToNull(p.email),
    employmentHistory: (p.employment_history ?? []).map((e) => ({
      organizationName: emptyToNull(e.organization_name),
      title: emptyToNull(e.title),
      current: e.current ?? false,
      startDate: emptyToNull(e.start_date),
    })),
  };

  // Apollo renvoie parfois un objet `person` PRÉSENT mais entièrement vide
  // (nom `""`, poste `null`, aucun historique) quand le critère ne
  // correspond à personne dans sa base. Sans ce garde, la fiche affichait
  // un nom vide en prétendant que l'enrichissement avait réussi — et le
  // message « aucune information trouvée » ne s'affichait pas, puisque
  // l'objet n'était pas null. Constaté le 04/09/2026 sur une adresse
  // inconnue d'Apollo, invisible en lisant la doc.
  const hasAnything =
    contact.name || contact.title || contact.linkedinUrl || contact.employmentHistory.length > 0;
  return hasAnything ? contact : null;
}

// Recherche en cascade, du critère le plus fiable au plus tolérant.
//
// L'email seul ne suffit pas : une adresse devinée ou mal notée (mauvais
// domaine, mauvais format) ne correspond à rien chez Apollo, alors que la
// personne y figure bel et bien. Mesuré le 04/09/2026 sur un cas réel :
// « gautier.richard@bewtr.fr » ne renvoyait rien, « Gautier Richard » + « BE
// WTR » renvoyait le profil complet — Directeur Général France — ET la bonne
// adresse, « gautier@bewtr.com ».
//
// Le nom+entreprise n'est donc pas un repli de second ordre : c'est souvent
// ce que le commercial connaît réellement avant un rendez-vous, quand
// l'adresse exacte, elle, se devine mal.
// Un profil réduit à un nom n'apprend RIEN : le nom, on l'avait déjà (saisi,
// ou déduit de l'adresse). Sur une adresse erronée, Apollo renvoie justement
// ça — un nom reconstitué depuis l'adresse, sans poste ni parcours. Si on
// s'en contentait, la cascade s'arrêterait sur cette coquille vide et
// n'essaierait jamais la recherche par nom, qui elle rend le profil complet.
// Mesuré le 04/09/2026 : par adresse fausse → nom seul ; par nom+entreprise →
// « Directeur Général France », LinkedIn, parcours et bonne adresse.
function isSubstantial(contact: ApolloContact): boolean {
  return !!(contact.title || contact.linkedinUrl || contact.employmentHistory.length > 0);
}

export async function enrichContact(lookup: ContactLookup): Promise<ApolloContact | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  const email = emptyToNull(lookup.email);
  const name = emptyToNull(lookup.name);
  const domain = emptyToNull(lookup.domain);
  const companyName = emptyToNull(lookup.companyName);

  try {
    let best: ApolloContact | null = null;

    if (email) {
      const byEmail = await matchOnce(new URLSearchParams({ email }), apiKey);
      if (byEmail && isSubstantial(byEmail)) return byEmail;
      best = byEmail;
    }

    // `domain` avant `organization_name` : un domaine est sans ambiguïté là
    // où un nom d'entreprise peut correspondre à plusieurs sociétés. Mais si
    // l'adresse saisie est fausse, son domaine l'est aussi — d'où le repli
    // sur le nom d'entreprise du brief, qui lui est fiable.
    if (name && (domain || companyName)) {
      const query = new URLSearchParams({ name });
      if (domain) query.set("domain", domain);
      else query.set("organization_name", companyName!);
      const byName = await matchOnce(query, apiKey);
      if (byName && isSubstantial(byName)) return byName;

      // Domaine issu d'une adresse erronée : on retente avec le nom de
      // l'entreprise, seul critère qui reste fiable.
      if (domain && companyName) {
        const byCompany = await matchOnce(
          new URLSearchParams({ name, organization_name: companyName }),
          apiKey
        );
        if (byCompany && isSubstantial(byCompany)) return byCompany;
        best = best ?? byCompany;
      }

      best = best ?? byName;
    }

    // Rien de substantiel : on rend le peu qu'on a plutôt que rien.
    return best;
  } catch (err) {
    reportWarning("apollo.enrich", err, { hasEmail: !!email, hasName: !!name });
    return null;
  }
}
