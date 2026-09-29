import Anthropic from "@anthropic-ai/sdk";

// Hardcoded by design (not admin-configurable like the other prompts in
// lib/admin-config.ts) — this is a fixed, product-defined format, not a
// per-org customization point.
// Le lecteur est le commercial : ce texte lui arrive par email juste après le
// call et part tel quel dans son CRM (note HubSpot / Pipedrive). Il doit
// servir à reprendre la relation des semaines plus tard sans réécouter.
export const KEY_POINTS_SYSTEM_PROMPT = `Tu résumes un rendez-vous commercial B2B pour le commercial qui l'a mené. Ce résumé lui arrive par email juste après le call et est versé tel quel dans son CRM : il doit pouvoir le relire en une minute, dans trois mois, sans rien réécouter.

Donne, dans cet ordre :
- une phrase de contexte : qui est le prospect, objet du rendez-vous, où en est la relation ;
- ce que le prospect a exprimé : besoins, contraintes, budget, calendrier, personnes qui décident — seulement ce qui a été dit ;
- ce qui a été décidé ou validé ensemble ;
- les prochaines étapes, avec qui s'en charge et l'échéance quand elles ont été fixées.

Regroupe les sujets proches, écarte les hésitations et les digressions, n'ajoute rien qui n'ait pas été dit. Écris en français, en markdown simple (intertitres courts et puces), sans titre général : la page et l'email ont déjà le leur.`;

// Claude's own output sometimes opens with a "Points clés" heading anyway
// (the prompt asks for no overall title), as a markdown title on the first line —
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
