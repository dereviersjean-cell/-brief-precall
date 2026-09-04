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
  // Photo de profil. Souvent une URL LinkedIn SIGNÉE, qui répond 400 hors de
  // leur contexte (vérifié le 04/09/2026, y compris avec des en-têtes de
  // navigateur) : l'affichage doit donc toujours prévoir un repli, jamais
  // supposer qu'elle charge.
  photoUrl: string | null;
  city: string | null;
  organization: {
    name: string | null;
    // Hébergé chez Apollo (S3), accessible directement — contrairement aux
    // photos de profil.
    logoUrl: string | null;
    industry: string | null;
    employees: number | null;
  } | null;
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
// Version courte + ton, pour la pastille de la fiche contact. C'est
// l'information la plus actionnable avant un appel — elle mérite d'être vue
// en un coup d'œil plutôt que noyée dans la phrase de résumé.
export function seniorityBadge(
  seniority: string | null
): { label: string; tone: "success" | "info" | "neutral" } | null {
  switch (seniority) {
    case "c_suite":
    case "owner":
    case "founder":
    case "partner":
      return { label: "Décisionnaire", tone: "success" };
    case "vp":
    case "director":
      return { label: "Décisionnaire ou forte influence", tone: "success" };
    case "manager":
    case "senior":
      return { label: "Influence sur la décision", tone: "info" };
    case "entry":
    case "intern":
      return { label: "Rôle opérationnel", tone: "neutral" };
    default:
      return null;
  }
}

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
// Les faits du résumé, chacun de son côté — la phrase ci-dessous et
// l'affichage hiérarchisé de la fiche s'appuient tous les deux dessus, pour
// ne pas dériver l'un de l'autre.
export function extractContactFacts(contact: ApolloContact): {
  tenure: string | null;
  previousRole: string | null;
} {
  const current = contact.employmentHistory.find((e) => e.current) ?? contact.employmentHistory[0];
  const years = current ? yearsSince(current.startDate) : null;

  // Le poste précédent doit être dans une AUTRE entreprise : un changement de
  // titre en interne (« Co-Founder & CEO » → « Co-Founder & Chairman » chez
  // Apollo.io) ne dit rien à un commercial et occupe la seule ligne de
  // contexte disponible. Constaté sur la vraie réponse de l'API le
  // 04/09/2026, pas au jugé.
  const currentOrg = current?.organizationName ?? null;
  const previous = contact.employmentHistory.find(
    (e) => !e.current && e.organizationName && e.organizationName !== currentOrg
  );

  return {
    tenure: years ? `En poste depuis ${years}` : null,
    previousRole: previous?.organizationName
      ? `${previous.title ?? "En poste"} chez ${previous.organizationName}`
      : null,
  };
}

