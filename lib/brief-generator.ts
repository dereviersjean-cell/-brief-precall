import Anthropic from "@anthropic-ai/sdk";
import type { AdminConfig } from "./admin-config";
import type { NewsArticle } from "./news";
import { findSimilarReferencesForUsers } from "./embeddings";
import type { SimilarReference } from "./embeddings";
import { getContact, getEnabledModulesForUser, getOrganizationUserIds } from "./db";
import { enrichFromCRM } from "./crm/enrichment";
import type { CrmEnrichment } from "./crm/enrichment";
import { extractJsonObject } from "./ai-json";
import { seniorityLabel, type ApolloContact } from "./apollo";
import { reportError, reportWarning } from "./monitoring";
import { hasRealValue } from "./reference-quality";
import type { ReferenceLevel } from "./types";
import type { MeetingContext } from "./meeting-origin";

const client = new Anthropic();

// Modèle de secours quand le modèle configuré refuse de répondre
// (stop_reason « refusal », ses classifieurs de sécurité peuvent se tromper
// sur un contenu anodin). Sonnet 4.6 : génération précédente, sans ces
// classifieurs, compatible avec la même recherche web.
const FALLBACK_MODEL = "claude-sonnet-4-6";

// Modèles dont on règle le niveau de réflexion (output_config.effort). Sur
// Sonnet 5.5 et Opus 5.5 la réflexion est toujours active ; l'effort est le
// seul réglage, et il pèse directement sur la durée et le coût d'un brief.
const EFFORT_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5"]);

// Une recherche web longue peut rendre la main en cours de route
// (stop_reason « pause_turn ») : on renvoie la réponse telle quelle pour
// que le modèle reprenne, dans cette limite.
const MAX_PAUSE_RESUMES = 3;

const TONE_INSTRUCTION: Record<AdminConfig["tone"], string> = {
  formel: "Utilise un registre formel et soutenu.",
  professionnel: "Utilise un registre professionnel et accessible.",
  direct: "Sois direct et concis, va droit au but, évite le jargon.",
};

export type UserContext = {
  product_description: string | null;
  icp: string | null;
  sector: string | null;
} | null;

function buildCrmBlock(crm: CrmEnrichment | null): string {
  if (!crm) return "";
  const lines: string[] = [`- Entreprise trouvée dans votre CRM (${crm.source}) : ${crm.company_name}`];
  if (crm.deals_count > 0) lines.push(`- Deals enregistrés : ${crm.deals_count}`);
  if (crm.latest_deal_title) {
    const valueStr = crm.latest_deal_value ? ` — ${crm.latest_deal_value}` : "";
    lines.push(`- Dernier deal : ${crm.latest_deal_title}${valueStr}`);
  }
  if (crm.contact_name) {
    const emailStr = crm.contact_email ? ` (${crm.contact_email})` : "";
    lines.push(`- Interlocuteur connu : ${crm.contact_name}${emailStr}`);
  }
  return `\nDONNÉES CRM\n\n${lines.join("\n")}\n\nUtilise ces informations CRM pour personnaliser l'accroche et les arguments — mentionne la relation existante ou l'historique commercial si pertinent.\n`;
}

// Contexte pour PERSONNALISER l'accroche et les arguments au rôle de la
// personne réellement en face (un CTO et un VP Sales n'ont pas les mêmes
// préoccupations) — les champs factuels du contact (poste, ancienneté,
// LinkedIn) ne sont PAS demandés dans le JSON en retour : ils sont
// attachés à la réponse côté serveur après coup (route generate-brief),
// directement depuis les données Apollo, pour ne jamais dépendre de la
// fidélité d'une recopie par le modèle.
function buildContactBlock(contact: ApolloContact | null): string {
  if (!contact || (!contact.title && !contact.headline)) return "";
  const lines: string[] = [];
  if (contact.name) lines.push(`- Nom : ${contact.name}`);
  if (contact.title) lines.push(`- Poste : ${contact.title}`);
  const label = seniorityLabel(contact.seniority);
  if (label) lines.push(`- Niveau de séniorité : ${label}`);
  if (contact.headline) lines.push(`- Résumé LinkedIn : ${contact.headline}`);
  return `\nCONTACT QUI SERA EN FACE DU COMMERCIAL\n\n${lines.join("\n")}\n\nPersonnalise l'accroche et les arguments en fonction du rôle de cette personne (ses préoccupations probables selon son poste), sans jamais inventer de détail sur elle qui ne figure pas ci-dessus.\n`;
}

