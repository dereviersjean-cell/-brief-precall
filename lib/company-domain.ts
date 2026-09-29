// Domaines de messagerie personnelle : ils n'identifient AUCUNE entreprise.
// Extrait de app/brief/BriefToolClient.tsx, où la liste vivait en double
// usage — deviner une société d'un côté, identifier un contact de l'autre
// (cf. la correction du 21/08/2026). Ici elle ne sert qu'au premier besoin.
export const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr",
  "outlook.com", "outlook.fr", "live.com", "live.fr",
  "icloud.com", "me.com", "msn.com",
  "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net",
]);

export function companyDomainFromEmail(email: string | null | undefined): string | null {
  const domain = email?.split("@")[1]?.trim().toLowerCase();
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

// Nom d'entreprise déduit du domaine, quand la fiche n'en porte aucun.
// « lartisangroupe.com » → « Lartisangroupe ». La graphie exacte (« L'Artisan
// Groupe ») demanderait l'annuaire, soit un crédit par ligne à chaque
// affichage : hors de question sur une liste. Un domaine générique ne rend
// rien — « Gmail » ne serait pas une entreprise.
export function companyNameFromDomain(domain: string | null | undefined): string | null {
  const root = domain?.split(".")[0]?.trim();
  if (!root) return null;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

// Adresse du logo d'une entreprise, résolu côté serveur par
// app/api/company-logo : favicon du domaine, sinon vrai site trouvé par une
// recherche sur le nom. Null quand on n'a ni domaine ni nom.
export function companyLogoUrl(domain: string | null | undefined, name?: string | null): string | null {
  const params = new URLSearchParams();
  if (domain) params.set("d", domain);
  const cleanName = name?.trim();
  if (cleanName) params.set("n", cleanName);
  return params.toString() ? `/api/company-logo?${params.toString()}` : null;
}
