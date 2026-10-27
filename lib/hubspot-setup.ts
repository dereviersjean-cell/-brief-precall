import { DEAL_MEMORY_FIELDS, type DealMemoryFieldKey } from "./deal-memory-schema";
import { defaultMode, type HubspotPropertyType, type MappingEntry, type WriteMode } from "./hubspot-mapping";
import { suggestProperty } from "./hubspot-overview";

// L'outil de setup HubSpot de l'admin (27/10/2026, demande de Jean : « un
// système qui permet à la personne de Brief qui présente d'analyser vite et
// de voir avec le client ce qu'on peut mettre en place »). Ce module, sans
// dépendance et testé, transforme le diagnostic du HubSpot du client en une
// proposition, information par information, que l'admin valide ou corrige
// pendant le call avant de l'appliquer.

export type DiagnosticProperty = {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  options: { label: string; value: string }[];
  readOnly: boolean;
  custom: boolean;
  groupName: string | null;
  // Part des deals analysés où la propriété est remplie (0 à 1).
  fillRate: number;
  // Quelques valeurs réelles, pour voir ce que la propriété contient.
  samples: string[];
};

export type SetupChoice =
  | { kind: "existing"; property: string; type: HubspotPropertyType; mode: WriteMode; options?: { confirme?: string; evoque?: string } }
  | { kind: "create"; mode: WriteMode }
  | { kind: "note" };

export type Proposal = { key: DealMemoryFieldKey; label: string; choice: SetupChoice; reason: string };

const WRITABLE_TYPES = new Set(["string", "number", "date", "datetime", "enumeration", "bool"]);

// Une information peut-elle aller dans une propriété de ce type ?
export function typeCompatible(key: DealMemoryFieldKey, type: string): boolean {
  if (type === "string") return true;
  if (type === "number") return key === "budget";
  if (type === "date" || type === "datetime") return key === "echeance";
  if (type === "enumeration" || type === "bool") return !["prochaines_etapes", "concurrents", "interlocuteurs_manquants"].includes(key);
  return false;
}

const YES = ["oui", "yes", "true", "identifie", "identified", "confirme", "confirmed", "valide", "validated", "ok"];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// L'option d'une liste qui veut dire « obtenu » : oui, identifié, confirmé…
export function yesOption(property: Pick<DiagnosticProperty, "type" | "options">): string | undefined {
  if (property.type === "bool") return "true";
  return property.options.find((o) => YES.some((w) => normalize(o.label) === w || normalize(o.value) === w || normalize(o.label).startsWith(`${w} `)))?.value;
}

export function briefPropertyName(key: DealMemoryFieldKey): string {
  return `brief_${key}`;
}

// Le libellé d'une propriété créée par Brief : le nom de l'information, sans
// préfixe (décision de Jean du 27/10/2026) ; elle est rangée dans le groupe
// « Brief » du HubSpot du client, et son nom interne commence par brief_.
export function briefPropertyLabel(key: DealMemoryFieldKey): string {
  return DEAL_MEMORY_FIELDS.find((f) => f.key === key)?.label ?? key;
}

function percent(rate: number): string {
  return `${Math.round(rate * 100)} %`;
}

const TYPE_LABELS: Record<string, string> = {
  string: "texte",
  number: "nombre",
  date: "date",
  datetime: "date",
  enumeration: "liste",
  bool: "case à cocher",
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

// La proposition pour chaque information de la fiche :
//  · une propriété du client qui lui correspond, de type compatible ;
//  · sinon, pour la prochaine étape, la propriété standard « Next step » ;
//  · sinon une propriété à créer dans le groupe « Brief » ;
// avec la raison, en une phrase, pour la montrer au client.
export function proposeMappings(properties: DiagnosticProperty[]): Proposal[] {
  const writable = properties.filter((p) => !p.readOnly && WRITABLE_TYPES.has(p.type) && !p.name.startsWith("brief_"));
  const taken = new Set<string>();
  return DEAL_MEMORY_FIELDS.map((f) => {
    const existingBrief = properties.find((p) => p.name === briefPropertyName(f.key));
    const candidate = suggestProperty(f.key, writable.filter((p) => typeCompatible(f.key, p.type)), taken);
    const lookalike = candidate ? null : suggestProperty(f.key, writable, taken);
    if (candidate) {
      const full = writable.find((p) => p.name === candidate.name)!;
      taken.add(full.name);
      const option = full.type === "enumeration" || full.type === "bool" ? yesOption(full) : undefined;
      if ((full.type === "enumeration" || full.type === "bool") && !option) {
        return {
          key: f.key,
          label: f.label,
          choice: { kind: "create", mode: defaultMode(f.key) },
          reason: `Leur propriété « ${full.label} » est une liste sans option qui veuille dire « obtenu » : à régler avec le client, sinon une propriété Brief.`,
        };
      }
      return {
        key: f.key,
        label: f.label,
        choice: {
          kind: "existing",
          property: full.name,
          type: full.type as HubspotPropertyType,
          mode: defaultMode(f.key),
          ...(option ? { options: { confirme: option } } : {}),
        },
        reason: `Leur propriété « ${full.label} » (${typeLabel(full.type)}, remplie sur ${percent(full.fillRate)} des deals)${
          full.samples.length ? ` contient par exemple « ${full.samples[0]} »` : " est encore vide"
        }.`,
      };
    }
    if (f.key === "prochaines_etapes" && properties.some((p) => p.name === "hs_next_step")) {
      return {
        key: f.key,
        label: f.label,
        choice: { kind: "existing", property: "hs_next_step", type: "string", mode: defaultMode(f.key) },
        reason: "La propriété standard « Next step » de HubSpot.",
      };
    }
    return {
      key: f.key,
      label: f.label,
      choice: { kind: "create", mode: defaultMode(f.key) },
      reason: existingBrief
        ? `La propriété « ${existingBrief.label} » existe déjà : Brief l'utilisera.`
        : lookalike
          ? `Leur propriété « ${lookalike.label} » n'a pas le bon type (${typeLabel(writable.find((p) => p.name === lookalike.name)?.type ?? "")}) : une propriété Brief évite de la fausser.`
          : "Aucune propriété du client ne correspond : une propriété à créer dans le groupe « Brief ».",
    };
  });
}

// Le verdict du diagnostic sur la méthode de qualification du client.
export function methodVerdict(proposals: Proposal[]): string {
  const qualification = proposals.filter((p) => ["douleur", "impact", "decideur", "champion", "criteres", "processus", "budget", "echeance"].includes(p.key));
  const found = qualification.filter((p) => p.choice.kind === "existing").length;
  if (found === 0) return "Aucune propriété de qualification : on part de zéro, avec des propriétés Brief.";
  if (found >= 5) return `Qualification déjà structurée : ${found} des 8 informations ont une propriété chez le client.`;
  return `Qualification partielle : ${found} des 8 informations ont une propriété chez le client.`;
}

// Le réglage à enregistrer pour une proposition validée (après création des
// propriétés Brief).
export function entryFor(key: DealMemoryFieldKey, choice: SetupChoice): MappingEntry | null {
  if (choice.kind === "note") return null;
  if (choice.kind === "create") return { property: briefPropertyName(key), type: "string", mode: choice.mode };
  return { property: choice.property, type: choice.type, mode: choice.mode, ...(choice.options ? { options: choice.options } : {}) };
}
