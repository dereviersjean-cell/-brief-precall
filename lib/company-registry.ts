// Fiche d'identité d'une entreprise française, lue dans l'annuaire public de
// l'État (recherche-entreprises.api.gouv.fr : gratuit, sans clé, données du
// registre). Sert la fiche affichée à l'inscription (14/10/2026, demande de
// Jean) : date de création, dirigeant, ville, effectif. Pas d'IA ici — ce
// sont des faits, on les recopie.
//
// Jamais la date de naissance d'un dirigeant, que l'API fournit : elle n'a
// rien à faire sur un écran d'inscription.

export type RegistryCompany = {
  legalName: string;
  siren: string;
  foundedOn: string | null; // AAAA-MM-JJ
  city: string | null;
  leader: string | null; // « Stanislas Niox-Chateau »
  leaderRole: string | null; // « Président de SAS »
  headcount: string | null; // « 10 à 19 salariés »
};

const HEADCOUNT: Record<string, string> = {
  NN: "Pas de salarié déclaré",
  "00": "Pas de salarié",
  "01": "1 ou 2 salariés",
  "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",
  "11": "10 à 19 salariés",
  "12": "20 à 49 salariés",
  "21": "50 à 99 salariés",
  "22": "100 à 199 salariés",
  "31": "200 à 249 salariés",
  "32": "250 à 499 salariés",
  "41": "500 à 999 salariés",
  "42": "1 000 à 1 999 salariés",
  "51": "2 000 à 4 999 salariés",
  "52": "5 000 à 9 999 salariés",
  "53": "Plus de 10 000 salariés",
};

type ApiLeader = {
  type_dirigeant?: string;
  nom?: string;
  prenoms?: string;
  denomination?: string;
  qualite?: string;
};

type ApiResult = {
  nom_complet?: string;
  siren?: string;
  date_creation?: string | null;
  tranche_effectif_salarie?: string | null;
  siege?: { libelle_commune?: string | null; code_postal?: string | null };
  dirigeants?: ApiLeader[];
};

export function normalizeCompanyName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(sas|sasu|sarl|sa|eurl|sci|snc)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/([\s-])/)
    .map((part) => (part.length > 1 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("");
}

// Le dirigeant à afficher : la personne à la tête (présidence, gérance,
// direction générale) plutôt qu'un commissaire aux comptes ; une société
// présidente à défaut.
export function pickLeader(leaders: ApiLeader[]): { name: string; role: string | null } | null {
  const heads = leaders.filter((l) => /pr[ée]sident|g[ée]rant|directeur g[ée]n[ée]ral/i.test(l.qualite ?? ""));
  const person = heads.find((l) => l.type_dirigeant === "personne physique" && l.nom);
  if (person) {
    const first = (person.prenoms ?? "").trim().split(/\s+/)[0] ?? "";
    return { name: titleCase(`${first} ${person.nom}`.trim()), role: person.qualite ?? null };
  }
  const company = heads.find((l) => l.denomination);
  return company ? { name: titleCase(company.denomination as string), role: company.qualite ?? null } : null;
}

export function toRegistryCompany(result: ApiResult): RegistryCompany | null {
  if (!result.nom_complet || !result.siren) return null;
  const leader = pickLeader(result.dirigeants ?? []);
  const city = result.siege?.libelle_commune ? titleCase(result.siege.libelle_commune) : null;
  const arrondissement = result.siege?.code_postal?.match(/^75(0\d\d)$/)?.[1];
  return {
    legalName: titleCase(result.nom_complet),
    siren: result.siren,
    foundedOn: result.date_creation ?? null,
    city: city && arrondissement ? `${city} ${Number(arrondissement)}e` : city,
    leader: leader?.name ?? null,
    leaderRole: leader?.role ?? null,
    headcount: result.tranche_effectif_salarie ? HEADCOUNT[result.tranche_effectif_salarie] ?? null : null,
  };
}

// Le premier résultat n'est retenu que si son nom correspond vraiment à celui
// saisi : mieux vaut pas de fiche qu'une fiche d'un homonyme.
export async function lookupCompanyRegistry(name: string): Promise<RegistryCompany | null> {
  const wanted = normalizeCompanyName(name);
  if (wanted.length < 2) return null;
  const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(name)}&page=1&per_page=3&etat_administratif=A`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: ApiResult[] };
  const match = (data.results ?? []).find((r) => r.nom_complet && normalizeCompanyName(r.nom_complet) === wanted);
  return match ? toRegistryCompany(match) : null;
}
