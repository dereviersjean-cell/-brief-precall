import { DEAL_MEMORY_FIELDS, type DealMemoryFieldKey, type DealMemoryItem } from "./deal-memory-schema";

// Le moteur d'écriture dans HubSpot (27/10/2026, demande de Jean : « chaque
// client a un HubSpot différent, il faut s'adapter sans se tromper »). Pour
// chaque information de la fiche reliée à une propriété du client, il décide
// d'écrire ou non, et dit pourquoi :
//  · seule une information confirmée par le prospect part dans une propriété
//    (l'évoqué reste dans la note) ;
//  · la valeur suit le type de la propriété : du texte, un montant, une date,
//    une option de liste qui existe chez le client — jamais autre chose ;
//  · « remplir si vide » par défaut (décision de Jean) ; « mettre à jour tant
//    que personne ne l'a modifiée à la main » pour la prochaine étape, qui
//    change à chaque call ;
//  · rien sur une propriété disparue, en lecture seule ou dont le type a
//    changé depuis le réglage, ni sur un deal clos.
// Sans dépendance : testé, et importé par l'écran.

export type HubspotPropertyType = "string" | "number" | "date" | "datetime" | "enumeration" | "bool";
export type WriteMode = "fill_if_empty" | "update_unless_edited";

export type MappingEntry = {
  property: string;
  type: HubspotPropertyType;
  mode: WriteMode;
  // Liste ou case à cocher : l'option à écrire selon ce que dit la fiche.
  options?: { confirme?: string; evoque?: string };
};

export type HubspotMapping = Partial<Record<DealMemoryFieldKey, MappingEntry>>;

export const WRITE_MODES: Record<WriteMode, string> = {
  fill_if_empty: "Remplie si elle est vide",
  update_unless_edited: "Mise à jour à chaque call, sauf si quelqu'un l'a modifiée à la main",
};

const FIELD_KEYS = new Set<string>(DEAL_MEMORY_FIELDS.map((f) => f.key));
const TYPES = new Set<string>(["string", "number", "date", "datetime", "enumeration", "bool"]);

export function defaultMode(key: DealMemoryFieldKey): WriteMode {
  return key === "prochaines_etapes" ? "update_unless_edited" : "fill_if_empty";
}

// La prochaine étape a sa propriété standard dans HubSpot : écrite par défaut,
// sauf si l'organisation l'envoie ailleurs ou la coupe.
export const DEFAULT_MAPPING: HubspotMapping = {
  prochaines_etapes: { property: "hs_next_step", type: "string", mode: "update_unless_edited" },
};

// Ce qui est en base (organizations.hubspot_field_mapping), ramené à des
// entrées complètes. Format d'avant le 27/10/2026 : un nom de propriété texte
// par champ ; "" = ne pas écrire.
export function coerceMapping(raw: unknown): HubspotMapping {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: HubspotMapping = { ...DEFAULT_MAPPING };
  for (const [key, value] of Object.entries(source)) {
    if (!FIELD_KEYS.has(key)) continue;
    const field = key as DealMemoryFieldKey;
    if (value === "" || value === null) {
      delete out[field];
    } else if (typeof value === "string") {
      out[field] = { property: value, type: "string", mode: defaultMode(field) };
    } else if (typeof value === "object") {
      const v = value as Partial<MappingEntry>;
      if (typeof v.property !== "string" || !v.property) continue;
      const type = typeof v.type === "string" && TYPES.has(v.type) ? v.type : "string";
      const mode: WriteMode = v.mode === "update_unless_edited" || v.mode === "fill_if_empty" ? v.mode : defaultMode(field);
      const options = v.options && typeof v.options === "object" ? v.options : undefined;
      out[field] = {
        property: v.property,
        type,
        mode,
        ...(options
          ? {
              options: {
                ...(typeof options.confirme === "string" ? { confirme: options.confirme } : {}),
                ...(typeof options.evoque === "string" ? { evoque: options.evoque } : {}),
              },
            }
          : {}),
      };
    }
  }
  return out;
}

// Ce qui est enregistré : une entrée par champ, "" pour « ne pas écrire » un
// champ qui a une valeur par défaut.
export function serializeMapping(mapping: HubspotMapping): Record<string, MappingEntry | ""> {
  const out: Record<string, MappingEntry | ""> = {};
  for (const f of DEAL_MEMORY_FIELDS) {
    const entry = mapping[f.key];
    if (entry) out[f.key] = entry;
    else if (DEFAULT_MAPPING[f.key]) out[f.key] = "";
  }
  return out;
}

function confirmed(item: DealMemoryItem): boolean {
  return (item.level ?? "confirme") === "confirme";
}

