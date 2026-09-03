import type { Brief, Contact, NewsItem } from "@/lib/types";

// Le contenu stocké dans `briefs.content` suit la forme renvoyée par le
// modèle (clés françaises), pas le type Brief de l'interface. Cette
// conversion vivait dans app/brief/[id]/page.tsx ; elle est partagée depuis
// que la route d'export PDF lit les mêmes lignes. Deux copies auraient
// silencieusement divergé — l'écran et le PDF n'auraient plus montré la même
// chose, et c'est exactement le genre d'écart qu'on ne remarque qu'une fois
// le PDF envoyé à un prospect.
export function adaptCachedContent(content: unknown): Brief {
  const api = content as {
    overview?: string;
    accroche?: string;
    pain_points?: Array<{ title: string; detail: string }>;
    arguments?: Array<{ title: string; detail: string }>;
    vocabulaire?: string[];
    actualites?: NewsItem[];
    contact?: Contact;
  };
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
  };
}