// Une référence candidate telle qu'on la donne au modèle : les « Unknown » et
// « Non spécifié » de la base sont retirés, sinon il les recopie à l'oral.
function referenceLine(r: SimilarReference): string {
  const parts = [
    hasRealValue(r.problem) ? `Problème : ${r.problem}` : null,
    hasRealValue(r.solution) ? `Ce qui a été fait : ${r.solution}` : null,
    hasRealValue(r.result) ? `Résultat : ${r.result}` : null,
  ].filter(Boolean);
  const who = [r.sector, hasRealValue(r.company_size) ? r.company_size : null].filter(Boolean).join(", ");
  return `- ${r.client_name ?? "Client"}${who ? ` (${who})` : ""}${parts.length > 0 ? ` — ${parts.join(" — ")}` : " — aucun détail en base"}`;
}

// Niveau d'une référence d'après sa fiche (retours d'Hubert, 13/11/2026).
export function referenceLevel(r: Pick<SimilarReference, "problem" | "solution" | "result">): ReferenceLevel {
  if (hasRealValue(r.result)) return "roi";
  if (hasRealValue(r.problem) && hasRealValue(r.solution)) return "cas_usage";
  return "simple";
}

const sameName = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

// Deux références au plus, chacune avec le niveau de sa fiche. Une référence
// que le modèle aurait inventée (nom absent des candidates) est écartée.
function attachReferenceLevels(brief: unknown, candidates: SimilarReference[]): unknown {
  if (!brief || typeof brief !== "object") return brief;
  const raw = (brief as { references?: unknown }).references;
  if (!Array.isArray(raw)) return brief;
  const references = raw
    .map((r) => {
      const ref = r as { client_name?: string; relevance?: string; pitch?: string };
      const source = candidates.find((c) => sameName(c.client_name, ref.client_name));
      return source && ref.pitch ? { client_name: source.client_name as string, relevance: ref.relevance ?? "", pitch: ref.pitch, level: referenceLevel(source) } : null;
    })
    .filter(Boolean)
    .slice(0, 2);
  return { ...(brief as Record<string, unknown>), references };
}

