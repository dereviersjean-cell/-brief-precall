import { companyDomainFromEmail } from "./company-domain";

// Deal Execution, étape 2 (27/10/2026) : à quel deal rattacher un call, tant
// que HubSpot n'est pas branché (étape 3, où l'identifiant du deal HubSpot
// prendra le relais).
//
// Deux repères, du plus sûr au moins sûr :
//  · le domaine de l'email du prospect — sans ambiguïté, mais absent des
//    calls importés à la main et sans objet pour une adresse personnelle ;
//  · le nom de l'entreprise, normalisé — « Vasco/Gamma » et « vasco gamma »
//    désignent le même deal, mais deux graphies vraiment différentes
//    (« Velbrun » / « Velbrun Capital ») ne se rejoignent pas.
// Un deal garde les deux : un premier call rattaché par le domaine et un
// second importé avec le seul nom se retrouvent donc dès que l'un des deux
// repères correspond.

export type DealIdentity = { domain: string | null; nameKey: string | null; name: string | null };

// Formes juridiques et mots qui ne distinguent pas une entreprise d'une autre.
const NOISE_WORDS = new Set(["sas", "sasu", "sarl", "eurl", "sa", "sci", "snc", "ltd", "inc", "gmbh", "the", "le", "la", "les"]);

export function normalizeCompanyName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const words = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !NOISE_WORDS.has(w));
  return words.length > 0 ? words.join(" ") : null;
}

export function dealIdentityFor(input: {
  contactEmail: string | null;
  prospectCompany: string | null;
  companyName: string | null;
  // Domaines de l'équipe commerciale elle-même : un call interne ou un test
  // envoyé à sa propre adresse ne doit pas devenir un deal.
  ownDomains: string[];
}): DealIdentity | null {
  const emailDomain = companyDomainFromEmail(input.contactEmail);
  const domain = emailDomain && !input.ownDomains.includes(emailDomain) ? emailDomain : null;
  const name = input.prospectCompany?.trim() || input.companyName?.trim() || null;
  const nameKey = normalizeCompanyName(name);
  if (!domain && !nameKey) return null;
  return { domain, nameKey, name };
}
