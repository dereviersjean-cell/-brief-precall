import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import { reportWarning } from "./monitoring";

/**
 * Qui était en face, et pour quelle entreprise.
 *
 * L'information existe déjà dans l'analyse du call, en toutes lettres
 * (« rendez-vous entre Guislain (Oliverlist) et Théa et Marin (Vasco/Gamma) »),
 * mais en prose : une liste ne peut rien en faire. Ce module la met sous une
 * forme exploitable, UNE FOIS après l'analyse — jamais à l'affichage, où ce
 * serait un appel IA par ligne à chaque chargement de page.
 *
 * Prompt codé en dur, pas dans `admin_config` : c'est de la plomberie
 * d'identification, pas une méthode d'analyse que le manager règle (même
 * logique que lib/key-points.ts et lib/training.ts). Corollaire utile : ce
 * correctif n'a pas besoin qu'on répercute quoi que ce soit dans la ligne
 * `admin_config` de chaque organisation (cf. bug #24).
 */
export type CallIdentity = {
  prospectCompany: string | null;
  prospectContacts: string[];
};

export type CallIdentityInput = {
  summary: string | null;
  keyPoints: string | null;
  // Les noms réellement relevés en visio (calls.speaker_names_override). Le
  // modèle CHOISIT dans cette liste, il n'invente pas : c'est le même principe
  // d'ancrage que les verbatims d'objection.
  speakerNames: string[];
  // L'entreprise du commercial, pour qu'elle ne soit jamais rendue comme
  // celle du prospect — c'est l'erreur la plus probable, les deux étant citées
  // dans la même phrase de résumé.
  commercialCompany: string | null;
};

const SYSTEM_PROMPT = `Tu identifies, dans le compte rendu d'un rendez-vous commercial, QUI est le prospect.

Règles :
- L'entreprise recherchée est celle du PROSPECT (celle qui pourrait acheter), jamais celle du commercial qui mène le rendez-vous.
- Tu rends son NOM, jamais une description. « Vasco/Gamma » est un nom ; « startup SaaS spécialisée dans la numérisation du secrétariat juridique » n'en est pas un. Si le compte rendu se contente de décrire l'entreprise sans la nommer, rends null.
- Les personnes recherchées sont celles du CÔTÉ PROSPECT uniquement, jamais le commercial ni ses collègues.
- Tu choisis les noms de personnes EXCLUSIVEMENT dans la liste fournie, recopiés à l'identique. Tu n'en inventes aucun et tu n'en reformules aucun.
- Si le compte rendu ne permet pas de trancher, rends null pour l'entreprise et une liste vide pour les personnes. Ne devine pas.

Réponds UNIQUEMENT en JSON strict, sans markdown :
{ "prospect_company": "nom de l'entreprise du prospect ou null", "prospect_contacts": ["nom recopié de la liste", "..."] }`;

export async function extractCallIdentity(input: CallIdentityInput): Promise<CallIdentity | null> {
  const source = [input.summary, input.keyPoints].filter(Boolean).join("\n\n").trim();
  // Sans compte rendu il n'y a rien à lire : ne pas dépenser un appel pour
  // faire deviner un modèle à partir d'une liste de noms.
  if (!source) return null;

  const client = new Anthropic();
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            input.commercialCompany
              ? `Entreprise du commercial (donc PAS le prospect) : ${input.commercialCompany}`
              : null,
            input.speakerNames.length > 0
              ? `Personnes présentes, telles que relevées pendant la visio :\n${input.speakerNames.map((n) => `- ${n}`).join("\n")}`
              : "Aucun nom de participant n'a été relevé pendant la visio.",
            `Compte rendu du rendez-vous :\n${source.slice(0, 12000)}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    const raw = block?.type === "text" ? block.text : "";
    const parsed = JSON.parse(extractJsonObject(raw)) as {
      prospect_company?: unknown;
      prospect_contacts?: unknown;
    };

    // Un nom d'entreprise est court. Au-delà, c'est une description — le
    // modèle en rend une dès que le compte rendu ne nomme pas la société, et
    // elle déborderait la ligne de liste sans rien apprendre. La consigne le
    // dit déjà ; ce garde-fou est ce qui le garantit.
    const rawCompany =
      typeof parsed.prospect_company === "string" ? parsed.prospect_company.trim() : "";
    const company = rawCompany && rawCompany.length <= 40 ? rawCompany : null;

    // Le filtre est la vraie garantie, pas la consigne : un nom qui n'a pas
    // été prononcé en visio ne peut pas être affiché comme l'interlocuteur.
    // Comparaison insensible à la casse, mais c'est le nom RELEVÉ qui est
    // conservé, pas la graphie rendue par le modèle.
    const known = new Map(input.speakerNames.map((n) => [n.trim().toLowerCase(), n.trim()]));
    const contacts = Array.isArray(parsed.prospect_contacts)
      ? parsed.prospect_contacts
          .filter((n): n is string => typeof n === "string")
          .map((n) => known.get(n.trim().toLowerCase()))
          .filter((n): n is string => !!n)
      : [];

    if (!company && contacts.length === 0) return null;
    return { prospectCompany: company, prospectContacts: contacts };
  } catch (err) {
    // Jamais bloquant : l'affichage retombe sur le nom déduit de l'adresse et
    // l'entreprise du rendez-vous, exactement comme avant ce module.
    reportWarning("call-identity.extract", err);
    return null;
  }
}