function buildUserPrompt(
  company: string,
  legalContext: string,
  newsContext: string,
  config: AdminConfig,
  userContext: UserContext,
  similarRefs: SimilarReference[] = [],
  relationalHistoryBlock = "",
  crmData: CrmEnrichment | null = null,
  apolloContact: ApolloContact | null = null,
  // Suite d'un deal (R2 et plus) : le brief change de forme.
  dealBlock = "",
  meetingContextBlock = ""
): string {
  const toneDesc = TONE_INSTRUCTION[config.tone];
  const isFollowUp = dealBlock.length > 0;

  const contextBlock =
    userContext &&
    (userContext.product_description || userContext.icp || userContext.sector)
      ? `\nContexte du commercial :\n${
          userContext.product_description
            ? `- Ce commercial vend : ${userContext.product_description}\n`
            : ""
        }${userContext.icp ? `- Sa cible : ${userContext.icp}\n` : ""}${
          userContext.sector ? `- Son secteur : ${userContext.sector}\n` : ""
        }`
      : "";

  const referencesBlock =
    similarRefs.length > 0
      ? `\nRéférences clients du commercial (candidates, présélectionnées par proximité : certaines n'ont aucun rapport avec ce prospect) :\n${similarRefs
          .map(referenceLine)
          .join("\n")}\n`
      : "";

  const referencesSchema =
    similarRefs.length > 0
      ? `  "references": [\n    { "client_name": "Nom exact de la candidate", "relevance": "Pourquoi ce client est comparable à ${company}, en une phrase courte", "pitch": "La phrase à dire à l'oral" }\n  ],\n`
      : "";

  const referencesConstraint =
    similarRefs.length > 0
      ? `\n- "references" : au plus 2, les plus comparables à ${company} (secteur, taille, cible de clientèle ou problème), et complémentaires entre elles. Aucune candidate comparable : "references": []. "client_name" reprend le nom exact de la candidate. "pitch" s'adapte à ce que la fiche contient : un résultat chiffré → cite-le tel quel ; un problème et ce qui a été fait, sans résultat → raconte ce cas en une phrase ; rien d'autre que le nom → dis seulement que ce client comparable fait confiance au commercial. N'invente JAMAIS un chiffre, un résultat ou un détail absent de la fiche`
      : "";

  const relationalSchema = relationalHistoryBlock
    ? `  "historique_relationnel": "Ce qu'il faut retenir de l'historique pour ce rendez-vous, en 1 ou 2 phrases",\n`
    : "";

  const crmBlock = buildCrmBlock(crmData);
  const contactBlock = buildContactBlock(apolloContact);

  const companySchema = `  "overview": "L'activité de ${company} en UNE phrase simple : ce qu'elle fait, pour qui",
  "entreprise": {
    "clients": "Ses clients ou utilisateurs, en une phrase courte",
    "chiffres_cles": ["3 au plus, chacun avec un nombre et quelques mots (effectif, année de création, volume, levée…)"],
    "actualite": "L'actualité en cours en une phrase (levée de fonds, lancement, recrutement…), ou \"\" si rien de récent"
  },`;

  const companyConstraints = `- Tout en français. ${toneDesc}
- Concis partout : chaque phrase fait 25 mots au plus, aucune formule de remplissage, aucun doublon entre les rubriques
- "overview" et "entreprise" doivent se lire en dix secondes. Uniquement des faits vérifiés (données légales, recherche web) : un chiffre incertain n'est pas écrit, et la source n'est jamais citée
- Utilise la recherche web pour ancrer le brief dans des faits récents et vérifiables sur ${company}. Si un résultat correspond clairement à ${company} (à l'orthographe, l'espacement ou la casse près), utilise-le avec confiance même si son secteur surprend — ne présuppose jamais le secteur du prospect à partir du profil du commercial. Réserve « peu d'information disponible » au cas où la recherche ne remonte VRAIMENT rien`;

  if (isFollowUp) {
    return `Prépare le brief d'un rendez-vous de SUIVI pour un commercial B2B : il a déjà échangé avec ${company} et doit faire avancer le deal.
${legalContext}${newsContext}${crmBlock}${contactBlock}${contextBlock}${referencesBlock}${relationalHistoryBlock}${dealBlock}${meetingContextBlock}
Retourne ce JSON (structure stricte, aucun texte autour). Même si tu as utilisé la recherche web, ta réponse finale doit être UNIQUEMENT le JSON ci-dessous :

{
${companySchema}
  "suite": {
    "pour_ouvrir": "Ce qu'il faut rappeler pour ouvrir le rendez-vous, en une phrase (un engagement tenu, le point où l'on s'était arrêté)",
    "rappel": "Où en sommes-nous avec ce prospect ? 2 phrases au plus",
    "priorites": [
      { "title": "Ce qu'il faut clarifier ou obtenir, en quelques mots", "manque": "Ce qui manque précisément, en une phrase", "pourquoi": "Pourquoi c'est important pour faire avancer ce deal, en une phrase", "question": "La question à poser, prête à dire" }
    ],
    "prochaine_etape": "La prochaine étape concrète à obtenir avant de raccrocher, en une phrase",
    "preuves": [
      { "frein": "Une objection ou un frein DÉJÀ exprimé par le prospect", "reponse": "Ce qui y répond concrètement, en une phrase" }
    ],
    "engagements": { "nous": ["Ce que le commercial s'est engagé à faire"], "prospect": ["Ce que le prospect s'est engagé à faire"] }
  },
${referencesSchema}${relationalSchema}}

Contraintes :
${companyConstraints}
- "priorites" : 2 ou 3, de la plus importante à la moins importante. Elles croisent ce que les rendez-vous précédents ont établi et ce qui manque encore pour faire avancer le deal. Ne repose jamais une question dont la réponse est déjà validée
- "preuves" : 3 au plus, uniquement sur des objections ou des freins réellement exprimés lors des échanges précédents. Aucun frein exprimé : "preuves": []. Pas d'argument hypothétique
- "engagements" : reprends les engagements pris la dernière fois, rangés selon qui doit agir, chacun en quelques mots avec sa date si elle est connue. Aucun : listes vides${referencesConstraint}`;
  }

  const enjeuxCount = Math.min(Math.max(config.painPointsCount, 1), 3);

  return `Génère un brief pré-call pour un commercial B2B qui s'apprête à rencontrer ${company} pour la première fois.
${legalContext}${newsContext}${crmBlock}${contactBlock}${contextBlock}${referencesBlock}${relationalHistoryBlock}${meetingContextBlock}
Retourne ce JSON (structure stricte, aucun texte autour). Même si tu as utilisé la recherche web, ta réponse finale doit être UNIQUEMENT le JSON ci-dessous, sans phrase d'introduction, citation, ni texte additionnel :

{
${companySchema}
  "accroche": "Une question ouverte, courte, pour ouvrir le rendez-vous",
  "pain_points": [
    { "title": "L'enjeu en quelques mots", "detail": "L'hypothèse en UNE phrase, appuyée sur un signal public", "question": "La question à poser pour la vérifier" }
  ],
${referencesSchema}${relationalSchema}}

Contraintes :
${companyConstraints}
- "accroche" : UNE question ouverte, d'une seule phrase, liée au contexte du prospect (son activité, son actualité, ou la raison du rendez-vous si elle est donnée). Pas d'affirmation, pas de présentation de l'offre
- "pain_points" : ${enjeuxCount} au plus. Ce sont des enjeux À EXPLORER, des hypothèses : tu ne sais pas ce qui pose problème chez ${company}. Chacun part d'un signal public vérifiable (site, communiqué, offre d'emploi, données légales, actualité) et pas d'une généralité du secteur. Écris au conditionnel (« pourrait », « serait »), jamais « ils souffrent de… » ni « leur problème est… », et jamais à la première personne. Écris-en au moins 2 : faute de signal public propre à l'entreprise, pars de son activité, de sa taille ou de la raison du rendez-vous, sans jamais écrire qu'une information manque. "question" est ouverte et prête à dire${
    userContext?.product_description
      ? `\n- Les enjeux retenus sont ceux auxquels « ${userContext.product_description} » peut répondre`
      : ""
  }${referencesConstraint}${relationalHistoryBlock ? `\n- "historique_relationnel" : 1 ou 2 phrases` : ""}`;
}

