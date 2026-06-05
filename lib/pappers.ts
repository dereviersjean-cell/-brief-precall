export type PappersDirecteur = {
  nom?: string;
  prenom?: string;
  titre?: string;
  date_prise_de_poste?: string;
};

export type PappersData = {
  siren: string;
  denomination?: string;
  date_creation?: string;
  forme_juridique?: string;
  siege_ville?: string;
  tranche_effectif?: string;
  capital?: number;
  code_naf?: string;
  libelle_code_naf?: string;
  derniers_statuts?: unknown;
  dirigeants: PappersDirecteur[];
};

const BASE_URL = "https://api.pappers.fr/v2";

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function enrichWithPappers(companyName: string): Promise<PappersData | null> {
  const token = process.env.PAPPERS_API_KEY;
  if (!token) return null;

  try {
    // 1 — Trouver le SIREN
    const searchRes = await fetchWithTimeout(
      `${BASE_URL}/recherche?q=${encodeURIComponent(companyName)}&nombre=1&api_token=${token}`
    );
    if (!searchRes.ok) return null;

    const searchJson = await searchRes.json();
    const results = searchJson.resultats as Array<{ siren?: string }> | undefined;
    if (!results?.length || !results[0].siren) return null;

    const siren = results[0].siren;

    // 2 — Données entreprise
    const companyRes = await fetchWithTimeout(
      `${BASE_URL}/entreprise?siren=${siren}&api_token=${token}`
    );
    if (!companyRes.ok) return null;

    const company = await companyRes.json();

    // 3 — Dirigeants actuels (best-effort : ne fait pas échouer le reste)
    let dirigeants: PappersDirecteur[] = [];
    try {
      const dirsRes = await fetchWithTimeout(
        `${BASE_URL}/entreprise/dirigeants?siren=${siren}&api_token=${token}`
      );
      if (dirsRes.ok) {
        const dirsJson = await dirsRes.json();
        const raw: Record<string, unknown>[] = dirsJson.dirigeants ?? [];
        dirigeants = raw
          .filter((d) => !d.date_fin)
          .map((d) => ({
            nom: d.nom as string | undefined,
            prenom: d.prenom as string | undefined,
            titre: d.titre as string | undefined,
            date_prise_de_poste: d.date_prise_de_poste as string | undefined,
          }));
      }
    } catch {
      // dirigeants optionnels — on continue sans
    }

    return {
      siren,
      denomination: company.denomination,
      date_creation: company.date_creation,
      forme_juridique: company.forme_juridique,
      siege_ville: company.siege?.ville,
      tranche_effectif: company.tranche_effectif,
      capital: company.capital,
      code_naf: company.code_naf,
      libelle_code_naf: company.libelle_code_naf,
      derniers_statuts: company.derniers_statuts,
      dirigeants,
    };
  } catch {
    return null;
  }
}
