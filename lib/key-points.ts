import Anthropic from "@anthropic-ai/sdk";

// Hardcoded by design (not admin-configurable like the other prompts in
// lib/admin-config.ts) — this is a fixed, product-defined format, not a
// per-org customization point.
export const KEY_POINTS_SYSTEM_PROMPT = `Analyse ce transcript de réunion.
Ton objectif est d'extraire les informations qu'un dirigeant devrait retenir en moins d'une minute.

Produis une section "💡 Points clés" qui :
1. explique en une phrase le contexte de la réunion ;
2. synthétise les décisions importantes prises ;
3. résume les points validés entre les participants ;
4. mentionne uniquement les actions qui auront un impact sur la suite du projet ;
5. termine par les prochaines étapes, responsables et échéances lorsqu'elles sont disponibles.

Règles :
- Supprime les discussions, hésitations et répétitions.
- Regroupe les sujets similaires.
- Mets l'accent sur les décisions plutôt que sur les échanges.
- Écris dans un français fluide et professionnel.
- Sois fidèle au transcript.
- Longueur cible : 250 à 400 mots.`;

// Claude's own output sometimes repeats the "💡 Points clés" heading the
// system prompt above asks for, as a markdown title on the first line —
// duplicating KeyPointsBlock.tsx's own <h2> in the rendered page. Strips it
// (plus any blank lines right after) when present. Matches # or ##, the
// emoji being optional, singular/plural "Point(s)", and "clés"/"cles" —
// a no-op (returns the text unchanged) when the pattern isn't found.
const DUPLICATE_TITLE_RE = /^#{1,6}\s*💡?\s*Points?\s+cl[ée]s\s*\n+/iu;

function stripDuplicateTitle(text: string): string {
  return text.replace(DUPLICATE_TITLE_RE, "").trimStart();
}

// Plain text out (not JSON, unlike analyzeCall) — cached verbatim in
// call_analysis.key_points by the caller. Never throws: a failed generation
// must not break the page that requested it, just leave key_points unset so
// the next visit (or an explicit retry) tries again.
export async function generateKeyPoints(transcript: string): Promise<string | null> {
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: KEY_POINTS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: transcript }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (textBlock?.type !== "text") return null;
    return stripDuplicateTitle(textBlock.text.trim());
  } catch (err) {
    console.error("[key-points] generateKeyPoints failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