// Les références appartiennent à l'équipe (décision de Jean et d'Hubert,
// 13/11/2026) : celles de tous les membres de l'organisation sont candidates,
// pas seulement celles du commercial. Sans organisation, les siennes.
async function findSimilarReferencesForOrganization(userId: string, prospectContext: string, limit: number): Promise<SimilarReference[]> {
  const userIds = await getOrganizationUserIds(userId).catch(() => [userId]);
  return findSimilarReferencesForUsers(userIds.length > 0 ? userIds : [userId], prospectContext, limit);
}

export async function generateBrief(
  company: string,
  config: AdminConfig,
  userContext: UserContext = null,
  pappersData?: unknown,
  newsArticles?: NewsArticle[],
  userId?: string,
  contactEmail?: string | null,
  apolloContact?: ApolloContact | null,
  // Suite d'un deal en cours (lib/deal-brief.ts) : ce que les calls
  // précédents ont validé et ce qu'il reste à aller chercher.
  dealBlock: string = "",
  // Pourquoi le prospect a accepté le rendez-vous, saisi par le commercial.
  meetingContext: MeetingContext | null = null
): Promise<unknown> {
  const legalContext = pappersData
    ? `\nVoici les données légales officielles de l'entreprise (source : registre français officiel) :\n${JSON.stringify(pappersData, null, 2)}\n\nBase-toi sur ces faits réels pour le brief. Ne les contredis pas.\n`
    : "";

  const newsContext =
    newsArticles && newsArticles.length > 0
      ? `\nActualités récentes sur l'entreprise (90 derniers jours) :\n${newsArticles
          .map(
            (a, i) =>
              `${i + 1}. [${a.source}] ${a.titre} — ${a.description}${a.date ? ` (${a.date.slice(0, 10)})` : ""} — ${a.url}`
          )
          .join("\n")}\n`
      : "";

  const sectorFromPappers =
    (pappersData as Record<string, unknown>)?.libelle_code_naf ??
    (pappersData as Record<string, unknown>)?.code_naf ??
    "";
  // Le secteur Apollo du prospect est souvent le seul indice de son métier
  // (Pappers peut ne rien renvoyer) : sans lui, la requête se résume au nom
  // + au secteur du COMMERCIAL, identique pour tous les prospects, et les
  // références remontées sont quasi aléatoires (constaté le 15/09/2026 sur
  // Medicalib).
  const prospectContext = [company, sectorFromPappers, apolloContact?.organization?.industry, userContext?.sector]
    .filter(Boolean)
    .join(" ");

  // Références clients et données CRM n'entrent dans le brief que si leur
  // module est ouvert (parcours client, lib/modules.ts) : un brief ne doit pas
  // montrer un module avant que l'account manager l'ait présenté.
  const modules = userId ? await getEnabledModulesForUser(userId) : [];

  const [similarRefs, crmData, contactResult] = await Promise.all([
    userId && modules.includes("references")
      ? findSimilarReferencesForOrganization(userId, prospectContext, 8).catch((err) => {
          console.warn("[brief-generator] findSimilarReferences failed:", err);
          return [] as SimilarReference[];
        })
      : Promise.resolve([] as SimilarReference[]),
    userId && modules.includes("crm")
      ? enrichFromCRM(userId, company).catch((err) => {
          console.warn("[brief-generator] enrichFromCRM failed:", err);
          return null;
        })
      : Promise.resolve(null),
    userId && contactEmail
      ? getContact(userId, contactEmail).catch((err) => {
          console.warn("[brief-generator] getContact failed:", err);
          return null;
        })
      : Promise.resolve(null),
  ]);

  let relationalHistoryBlock = "";
  if (contactResult && contactResult.total_calls > 0 && contactResult.last_call_summary) {
    relationalHistoryBlock = `\n# HISTORIQUE RELATIONNEL AVEC CE CONTACT\n\nVous avez déjà eu ${contactResult.total_calls} échange(s) avec ce contact. Voici un résumé de votre dernier call :\n\n${contactResult.last_call_summary}\n\nAppuie-toi sur cet historique : engagements pris, contexte déjà établi.\n`;
  }

  const meetingContextBlock =
    meetingContext && (meetingContext.origin || meetingContext.note)
      ? `\nCONTEXTE DU RENDEZ-VOUS (saisi par le commercial)\n\n${[
          meetingContext.origin ? `- Origine : ${meetingContext.origin}` : null,
          meetingContext.note ? `- Pourquoi le prospect a accepté : ${meetingContext.note}` : null,
        ]
          .filter(Boolean)
          .join("\n")}\n\nL'ouverture du rendez-vous s'en inspire.\n`
      : "";

  const userPrompt = buildUserPrompt(
    company,
    legalContext,
    newsContext,
    config,
    userContext,
    similarRefs,
    relationalHistoryBlock,
    crmData,
    apolloContact ?? null,
    dealBlock,
    meetingContextBlock
  );

  // Deux essais au plus : le second seulement si la réponse ne contient pas de
  // JSON exploitable (constaté en production le 29/09/2026 sur le test du
  // brief, sans cause reproduite).
  let lastRaw = "";
  let lastStop: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    let message = await runBriefRequest(config.model, config, userPrompt);
    if (message.stop_reason === "refusal") {
      // Un refus arrive sans contenu exploitable. On le signale (un refus sur
      // un simple brief d'entreprise mérite d'être vu) et on repasse la même
      // demande sur le modèle de secours plutôt que de laisser le commercial
      // sans brief.
      reportWarning("brief.refusal", `Refus du modèle ${config.model} pour « ${company} »`, {
        category: message.stop_details?.category ?? null,
      });
      message = await runBriefRequest(FALLBACK_MODEL, config, userPrompt);
    }

    const parsed = parseBriefResponse(message);
    if (parsed.ok) return attachReferenceLevels(parsed.value, similarRefs);
    lastRaw = parsed.raw;
    lastStop = message.stop_reason;
    console.warn(`[brief-generator] JSON introuvable (essai ${attempt + 1}, stop=${message.stop_reason})`);
  }

  reportError("brief.invalidJson", new Error("Le modèle n'a pas retourné du JSON valide."), {
    company,
    stopReason: lastStop,
    raw: lastRaw.slice(0, 2000),
  });
  throw new Error("Le modèle n'a pas retourné du JSON valide.");
}

