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

// Logo d'entreprise déduit du domaine, via le service de favicons de Google.
//
// Pourquoi celui-ci : gratuit, sans clé, sans quota — donc utilisable sur une
// LISTE, là où résoudre chaque entreprise via l'annuaire coûterait un appel
// et un crédit par ligne à chaque affichage. Clearbit, l'autre candidat
// habituel, ne répond plus depuis son rachat (vérifié le 04/09/2026).
//
// Contrepartie à connaître : le domaine du prospect transite par Google
// depuis le navigateur. Ce sont des domaines publics, mais ce n'est pas rien
// sur une application qui manipule des données commerciales.
export function companyLogoUrlFromDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}
