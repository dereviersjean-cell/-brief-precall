import {
  DEAL_ALERT_RULES,
  DEAL_MEMORY_FIELDS,
  OBJECTION_ALERT_LABEL,
  type DealMemoryContent,
  type DealMemoryFieldKey,
  type DealOverview,
} from "./deal-memory-schema";

// Deal Execution, étape 3 : ce que Brief écrit dans le deal HubSpot. Sans
// dépendance (pas de réseau, pas de base) pour être testé.
//
// Deux écritures, décidées avec Hubert le 26/10/2026 :
//  · les champs de qualification, dans les propriétés que le client utilise
//    déjà (la correspondance est réglée par organisation) ;
//  · une note de synthèse du call : prochaines étapes en tête, puis points
//    d'attention, puis ce que la fiche a retenu.

// La prochaine étape a sa propriété standard dans HubSpot : écrite par défaut,
// sauf si l'organisation l'envoie ailleurs.
export const DEFAULT_HUBSPOT_MAPPING: Partial<Record<DealMemoryFieldKey, string>> = { prochaines_etapes: "hs_next_step" };

const FIELD_KEYS = new Set<string>(DEAL_MEMORY_FIELDS.map((f) => f.key));
const FIELD_LABELS = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));
const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

export function effectiveMapping(orgMapping: Record<string, string>): Partial<Record<DealMemoryFieldKey, string>> {
  const out: Partial<Record<DealMemoryFieldKey, string>> = { ...DEFAULT_HUBSPOT_MAPPING };
  for (const [key, property] of Object.entries(orgMapping)) {
    if (!FIELD_KEYS.has(key)) continue;
    if (property) out[key as DealMemoryFieldKey] = property;
    else delete out[key as DealMemoryFieldKey];
  }
  return out;
}

// Valeur de chaque propriété : ce que le call le PLUS RÉCENT du deal a dit sur
// ce champ (la mémoire du deal est rangée du plus récent au plus ancien). Un
// champ dont aucun call n'a rien dit n'est pas écrit : on n'efface jamais ce
// que le commercial a saisi lui-même dans HubSpot.
export function buildHubspotProperties(
  memory: DealOverview["memory"],
  mapping: Partial<Record<DealMemoryFieldKey, string>>
): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const [key, property] of Object.entries(mapping)) {
    const items = memory[key as DealMemoryFieldKey] ?? [];
    if (!property || items.length === 0) continue;
    const latestCall = items[0].callId;
    const texts = items.filter((i) => i.callId === latestCall).map((i) => i.text);
    properties[property] = texts.length === 1 ? texts[0] : texts.map((t) => `• ${t}`).join("\n");
  }
  return properties;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function list(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

export function buildHubspotNote(input: {
  callTitle: string | null;
  callDay: string | null;
  content: DealMemoryContent;
  badlyHandledObjections: string[];
}): string {
  const { content } = input;
  const next = content.fields.prochaines_etapes ?? [];
  const attention = [
    ...content.alerts.map((a) => `${RULE_LABELS.get(a.rule) ?? a.rule} : ${a.text}`),
    ...input.badlyHandledObjections.map((o) => `${OBJECTION_ALERT_LABEL} : ${o}`),
  ];
  const others = DEAL_MEMORY_FIELDS.filter((f) => f.key !== "prochaines_etapes" && (content.fields[f.key] ?? []).length > 0);

  const heading = ["Fiche deal Brief", input.callTitle, input.callDay].filter(Boolean).join(" · ");
  return [
    `<p><strong>${escapeHtml(heading)}</strong></p>`,
    `<p><strong>Prochaines étapes</strong></p>`,
    next.length > 0 ? list(next.map((i) => i.text)) : "<p>Aucune prochaine étape dite pendant le call.</p>",
    ...(attention.length > 0 ? [`<p><strong>Points d'attention</strong></p>`, list(attention)] : []),
    ...others.flatMap((f) => [`<p><strong>${escapeHtml(FIELD_LABELS.get(f.key) ?? f.key)}</strong></p>`, list((content.fields[f.key] ?? []).map((i) => i.text))]),
  ].join("");
}
