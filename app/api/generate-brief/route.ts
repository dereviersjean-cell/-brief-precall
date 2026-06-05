import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { enrichWithPappers } from "@/lib/pappers";

const client = new Anthropic();

const SYSTEM_PROMPT = `Tu es un expert en vente B2B SaaS avec 10 ans d'expérience.
Tu génères des briefs pré-call ultra-précis et actionnables pour des commerciaux.
Tes briefs sont fondés sur la réalité du marché, concis et orientés résultat.
Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte avant ou après.`;

function extractJSON(raw: string): unknown {
  // 1. Strip markdown code fences
  let text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // 2. Extract content between first { and last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  return JSON.parse(text);
}

function buildUserPrompt(company: string, legalContext: string): string {
  return `Génère un brief pré-call complet pour un commercial B2B SaaS qui s'apprête à appeler ${company}.
${legalContext}
Retourne ce JSON (structure stricte, aucun texte autour) :

{
  "overview": "Vue d'ensemble en 2-3 phrases : secteur, modèle économique, taille et positionnement marché",
  "accroche": "Une seule phrase d'accroche percutante et personnalisée pour ouvrir le call — elle doit être spécifique à l'actualité ou au contexte de l'entreprise",
  "pain_points": [
    {
      "title": "Nom court du pain point",
      "detail": "Description précise du problème que l'entreprise rencontre probablement, en 1-2 phrases"
    }
  ],
  "arguments": [
    {
      "title": "Titre de l'argument commercial",
      "detail": "Comment une solution SaaS adresse ce besoin, avec un bénéfice concret chiffré si possible"
    }
  ],
  "vocabulaire": ["mot-clé-1", "mot-clé-2", "mot-clé-3", "mot-clé-4", "mot-clé-5"]
}

Contraintes :
- Exactement 3 pain_points
- Exactement 3 arguments
- Exactement 5 mots-clés métier dans vocabulaire
- Tout en français
- Accroche basée sur un fait récent ou une réalité spécifique de ${company}`;
}

export async function POST(request: NextRequest) {
  let company: string;

  try {
    const body = await request.json();
    company = body?.company;
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide." }, { status: 400 });
  }

  if (!company || typeof company !== "string" || company.trim().length === 0) {
    return NextResponse.json({ error: "Le paramètre 'company' est requis." }, { status: 400 });
  }

  const trimmed = company.trim();

  // Enrichissement Pappers (best-effort : null si indisponible)
  const pappersData = await enrichWithPappers(trimmed);

  const legalContext = pappersData
    ? `\nVoici les données légales officielles de l'entreprise (source : registre français officiel) :\n${JSON.stringify(pappersData, null, 2)}\n\nBase-toi sur ces faits réels pour le brief. Ne les contredis pas.\n`
    : "";

  const userPrompt = buildUserPrompt(trimmed, legalContext);

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Réponse inattendue de l'API." }, { status: 502 });
    }

    let brief: unknown;
    try {
      brief = extractJSON(textBlock.text);
    } catch {
      console.error("[generate-brief] Échec du parsing JSON. Texte brut reçu :\n", textBlock.text);
      return NextResponse.json(
        { error: "Le modèle n'a pas retourné du JSON valide. Réessayez." },
        { status: 502 }
      );
    }

    return NextResponse.json(brief);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Clé API invalide. Vérifiez ANTHROPIC_API_KEY dans .env.local." },
        { status: 401 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Limite de l'API atteinte. Réessayez dans quelques secondes." },
        { status: 429 }
      );
    }
    console.error("[generate-brief]", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
