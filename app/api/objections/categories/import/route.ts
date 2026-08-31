import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { enforceAiGenerationLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { getUserRole, getUserOrganizationId, createObjectionCategory, listObjectionCategories } from "@/lib/db";
import { extractTextFromUploadedFile, UnsupportedFileTypeError, SUPPORTED_DOCUMENT_FORMATS_LABEL } from "@/lib/document-text";
import { extractJsonObject } from "@/lib/ai-json";
import Anthropic from "@anthropic-ai/sdk";

// Import d'une bibliothèque d'objections depuis un document (argumentaire,
// guide de traitement des objections, compte-rendu de formation…) ou depuis
// du texte collé — même parcours en deux temps que l'import de playbook :
// POST sans `apply` extrait et renvoie une proposition à valider, POST avec
// `apply` écrit en base. Rien n'est jamais écrit sans validation explicite.

export type ObjectionCategoryExtraction = {
  label: string;
  description: string;
  handlingGuidance: string;
  examplePhrasings: string[];
};

// Prompt codé en dur, pas dans admin_config : le contrat JSON est
// structurel, pas du contenu éditable par un manager (règle « contrat JSON
// forcé côté serveur », et bug #20).
const EXTRACTION_PROMPT = `Tu analyses un document commercial B2B en français (argumentaire de vente, guide de traitement des objections, support de formation, notes d'équipe).

Extrais-en la liste des OBJECTIONS que les prospects soulèvent, et pour chacune la manière de la traiter décrite dans le document.

Règles :
- Une entrée par objection distincte, au niveau de la catégorie et non de la formulation exacte : « c'est trop cher » et « votre tarif est au-dessus de notre budget » sont la MÊME objection (le prix), pas deux.
- "label" : le nom court de l'objection, tel qu'un directeur commercial la nommerait (3-6 mots, ex. « Prix trop élevé », « Besoin d'en parler à un associé », « On a déjà un prestataire »).
- "description" : ce qui caractérise cette objection et ce qui la distingue des autres, en 1-2 phrases. Sert à la reconnaître dans un transcript.
- "handling_guidance" : la manière de la traiter décrite dans le document, en 2-4 phrases concrètes et actionnables. Si le document ne dit rien sur la façon de la traiter, mets une chaîne vide — n'invente RIEN.
- "example_phrasings" : 2 à 4 formulations telles qu'un prospect les prononcerait vraiment à l'oral. Reprends celles du document si elles y sont.
- Entre 3 et 15 objections. Si le document n'en contient aucune, renvoie une liste vide.

Réponds UNIQUEMENT en JSON strict, sans markdown :
{"categories": [{"label": "...", "description": "...", "handling_guidance": "...", "example_phrasings": ["...", "..."]}]}`;

type RawCategory = {
  label?: string;
  description?: string;
  handling_guidance?: string;
  example_phrasings?: unknown;
};

async function extractObjectionCategories(text: string): Promise<ObjectionCategoryExtraction[]> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: EXTRACTION_PROMPT,
    messages: [{ role: "user", content: text.trim() }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : "";

  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as { categories?: RawCategory[] };
    if (!Array.isArray(parsed.categories)) {
      throw new Error("Réponse IA hors contrat (clé `categories` absente ou non-tableau)");
    }
    return parsed.categories
      .filter((c): c is RawCategory & { label: string } => typeof c.label === "string" && c.label.trim().length > 0)
      .map((c) => ({
        label: c.label.trim(),
        description: typeof c.description === "string" ? c.description.trim() : "",
        handlingGuidance: typeof c.handling_guidance === "string" ? c.handling_guidance.trim() : "",
        examplePhrasings: Array.isArray(c.example_phrasings)
          ? c.example_phrasings.map((p) => String(p).trim()).filter(Boolean).slice(0, 6)
          : [],
      }));
  } catch (err) {
    console.error(
      "[objections/categories/import] extraction JSON parse failed:",
      err instanceof Error ? err.message : String(err),
      `\nRaw Claude response:\n${raw}`
    );
    throw err;
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const rl = await enforceAiGenerationLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`, retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const orgId = await getUserOrganizationId(auth.userId);
  if (!orgId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  // Deuxième temps du parcours : la proposition a été revue côté client, on
  // l'écrit. Passe par JSON uniquement (l'upload n'a lieu qu'au 1er temps).
  if (!contentType.includes("multipart/form-data")) {
    let body: { text?: string; apply?: ObjectionCategoryExtraction[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
    }

    if (Array.isArray(body.apply)) {
      const existing = await listObjectionCategories(orgId).catch(() => []);
      const existingLabels = new Set(existing.map((c) => c.label.trim().toLowerCase()));

      let created = 0;
      let skipped = 0;
      for (const category of body.apply) {
        if (!category.label?.trim()) continue;
        // Import rejouable : une catégorie du même nom n'est pas dupliquée.
        // On ne l'écrase pas non plus — ce que le manager a écrit à la main
        // prime toujours sur ce qu'un document propose.
        if (existingLabels.has(category.label.trim().toLowerCase())) {
          skipped++;
          continue;
        }
        await createObjectionCategory(orgId, {
          label: category.label,
          description: category.description,
          handlingGuidance: category.handlingGuidance,
          examplePhrasings: category.examplePhrasings,
        });
        existingLabels.add(category.label.trim().toLowerCase());
        created++;
      }
      return NextResponse.json({ created, skipped });
    }

    const text = body.text ?? "";
    if (!text.trim()) {
      return NextResponse.json({ error: "Aucun texte à analyser." }, { status: 400 });
    }
    try {
      return NextResponse.json({ categories: await extractObjectionCategories(text) });
    } catch {
      return NextResponse.json(
        { error: "L'extraction a échoué. Réessayez, ou saisissez les objections manuellement." },
        { status: 500 }
      );
    }
  }

  let text: string;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
    }
    text = await extractTextFromUploadedFile(file);
  } catch (err) {
    if (err instanceof UnsupportedFileTypeError) {
      return NextResponse.json({ error: SUPPORTED_DOCUMENT_FORMATS_LABEL }, { status: 400 });
    }
    console.error("[objections/categories/import] text extraction failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Impossible d'extraire le texte du document." }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Aucun texte à analyser." }, { status: 400 });
  }

  try {
    // Renvoyé au client pour revue uniquement — rien n'est écrit ici.
    return NextResponse.json({ categories: await extractObjectionCategories(text) });
  } catch {
    return NextResponse.json(
      { error: "L'extraction a échoué. Réessayez, ou saisissez les objections manuellement." },
      { status: 500 }
    );
  }
}