// La valeur à écrire pour une information, d'après tout ce que le deal en sait
// (du plus récent au plus ancien), ou la raison pour laquelle il n'y en a pas.
export function valueFor(entry: MappingEntry, items: (DealMemoryItem & { callId?: string })[]): { value: string | null; reason: string | null } {
  const sure = items.filter(confirmed);
  if (entry.type === "enumeration" || entry.type === "bool") {
    const level = sure.length > 0 ? "confirme" : items.length > 0 ? "evoque" : null;
    if (!level) return { value: null, reason: "Pas abordée" };
    const option = entry.options?.[level] ?? (entry.type === "bool" && level === "confirme" ? "true" : undefined);
    return option ? { value: option, reason: null } : { value: null, reason: level === "evoque" ? "Encore floue" : "Aucune option prévue" };
  }
  if (sure.length === 0) return { value: null, reason: items.length > 0 ? "Encore floue" : "Pas abordée" };
  if (entry.type === "number") {
    const amount = sure.find((i) => typeof i.amount === "number")?.amount;
    return amount !== undefined && amount !== null ? { value: String(amount), reason: null } : { value: null, reason: "Pas de montant précis" };
  }
  if (entry.type === "date" || entry.type === "datetime") {
    const date = sure.find((i) => i.date)?.date;
    return date ? { value: date, reason: null } : { value: null, reason: "Pas de date précise" };
  }
  // Texte : ce qu'en a dit le dernier call qui l'a confirmée.
  const latestCall = sure[0].callId;
  const texts = sure.filter((i) => i.callId === latestCall).map((i) => i.text);
  const value = texts.length === 1 ? texts[0] : texts.map((t) => `• ${t}`).join("\n");
  return { value: value.slice(0, 65000), reason: null };
}

export type PropertyDefinition = { type: string; options: string[]; readOnly: boolean };

export type PlannedWrite = {
  key: DealMemoryFieldKey;
  property: string;
  value: string | null;
  // La valeur actuelle dans le deal HubSpot.
  current: string | null;
  action: "write" | "skip";
  reason: string | null;
};

function same(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return norm(a) === norm(b);
}

// Pour chaque information reliée : écrire, ou pas, et pourquoi.
export function planWrites(input: {
  mapping: HubspotMapping;
  memory: Partial<Record<DealMemoryFieldKey, (DealMemoryItem & { callId?: string })[]>>;
  // Valeurs actuelles des propriétés dans le deal HubSpot.
  current: Record<string, string | null>;
  // Les valeurs que Brief a écrites (ou a pu écrire) dans ce deal, par
  // propriété : le journal, et ce que les fiches précédentes donnaient
  // (briefCandidates).
  lastWritten: Record<string, string[]>;
  definitions: Record<string, PropertyDefinition>;
  dealClosed: boolean;
}): PlannedWrite[] {
  const plans: PlannedWrite[] = [];
  for (const f of DEAL_MEMORY_FIELDS) {
    const entry = input.mapping[f.key];
    if (!entry) continue;
    const current = input.current[entry.property] ?? null;
    const skip = (reason: string, value: string | null = null): PlannedWrite => ({ key: f.key, property: entry.property, value, current, action: "skip", reason });
    const def = input.definitions[entry.property];
    if (!def) {
      plans.push(skip("Propriété introuvable dans HubSpot"));
      continue;
    }
    if (def.readOnly) {
      plans.push(skip("Propriété en lecture seule"));
      continue;
    }
    if (def.type !== entry.type) {
      plans.push(skip("Le type de la propriété a changé depuis le réglage"));
      continue;
    }
    const { value, reason } = valueFor(entry, input.memory[f.key] ?? []);
    if (value === null) {
      plans.push(skip(reason ?? "Rien à écrire"));
      continue;
    }
    if ((entry.type === "enumeration" || entry.type === "bool") && def.options.length > 0 && !def.options.includes(value)) {
      plans.push(skip("Option inexistante dans HubSpot", value));
      continue;
    }
    if (input.dealClosed) {
      plans.push(skip("Deal clos", value));
      continue;
    }
    const empty = current === null || current.trim() === "";
    if (!empty && same(current, value)) {
      plans.push(skip("Déjà à jour", value));
      continue;
    }
    if (!empty && entry.mode === "fill_if_empty") {
      plans.push(skip("Déjà remplie", value));
      continue;
    }
    if (!empty && entry.mode === "update_unless_edited" && !(input.lastWritten[entry.property] ?? []).some((v) => same(current, v))) {
      plans.push(skip("Modifiée à la main dans HubSpot", value));
      continue;
    }
    plans.push({ key: f.key, property: entry.property, value, current, action: "write", reason: null });
  }
  return plans;
}

// Ce que Brief a pu écrire avant le journal (migration 038) : pour chaque
// propriété texte reliée, le texte que chaque call du deal donnait, au format
// des envois d'avant le 27/10/2026 (tout ce que le call disait, confirmé ou
// non). Sans ça, une prochaine étape écrite par Brief passerait pour une
// saisie à la main et ne serait plus jamais mise à jour.
export function briefCandidates(
  mapping: HubspotMapping,
  memory: Partial<Record<DealMemoryFieldKey, (DealMemoryItem & { callId?: string })[]>>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(mapping) as [DealMemoryFieldKey, MappingEntry | undefined][]) {
    if (!entry || entry.type !== "string") continue;
    const byCall = new Map<string, string[]>();
    for (const item of memory[key] ?? []) byCall.set(item.callId ?? "", [...(byCall.get(item.callId ?? "") ?? []), item.text]);
    out[entry.property] = [...byCall.values()].map((texts) => (texts.length === 1 ? texts[0] : texts.map((t) => `• ${t}`).join("\n")));
  }
  return out;
}

// Le journal et les candidats réunis.
export function mergeWritten(journal: Record<string, string>, candidates: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = { ...candidates };
  for (const [property, value] of Object.entries(journal)) out[property] = [value, ...(out[property] ?? [])];
  return out;
}
