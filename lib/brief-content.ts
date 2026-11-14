import type { Brief, BriefFollowUp, BriefReference, Contact, NewsItem } from "@/lib/types";
import { cleanMeetingContext } from "@/lib/meeting-origin";

// Le contenu stocké dans `briefs.content` suit la forme renvoyée par le
// modèle (clés françaises), pas le type Brief de l'interface. Cette
// conversion vivait dans app/brief/[id]/page.tsx ; elle est partagée depuis
// que la route d'export PDF lit les mêmes lignes. Deux copies auraient
// silencieusement divergé — l'écran et le PDF n'auraient plus montré la même
// chose, et c'est exactement le genre d'écart qu'on ne remarque qu'une fois
// le PDF envoyé à un prospect.
type StoredBrief = {
  overview?: string;
  accroche?: string;
  entreprise?: { clients?: string; chiffres_cles?: string[]; actualite?: string };
  pain_points?: Array<{ title: string; detail: string; question?: string }>;
  arguments?: Array<{ title: string; detail: string }>;
  vocabulaire?: string[];
  actualites?: NewsItem[];
  references?: BriefReference[];
  historique_relationnel?: string;
  contact?: Contact;
  meeting_context?: unknown;
  suite?: {
    pour_ouvrir?: string;
    rappel?: string;
    priorites?: Array<{ title?: string; manque?: string; pourquoi?: string; question?: string }>;
    prochaine_etape?: string;
    preuves?: Array<{ frein?: string; reponse?: string }>;
    engagements?: { nous?: string[]; prospect?: string[] };
  };
};

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const texts = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

function adaptFollowUp(suite: StoredBrief["suite"]): BriefFollowUp | undefined {
  if (!suite || typeof suite !== "object") return undefined;
  const priorities = (Array.isArray(suite.priorites) ? suite.priorites : [])
    .map((p) => ({ title: text(p?.title), missing: text(p?.manque), why: text(p?.pourquoi), question: text(p?.question) }))
    .filter((p) => p.title);
  if (priorities.length === 0) return undefined;
  const ours = texts(suite.engagements?.nous);
  const theirs = texts(suite.engagements?.prospect);
  return {
    opening: text(suite.pour_ouvrir) || undefined,
    recap: text(suite.rappel) || undefined,
    priorities,
    nextStep: text(suite.prochaine_etape) || undefined,
    proofs: (Array.isArray(suite.preuves) ? suite.preuves : [])
      .map((p) => ({ blocker: text(p?.frein), answer: text(p?.reponse) }))
      .filter((p) => p.blocker && p.answer),
    commitments: ours.length > 0 || theirs.length > 0 ? { ours, theirs } : undefined,
  };
}

// La seule conversion du contenu enregistré (ou renvoyé par l'API) vers le
// type de l'écran : la page, le composant client et le PDF passent tous par
// ici.
export function adaptCachedContent(content: unknown): Brief {
  const api = (content ?? {}) as StoredBrief;
  const company = api.entreprise
    ? { clients: text(api.entreprise.clients) || undefined, keyFigures: texts(api.entreprise.chiffres_cles), news: text(api.entreprise.actualite) || undefined }
    : undefined;
  return {
    companyOverview: api.overview ?? "",
    suggestedOpeningLine: api.accroche ?? "",
    painPoints: api.pain_points ?? [],
    talkingPoints: api.arguments ?? [],
    recentNews: [],
    objectives: [],
    keywords: api.vocabulaire ?? [],
    actualites: api.actualites,
    contact: api.contact,
    references: api.references,
    historiqueRelationnel: api.historique_relationnel,
    company,
    meetingContext: cleanMeetingContext(api.meeting_context) ?? undefined,
    followUp: adaptFollowUp(api.suite),
  };
}
