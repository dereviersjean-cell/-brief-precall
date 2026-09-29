// Règles pures de la recherche de logo (app/api/company-logo/route.ts),
// sans dépendance pour être testées.

// Un nom d'hôte public ordinaire : lettres, chiffres, tirets, au moins un
// point, extension alphabétique. Écarte les adresses IP, « localhost » et tout
// ce qui ferait interroger par le serveur autre chose qu'un site public.
export function isPublicHostname(host: string): boolean {
  if (host.length < 4 || host.length > 253) return false;
  if (!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(host)) return false;
  return !/^(localhost|.*\.local|.*\.internal)$/.test(host);
}

// Mots qui ne désignent pas une entreprise en particulier.
const GENERIC_WORDS = new Set([
  "groupe", "group", "sas", "sarl", "sasu", "sa", "eurl", "france", "the", "et", "and", "de", "du", "la", "le", "les", "des",
  "north", "america", "europe", "international", "holding", "company", "compagnie", "societe", "cabinet", "agence",
]);

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Le site trouvé par la recherche est-il bien celui de l'entreprise ? Son
// domaine doit contenir le nom (ses mots significatifs, ou le nom accolé) :
// « Scutum » → scutum.fr oui, societe.com ou linkedin.com non. Mieux vaut
// l'initiale que le logo d'une autre société.
export function hostMatchesCompanyName(host: string, name: string): boolean {
  const labels = host.replace(/^www\./, "").split(".");
  const root = labels.slice(0, -1).join("").replace(/[^a-z0-9]/g, "");
  if (!root) return false;
  const words = normalize(name)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
  if (words.length === 0) return false;
  if (root.includes(words.join(""))) return true;
  return words.some((w) => w.length >= 4 && root.includes(w)) && root.length <= words.join("").length + 12;
}

// Domaines plausibles d'après le seul nom, quand la recherche web n'a rien
// donné (ou n'est pas configurée) : « Scutum » → scutum.fr, scutum.com ;
// « BE WTR » → bewtr.fr, bewtr.com, be-wtr.fr, be-wtr.com. Seuls ceux qui ont
// réellement un logo sont retenus par l'appelant.
export function guessHostsFromName(name: string): string[] {
  const tokens = normalize(name)
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !GENERIC_WORDS.has(w));
  if (tokens.length === 0) return [];
  const roots = [...new Set([tokens.join(""), tokens.join("-")])].filter((r) => r.length >= 3 && r.length <= 40);
  return roots.flatMap((root) => [`${root}.fr`, `${root}.com`]).filter(isPublicHostname);
}
