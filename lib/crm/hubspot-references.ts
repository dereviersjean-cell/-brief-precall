// Construire une référence client à partir d'un deal gagné HubSpot.
// Volontairement SANS import : testable sans variables d'environnement
// (tests/hubspot-references.test.ts).
//
// ⚠ Pourquoi l'entreprise associée (25/11/2026) : un deal gagné ne porte
// presque rien. Sur le portail d'Oliverlist, 1 451 deals gagnés dont 5
// seulement ont un montant, aucun n'a de description. Importés tels quels, les
// 500 premiers ont donné 500 lignes « Secteur et taille non renseignés », et
// surtout un embedding calculé sur le seul nom du deal — donc des références
// qu'aucun brief ne retrouvera jamais. Tout ce qui est utile est sur
// l'entreprise liée : secteur (80 % remplis), effectif (89 %), description
// (88 %), ville et pays.

export type WonDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  closedate: string | null;
};

export type WonDealCompany = {
  name: string | null;
  industry: string | null;
  numberofemployees: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  annualrevenue: string | null;
};

export type BuiltReference = {
  client_name: string | null;
  sector: string | null;
  company_size: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
  raw_text: string | null;
  source: string;
};

/** « COMPUTER_SOFTWARE » → « Computer software ». HubSpot rend ce champ comme
 *  une énumération en anglais, héritée de la vieille liste LinkedIn ; la
 *  traduire demanderait une table de 150 entrées à tenir à jour. Lisible vaut
 *  mieux que criard. */
export function humanIndustry(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const words = value.replace(/_/g, " ").toLowerCase().trim();
  if (!words) return null;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** « 5 » → « 5 salariés ». Une valeur non numérique est rendue telle quelle
 *  (certains portails y écrivent « 11-50 »), le vide reste vide. */
export function companySize(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return `${Math.round(n)} salarié${Math.round(n) > 1 ? "s" : ""}`;
  return value;
}

export function formatAmount(amount: string | null | undefined): string | null {
  if (!amount) return null;
  const num = parseFloat(amount);
  if (!Number.isFinite(num) || num === 0) return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(num);
}

/**
 * La référence enregistrée. `raw_text` porte ce qu'un commercial lirait, et
 * c'est aussi, avec le secteur et l'effectif, ce qui nourrit l'embedding :
 * sans la description de l'entreprise, la recherche par similarité n'a rien
 * à mordre.
 */
export function buildReference(deal: WonDeal, company: WonDealCompany | null): BuiltReference {
  const sector = humanIndustry(company?.industry);
  const size = companySize(company?.numberofemployees);
  const result = formatAmount(deal.amount);
  const place = [company?.city, company?.country].map((v) => (v ?? "").trim()).filter(Boolean).join(", ");

  // Ni secteur ni taille ici : ils ont leur colonne, qui part déjà dans
  // l'embedding et dans la ligne donnée au modèle. Les répéter ne faisait que
  // doubler le texte (constaté le 25/11/2026 sur un brief réel).
  const parts = [
    company?.description?.trim() || null,
    place ? `Localisation : ${place}` : null,
    result ? `Montant : ${result}` : null,
    deal.closedate ? `Signé le : ${deal.closedate.slice(0, 10)}` : null,
  ].filter(Boolean);

  return {
    client_name: company?.name?.trim() || deal.dealname,
    sector,
    company_size: size,
    problem: null,
    solution: null,
    result,
    raw_text: parts.join(" — ") || null,
    source: "hubspot",
  };
}
