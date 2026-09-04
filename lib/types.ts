export type Contact = {
  name: string;
  title: string;
  linkedin?: string;
  email?: string;
  notes?: string;
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
  references?: Array<{ client_name: string; relevance: string; pitch: string }>;
  historiqueRelationnel?: string;
  // Contact enrichi via Apollo (lib/apollo.ts) — absent si pas de contactEmail,
  // pas de clé APOLLO_API_KEY configurée, ou contact introuvable dans leur
  // base. `notes` porte l'évaluation "décisionnaire probable" (déterministe,
  // dérivée du seniority Apollo — jamais devinée par l'IA) et un résumé de
  // carrière court.
  contact?: Contact;
};