// La réponse finale peut être découpée en plusieurs blocs de texte (citations
// de la recherche web, phrase ajoutée après le JSON…) : on essaie d'abord le
// texte assemblé de tous les blocs qui suivent le dernier appel d'outil, puis
// chaque bloc seul, du dernier au premier.
function parseBriefResponse(message: Anthropic.Message): { ok: true; value: unknown } | { ok: false; raw: string } {
  const lastToolIndex = message.content.reduce(
    (last, b, i) => (b.type !== "text" && b.type !== "thinking" && b.type !== "redacted_thinking" ? i : last),
    -1
  );
  const finalTexts = message.content
    .slice(lastToolIndex + 1)
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text);
  const allTexts = message.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text);
  const candidates = [finalTexts.join(""), ...[...allTexts].reverse()];
  for (const candidate of candidates) {
    if (!candidate.trim()) continue;
    try {
      return { ok: true, value: JSON.parse(extractJsonObject(candidate)) };
    } catch {
      // candidat suivant
    }
  }
  return { ok: false, raw: allTexts.join("\n---\n") };
}

// Un appel de génération, avec la reprise des pauses de la recherche web.
async function runBriefRequest(model: string, config: AdminConfig, userPrompt: string): Promise<Anthropic.Message> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];
  let message: Anthropic.Message | null = null;

  for (let attempt = 0; attempt <= MAX_PAUSE_RESUMES; attempt++) {
    message = await client.messages.create({
      model,
      // La réflexion compte dans max_tokens sur Sonnet 5.5 / Opus 5.5 : 6000
      // suffisait au seul JSON, pas à la réflexion qui le précède.
      max_tokens: 16000,
      system: config.systemPrompt,
      ...(EFFORT_MODELS.has(model) ? { output_config: { effort: config.effort ?? "low" } } : {}),
      // _20260209 (filtrage dynamique) : supporté par Sonnet 4.6, Sonnet 5.5
      // et Opus 5.5 — de meilleurs résultats de recherche sont le levier le
      // plus direct contre un brief générique.
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      messages,
    });

    // Coût et durée d'un brief lisibles dans les logs Vercel : c'est la seule
    // trace de ce que coûte chaque réglage de modèle ou d'effort.
    console.log(
      `[brief-generator] ${message.model} stop=${message.stop_reason} in=${message.usage.input_tokens} out=${message.usage.output_tokens} searches=${message.usage.server_tool_use?.web_search_requests ?? 0}`
    );

    if (message.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: message.content });
  }
  return message as Anthropic.Message;
}