export function formatContactSummary(contact: ApolloContact): string {
  const parts: string[] = [];

  const label = seniorityLabel(contact.seniority);
  if (label) parts.push(label);

  if (contact.city) parts.push(`Basé à ${contact.city}`);

  const tenure = extractContactFacts(contact).tenure;
  if (tenure) parts.push(tenure);

  const previousRole = extractContactFacts(contact).previousRole;
  if (previousRole) parts.push(`Auparavant ${previousRole}`);

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
  // L'adresse SAISIE prime sur celle de l'annuaire. Première version :
  // l'inverse, au motif qu'elle corrigeait une saisie erronée — vrai sur une
  // adresse introuvable, dangereux dès que l'annuaire rattache un homonyme ou
  // une autre entité du groupe. Mesuré le 04/09/2026 : « martin.namy@scutum.fr »
  // saisi, « martin.namy@scutum-na.com » (Amérique du Nord) rendu. Écraser
  // aurait fait écrire au mauvais destinataire.
  const email = fallbackEmail ?? apollo?.email;
  // Signalée sans être imposée : au commercial de trancher.
  const alternateEmail =
    apollo?.email && apollo.email !== email ? apollo.email : null;
  const name =
    apollo?.name ??
    emptyToNull(fallback.name) ??
    (email ? deriveNameFromEmail(email) : null) ??
    email ??
    "Contact";

  const org = apollo?.organization;
  const facts = apollo ? extractContactFacts(apollo) : { tenure: null, previousRole: null };
  return {
    name,
    title: apollo?.title ?? "",
    linkedin: apollo?.linkedinUrl ?? undefined,
    email: email ?? undefined,
    alternateEmail: alternateEmail ?? undefined,
    notes: apollo ? formatContactSummary(apollo) || undefined : undefined,
    badge: (apollo && seniorityBadge(apollo.seniority)) || undefined,
    city: apollo?.city ?? undefined,
    tenure: facts.tenure ?? undefined,
    previousRole: facts.previousRole ?? undefined,
    photoUrl: apollo?.photoUrl ?? undefined,
    company:
      org && (org.name || org.logoUrl || org.industry || org.employees)
        ? {
            name: org.name ?? undefined,
            logoUrl: org.logoUrl ?? undefined,
            industry: org.industry ?? undefined,
            employees: org.employees ?? undefined,
          }
        : undefined,
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
      photo_url?: string;
      city?: string;
      organization?: {
        name?: string;
        logo_url?: string;
        industry?: string;
        estimated_num_employees?: number;
      };
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
  const org = p.organization;
  const contact: ApolloContact = {
    name: emptyToNull(p.name),
    title: emptyToNull(p.title),
    seniority: emptyToNull(p.seniority),
    linkedinUrl: emptyToNull(p.linkedin_url),
    headline: emptyToNull(p.headline),
    email: emptyToNull(p.email),
    photoUrl: emptyToNull(p.photo_url),
    city: emptyToNull(p.city),
    organization: org
      ? {
          name: emptyToNull(org.name),
          logoUrl: emptyToNull(org.logo_url),
          industry: emptyToNull(org.industry),
          employees: typeof org.estimated_num_employees === "number" ? org.estimated_num_employees : null,
        }
      : null,
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
function extractDomain(websiteUrl: string | null | undefined): string | null {
  const raw = emptyToNull(websiteUrl);
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

// Résout un nom d'entreprise APPROXIMATIF vers l'entité réelle et son
// domaine. C'est la pièce qui rend la recherche tolérante à l'erreur
// humaine : l'utilisateur tape « Bewtr » en créant son rendez-vous, l'annuaire
// connaît « BE WTR », et sans cette étape la recherche de contact échouait en
// silence sur ce seul écart d'orthographe (constaté le 04/09/2026).
//
// Le domaine récupéré est un bien meilleur critère que n'importe quelle
// graphie du nom : « Gautier Richard » + `bewtr.com` rend le profil complet.
async function resolveOrganization(
  query: string,
  apiKey: string
): Promise<{ name: string | null; domain: string | null } | null> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/mixed_companies/search?q_organization_name=${encodeURIComponent(query)}&per_page=1`,
    apiKey
  );
  if (!res.ok) {
    reportWarning("apollo.resolveOrg", new Error(`Apollo mixed_companies/search HTTP ${res.status}`), {
      status: res.status,
    });
    return null;
  }

  const data = (await res.json()) as {
    organizations?: Array<{ name?: string; website_url?: string }>;
    accounts?: Array<{ name?: string; website_url?: string }>;
  };
  const org = data.organizations?.[0] ?? data.accounts?.[0];
  if (!org) return null;

  const resolved = { name: emptyToNull(org.name), domain: extractDomain(org.website_url) };
  return resolved.name || resolved.domain ? resolved : null;
}

// Le POSTE est ce qui fait l'intérêt de la fiche pour un commercial : c'est
// lui qui dit à qui il parle. Tant qu'on ne l'a pas, ça vaut la peine de
// continuer à chercher.
//
// Première version : on s'arrêtait dès qu'un résultat portait un nom, un
// LinkedIn OU une ligne d'historique. Trop laxiste — sur une graphie
// d'entreprise approximative, Apollo renvoie un profil avec le nom et une
// ligne d'historique mais SANS poste, ce qui suffisait à interrompre la
// cascade juste avant l'étape qui, elle, rendait le profil complet. Mesuré le
// 04/09/2026 sur « Gautier Richard » + « Bewtr ».
function isGoodEnough(contact: ApolloContact): boolean {
  return !!contact.title;
}

// À défaut de profil complet, on retient le plus riche des candidats plutôt
// que le premier venu.
function contactScore(contact: ApolloContact): number {
  return (
    (contact.title ? 3 : 0) +
    (contact.linkedinUrl ? 2 : 0) +
    (contact.employmentHistory.length > 0 ? 1 : 0) +
    (contact.email ? 1 : 0)
  );
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
    // Retient le meilleur candidat croisé jusqu'ici, et dit s'il est assez
    // complet pour arrêter la recherche.
    const consider = (candidate: ApolloContact | null): boolean => {
      if (!candidate) return false;
      if (!best || contactScore(candidate) > contactScore(best)) best = candidate;
      return isGoodEnough(candidate);
    };

    if (email && consider(await matchOnce(new URLSearchParams({ email }), apiKey))) return best;

    if (!name) return best;

    // 1) Le domaine de l'adresse saisie, quand il y en a une. Sans ambiguïté
    //    — sauf si l'adresse est justement fausse, d'où les reprises suivantes.
    if (domain && consider(await matchOnce(new URLSearchParams({ name, domain }), apiKey))) {
      return best;
    }

    if (!companyName) return best;

    // 2) Le nom d'entreprise tel qu'il a été saisi. Marche quand la graphie
    //    correspond à celle de l'annuaire.
    if (
      consider(await matchOnce(new URLSearchParams({ name, organization_name: companyName }), apiKey))
    ) {
      return best;
    }

    // 3) La reprise qui rattrape l'erreur humaine sans que personne n'ait à
    //    s'en apercevoir : on résout la graphie approximative vers l'entité
    //    réelle (« Bewtr » → « BE WTR » / bewtr.com) et on retente avec son
    //    domaine, puis avec son nom canonique.
    const org = await resolveOrganization(companyName, apiKey);
    if (org) {
      if (
        org.domain &&
        org.domain !== domain &&
        consider(await matchOnce(new URLSearchParams({ name, domain: org.domain }), apiKey))
      ) {
        return best;
      }
      if (
        org.name &&
        org.name !== companyName &&
        consider(await matchOnce(new URLSearchParams({ name, organization_name: org.name }), apiKey))
      ) {
        return best;
      }
    }

    // Aucun profil complet : on rend le plus riche des candidats plutôt que
    // rien.
    return best;
  } catch (err) {
    reportWarning("apollo.enrich", err, { hasEmail: !!email, hasName: !!name });
    return null;
  }
}
