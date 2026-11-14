export type Contact = {
  name: string;
  title: string;
  linkedin?: string;
  email?: string;
  // Le résumé en une phrase. CONSERVÉ alors que les champs ci-dessous le
  // décomposent : les fiches déjà enregistrées ne portent que lui, et
  // l'affichage doit rester lisible pour elles sans reprise de données.
  notes?: string;
  // Décomposition du résumé, pour un affichage hiérarchisé plutôt qu'une
  // phrase dense à déchiffrer.
  // Adresse connue de l'annuaire quand elle DIFFÈRE de celle saisie. On ne
  // remplace jamais la seconde : elle vient de première main, alors que
  // l'annuaire peut avoir rattaché un homonyme ou une autre entité du groupe.
  alternateEmail?: string;
  badge?: { label: string; tone: "success" | "info" | "neutral" };
  city?: string;
  tenure?: string;
  previousRole?: string;
  // Souvent une URL LinkedIn signée qui ne charge pas hors de leur site :
  // l'affichage doit toujours prévoir un repli sur les initiales.
  photoUrl?: string;
  // L'employeur tel que l'annuaire le connaît — sa graphie fait autorité sur
  // celle saisie à la création du rendez-vous (« BE WTR » vs « Bewtr »).
  company?: {
    name?: string;
    logoUrl?: string;
    industry?: string;
    employees?: number;
  };
};

export type TalkingPoint = {
  title: string;
  detail: string;
  // La question à poser (briefs du 14/11/2026 et après). Avant, elle était
  // écrite à la fin de `detail` (« … Question : … »).
  question?: string;
};

// Niveau d'une référence client (retours d'Hubert, 13/11/2026) : le nom d'un
// client comparable, un cas d'usage (problème et solution), ou une preuve
// chiffrée. Calculé par le serveur d'après la fiche, jamais par le modèle.
export type ReferenceLevel = "simple" | "cas_usage" | "roi";

export type BriefReference = { client_name: string; relevance: string; pitch: string; level?: ReferenceLevel };

// Brief d'un R2 ou plus (retours d'Hubert, 12/11/2026) : où on en est, ce
// qu'il faut obtenir au prochain rendez-vous, de quoi convaincre.
export type BriefFollowUp = {
  opening?: string;
  recap?: string;
  priorities: Array<{ title: string; missing: string; why: string; question: string }>;
  nextStep?: string;
  proofs: Array<{ blocker: string; answer: string }>;
  commitments?: { ours: string[]; theirs: string[] };
};

export type Meeting = {
  id: string;
  date: string; // ISO string
  duration: number; // minutes
  company: string;
  // Titre de l'événement d'agenda. Sert UNIQUEMENT à l'affichage : la
  // génération continue de s'appuyer sur `company`, qui alimente Pappers, les
  // actualités et la recherche d'entreprise. Absent sur les briefs enregistrés
  // avant la migration 010.
  title?: string;
  companyLogo?: string;
  industry: string;
  website?: string;
  contacts: Contact[];
  status: "upcoming" | "completed" | "cancelled";
  brief?: Brief;
};

export type NewsItem = {
  titre: string;
  description: string;
  url: string;
  source: string;
  date: string | null;
};

export type Brief = {
  companyOverview: string;
  revenue?: string;
  employees?: string;
  recentNews: string[];
  painPoints: TalkingPoint[];
  talkingPoints: TalkingPoint[];
  objectives: string[];
  competitorsUsed?: string[];
  suggestedOpeningLine?: string;
  keywords?: string[];
  actualites?: NewsItem[];
  references?: BriefReference[];
  historiqueRelationnel?: string;
  // L'entreprise en puces (activité = companyOverview). Absent des briefs
  // d'avant le 14/11/2026, qui n'ont que le paragraphe.
  company?: { clients?: string; keyFigures?: string[]; news?: string };
  // Pourquoi le prospect a accepté le rendez-vous : saisi par le commercial
  // tant que Brief ne le lit pas dans HubSpot.
  meetingContext?: { origin?: string; note?: string };
  followUp?: BriefFollowUp;
  // Contact enrichi via Apollo (lib/apollo.ts) — absent si pas de contactEmail,
  // pas de clé APOLLO_API_KEY configurée, ou contact introuvable dans leur
  // base. `notes` porte l'évaluation "décisionnaire probable" (déterministe,
  // dérivée du seniority Apollo — jamais devinée par l'IA) et un résumé de
  // carrière court.
  contact?: Contact;
};