// Raw shape generateBrief actually returns (the JSON schema dictated to
// Claude in buildUserPrompt above) — distinct from lib/types.ts's `Brief`,
// which is a client-side-adapted shape (see adaptApiBrief/adaptCachedContent
// in app/brief/[id]/{BriefClient,page}.tsx). Notifications (sous-étape B)
// hook in server-side right where this raw shape is already available, so
// formatBriefAsMarkdown works from it directly rather than re-adapting.
export type GeneratedBriefJson = {
  overview?: string;
  accroche?: string;
  pain_points?: Array<{ title: string; detail: string; question?: string }>;
  arguments?: Array<{ title: string; detail: string }>;
  vocabulaire?: string[];
  references?: Array<{ client_name: string; relevance: string; pitch: string }>;
  historique_relationnel?: string;
  suite?: {
    pour_ouvrir?: string;
    rappel?: string;
    priorites?: Array<{ title?: string; manque?: string; pourquoi?: string; question?: string }>;
    prochaine_etape?: string;
  };
};

// Shared by the pre-call email (rendered to HTML) and the calendar
// description (rendered to plain text) — see lib/email.ts / lib/google-calendar.ts.
export function formatBriefAsMarkdown(brief: GeneratedBriefJson): string {
  const sections: string[] = [];

  if (brief.suite?.priorites?.length) {
    if (brief.suite.rappel) sections.push(`## Où en sommes-nous\n${brief.suite.rappel}`);
    sections.push(
      `## Priorités du rendez-vous\n${[
        brief.suite.pour_ouvrir ? `- **Pour ouvrir** — ${brief.suite.pour_ouvrir}` : null,
        ...brief.suite.priorites.map((p) => `- **${p.title ?? ""}** — ${p.question ?? p.manque ?? ""}`),
      ]
        .filter(Boolean)
        .join("\n")}`
    );
    if (brief.suite.prochaine_etape) sections.push(`## Prochaine étape à obtenir\n${brief.suite.prochaine_etape}`);
  }
  if (brief.accroche) {
    sections.push(`## Accroche\n${brief.accroche}`);
  }
  if (brief.overview) {
    sections.push(`## Entreprise\n${brief.overview}`);
  }
  if (brief.pain_points?.length) {
    sections.push(
      `## Enjeux à explorer\n${brief.pain_points.map((p) => `- **${p.title}** — ${p.question ?? p.detail}`).join("\n")}`
    );
  }
  if (brief.references?.length) {
    sections.push(
      `## Références et preuves commerciales\n${brief.references
        .map((r) => `- **${r.client_name}** — ${r.pitch}`)
        .join("\n")}`
    );
  }
  if (brief.historique_relationnel) {
    sections.push(`## Historique relationnel\n${brief.historique_relationnel}`);
  }

  return sections.join("\n\n");
}
