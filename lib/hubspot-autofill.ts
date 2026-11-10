import type { HubspotPropertyType } from "./hubspot-mapping";

// Mise à jour automatique des propriétés HubSpot après chaque call
// (10/11/2026, demande de Jean : « que le commercial n'ait plus à perdre du
// temps après chaque call à mettre à jour les propriétés »).
//
// Brief lit les propriétés du HubSpot du client (deal, contact, entreprise),
// propose lui-même celles qu'il sait remplir, le manager valide la liste une
// fois (Paramètres › HubSpot), puis tout part seul après chaque call.
//
// Ce module est la partie sans réseau, testée (tests/hubspot-autofill.test.ts) :
// quelles propriétés sont proposables, comment une valeur lue dans un call
// devient une valeur HubSpot valide, et pour chaque propriété : écrire, ou
// pas, et pourquoi. Trois garde-fous ne se discutent pas ici :
//   - une valeur sans passage du call qui la justifie n'est jamais écrite
//     (lib/hubspot-autofill-ai.ts ne transmet que les valeurs citées) ;
//   - une valeur saisie à la main n'est remplacée que si le manager a choisi
//     « même si elle est remplie » pour cette propriété ;
//   - l'étape du deal n'avance que vers l'avant, dans son pipeline, jamais
//     vers une étape de clôture.

export type AutofillObject = "deal" | "contact" | "company";
export const AUTOFILL_OBJECTS: AutofillObject[] = ["deal", "contact", "company"];
export const OBJECT_LABELS: Record<AutofillObject, string> = { deal: "Deal", contact: "Contact", company: "Entreprise" };

export type AutofillMode = "fill_if_empty" | "update_unless_edited" | "always";
export const AUTOFILL_MODES: { value: AutofillMode; label: string }[] = [
  { value: "fill_if_empty", label: "Si elle est vide" },
  { value: "update_unless_edited", label: "À chaque call, sauf modifiée à la main" },
  { value: "always", label: "À chaque call, même si elle est remplie" },
];

export type AutofillLink = {
  object: AutofillObject;
  property: string;
  label: string;
  type: HubspotPropertyType;
  // Ce que Brief y écrit : montré au manager, et donné tel quel au modèle.
  what: string;
  mode: AutofillMode;
  enabled: boolean;
  // Pourquoi le manager doit y regarder à deux fois, sinon null.
  check: string | null;
  // Une valeur déjà présente dans le HubSpot du client, pour l'écran.
  example: string | null;
};

export type AutofillConfig = {
  active: boolean;
  links: AutofillLink[];
  validatedAt: string | null;
  validatedBy: string | null;
};

// Une propriété telle que HubSpot la décrit (GET /crm/v3/properties/{objet}).
export type AutofillProperty = {
  name: string;
  label: string;
  description: string;
  type: string;
  fieldType: string;
  options: { label: string; value: string }[];
  readOnly: boolean;
  custom: boolean;
};

export const linkId = (l: { object: AutofillObject; property: string }) => `${l.object}.${l.property}`;

// Les trois propriétés qui pilotent la prévision : proposées comme le reste
// (décision de Jean, 10/11/2026), mais toujours marquées « à vérifier ».
export const FORECAST_PROPERTIES = ["amount", "closedate", "dealstage"];
export const FORECAST_CHECK = "pilote votre prévision";

// Les propriétés standard de HubSpot que Brief sait remplir depuis un call.
// Toutes les propriétés créées par le client sont candidates ; les standard,
// seulement celles-ci (HubSpot en compte plusieurs centaines, presque toutes
// techniques).
const STANDARD: Record<AutofillObject, string[]> = {
  deal: ["amount", "closedate", "dealstage", "hs_next_step", "description"],
  contact: ["jobtitle", "phone", "mobilephone", "hs_buying_role", "city", "country"],
  company: ["numberofemployees", "annualrevenue", "industry", "city", "country", "description"],
};

const MAX_CANDIDATES = 120;

export function linkType(p: Pick<AutofillProperty, "type">): HubspotPropertyType | null {
  if (p.type === "string" || p.type === "phone_number") return "string";
  if (p.type === "number" || p.type === "date" || p.type === "datetime" || p.type === "enumeration" || p.type === "bool") return p.type;
  return null;
}

// Ce que Brief peut proposer au manager pour un objet.
export function candidateProperties(object: AutofillObject, properties: AutofillProperty[]): AutofillProperty[] {
  const standard = new Set(STANDARD[object]);
  return properties
    .filter((p) => !p.readOnly && linkType(p) !== null)
    .filter((p) => !["file", "html", "calculation_equation"].includes(p.fieldType))
    .filter((p) => (p.custom ? true : standard.has(p.name)))
    // Les standard d'abord, dans l'ordre de la liste ; puis les propriétés du
    // client par ordre alphabétique.
    .sort((a, b) => {
      const ia = a.custom ? Infinity : STANDARD[object].indexOf(a.name);
      const ib = b.custom ? Infinity : STANDARD[object].indexOf(b.name);
      return ia !== ib ? ia - ib : a.label.localeCompare(b.label, "fr");
    })
    .slice(0, MAX_CANDIDATES);
}

// La date de clôture est toujours remplie (HubSpot la pose à la création) et
// l'étape aussi : « si elle est vide » n'écrirait jamais rien.
export function defaultAutofillMode(object: AutofillObject, property: string): AutofillMode {
  if (object === "deal" && (property === "closedate" || property === "dealstage")) return "always";
  if (object === "deal" && property === "hs_next_step") return "update_unless_edited";
  return "fill_if_empty";
}

const DEFAULT_WHAT: Record<string, string> = {
  "deal.amount": "Le montant de l'offre annoncé au prospect",
  "deal.closedate": "La date de signature visée",
  "deal.dealstage": "L'étape atteinte après le call",
  "deal.hs_next_step": "Les suites convenues, avec leur date",
};
export const defaultWhat = (object: AutofillObject, property: string): string | null => DEFAULT_WHAT[`${object}.${property}`] ?? null;

function isMode(v: unknown): v is AutofillMode {
  return v === "fill_if_empty" || v === "update_unless_edited" || v === "always";
}
function isType(v: unknown): v is HubspotPropertyType {
  return v === "string" || v === "number" || v === "date" || v === "datetime" || v === "enumeration" || v === "bool";
}
const text = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

// La configuration telle qu'elle sort de la base (ou du navigateur) : rien
// n'est tenu pour acquis. Null si elle n'a jamais été enregistrée.
export function coerceAutofillConfig(raw: unknown): AutofillConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.links)) return null;
  const seen = new Set<string>();
  const links: AutofillLink[] = [];
  for (const item of r.links) {
    if (!item || typeof item !== "object") continue;
    const l = item as Record<string, unknown>;
    const object = l.object;
    if (object !== "deal" && object !== "contact" && object !== "company") continue;
    const property = text(l.property, 200);
    if (!property || !isType(l.type)) continue;
    const id = `${object}.${property}`;
    if (seen.has(id)) continue;
    seen.add(id);
    links.push({
      object,
      property,
      label: text(l.label, 200) || property,
      type: l.type,
      what: text(l.what, 240),
      mode: isMode(l.mode) ? l.mode : defaultAutofillMode(object, property),
      enabled: l.enabled === true,
      check: text(l.check, 120) || null,
      example: text(l.example, 160) || null,
    });
  }
  return {
    active: r.active === true,
    links,
    validatedAt: typeof r.validatedAt === "string" ? r.validatedAt : null,
    validatedBy: typeof r.validatedBy === "string" ? r.validatedBy : null,
  };
}

// Ce que le manager enregistre, revalidé contre les propriétés lues à
// l'instant dans son HubSpot : une propriété disparue, passée en lecture
// seule ou d'un type que Brief ne sait pas écrire est écartée ; le libellé et
// le type viennent de HubSpot, jamais du navigateur.
export function validateLinks(links: AutofillLink[], properties: Record<AutofillObject, AutofillProperty[]>): AutofillLink[] {
  const out: AutofillLink[] = [];
  for (const link of links) {
    const def = properties[link.object].find((p) => p.name === link.property);
    const type = def ? linkType(def) : null;
    if (!def || def.readOnly || !type || !link.what) continue;
    out.push({
      ...link,
      label: link.object === "deal" && link.property === "dealstage" ? "Étape du deal" : def.label,
      type,
      check: link.object === "deal" && FORECAST_PROPERTIES.includes(link.property) ? FORECAST_CHECK : link.check,
    });
  }
  return out;
}

// ─── D'une valeur lue dans un call à une valeur HubSpot ─────────────────────

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export type CoerceTarget = { type: HubspotPropertyType; options: { label: string; value: string }[]; multiple?: boolean };

function matchOption(raw: unknown, options: { label: string; value: string }[]): string | null {
  if (typeof raw !== "string" && typeof raw !== "number" && typeof raw !== "boolean") return null;
  const wanted = fold(String(raw));
  if (!wanted) return null;
  return (options.find((o) => o.value === String(raw)) ?? options.find((o) => fold(o.value) === wanted) ?? options.find((o) => fold(o.label) === wanted))?.value ?? null;
}

// Ce que le modèle a relevé, mis au format exact de la propriété — ou rien,
// avec la raison. Jamais d'à-peu-près : un montant flou, une date
// incomplète, une option qui n'existe pas ne sont pas écrits.
export function coerceAutofillValue(target: CoerceTarget, raw: unknown): { value: string | null; reason: string | null } {
  const no = (reason: string) => ({ value: null, reason });
  if (raw === null || raw === undefined || raw === "") return no("Pas dite dans le call");
  switch (target.type) {
    case "string": {
      if (typeof raw !== "string" && typeof raw !== "number") return no("Valeur illisible");
      const value = String(raw).trim().slice(0, 5000);
      return value ? { value, reason: null } : no("Pas dite dans le call");
    }
    case "number": {
      const n = typeof raw === "number" ? raw : typeof raw === "string" && /^-?\d+([.,]\d+)?$/.test(raw.replace(/[\s  ]/g, "")) ? Number(raw.replace(/[\s  ]/g, "").replace(",", ".")) : NaN;
      return Number.isFinite(n) ? { value: String(n), reason: null } : no("Pas de nombre précis");
    }
    case "date":
    case "datetime": {
      const m = typeof raw === "string" ? raw.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
      if (!m) return no("Pas de date précise");
      const day = `${m[1]}-${m[2]}-${m[3]}`;
      const parsed = new Date(`${day}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) return no("Pas de date précise");
      return { value: target.type === "date" ? day : `${day}T00:00:00.000Z`, reason: null };
    }
    case "bool": {
      const v = typeof raw === "boolean" ? raw : typeof raw === "string" ? (["true", "oui", "yes"].includes(fold(raw)) ? true : ["false", "non", "no"].includes(fold(raw)) ? false : null) : null;
      return v === null ? no("Ni oui ni non") : { value: v ? "true" : "false", reason: null };
    }
    case "enumeration": {
      const list = Array.isArray(raw) ? raw : [raw];
      const values = [...new Set(list.map((v) => matchOption(v, target.options)))];
      if (values.length === 0 || values.some((v) => v === null)) return no("Option inexistante dans HubSpot");
      if (values.length > 1 && !target.multiple) return no("Plusieurs options pour une liste à choix unique");
      return { value: values.join(";"), reason: null };
    }
  }
}

// Deux valeurs sont les mêmes si HubSpot les afficherait pareil : casse et
// espaces ignorés, dates comparées au jour, nombres à la valeur.
export function sameValue(type: HubspotPropertyType, a: string | null | undefined, b: string | null | undefined): boolean {
  const x = (a ?? "").trim();
  const y = (b ?? "").trim();
  if (type === "date" || type === "datetime") return x.slice(0, 10) === y.slice(0, 10);
  if (type === "number") return x !== "" && y !== "" && Number(x) === Number(y);
  if (type === "enumeration") return x.split(";").map(fold).sort().join(";") === y.split(";").map(fold).sort().join(";");
  return fold(x) === fold(y);
}

// ─── Écrire, ou pas, et pourquoi ────────────────────────────────────────────

export type StageContext = {
  // Les étapes du pipeline du deal, dans l'ordre.
  stages: { id: string; label: string; closed: boolean }[];
  currentStageId: string | null;
};

export type AutofillPlan = {
  object: AutofillObject;
  property: string;
  label: string;
  value: string | null;
  current: string | null;
  action: "write" | "skip";
  reason: string | null;
};

export type ExtractedValue = { value: unknown; evidence: boolean };

export function planAutofill(input: {
  links: AutofillLink[];
  // Par identifiant de lien (« deal.amount ») : ce que le call en dit.
  extracted: Record<string, ExtractedValue | undefined>;
  // Les valeurs actuelles dans HubSpot, par identifiant de lien.
  current: Record<string, string | null | undefined>;
  // Ce que Brief a déjà écrit dans ces objets, par identifiant de lien.
  lastWritten: Record<string, string | undefined>;
  definitions: Record<AutofillObject, AutofillProperty[]>;
  // L'objet HubSpot existe-t-il pour ce call, et peut-on y écrire ? Sinon, la raison.
  unavailable: Partial<Record<AutofillObject, string>>;
  dealClosed: boolean;
  stage: StageContext | null;
}): AutofillPlan[] {
  const plans: AutofillPlan[] = [];
  for (const link of input.links) {
    if (!link.enabled) continue;
    const id = linkId(link);
    const current = input.current[id] ?? null;
    const skip = (reason: string, value: string | null = null) =>
      plans.push({ object: link.object, property: link.property, label: link.label, value, current, action: "skip", reason });

    const blocked = input.unavailable[link.object];
    if (blocked) { skip(blocked); continue; }
    const def = input.definitions[link.object].find((p) => p.name === link.property);
    if (!def) { skip("Propriété introuvable dans HubSpot"); continue; }
    if (def.readOnly) { skip("Propriété en lecture seule"); continue; }
    if (linkType(def) !== link.type) { skip("Le type de la propriété a changé depuis le réglage"); continue; }

    const found = input.extracted[id];
    if (!found || found.value === null || found.value === undefined || found.value === "") { skip("Pas dite dans le call"); continue; }
    if (!found.evidence) { skip("Aucun passage du call ne la confirme"); continue; }

    const isStage = link.object === "deal" && link.property === "dealstage";
    const options = isStage ? (input.stage?.stages ?? []).map((s) => ({ label: s.label, value: s.id })) : def.options;
    const { value, reason } = coerceAutofillValue({ type: link.type, options, multiple: def.fieldType === "checkbox" }, found.value);
    if (value === null) { skip(isStage && reason === "Option inexistante dans HubSpot" ? "Étape absente du pipeline de ce deal" : reason ?? "Rien à écrire"); continue; }

    if (link.object === "deal" && input.dealClosed) { skip("Deal clos", value); continue; }
    const empty = current === null || current.trim() === "";
    if (!empty && sameValue(link.type, current, value)) { skip("Déjà à jour", value); continue; }

    if (isStage) {
      const stages = input.stage?.stages ?? [];
      const from = stages.findIndex((s) => s.id === input.stage?.currentStageId);
      const to = stages.findIndex((s) => s.id === value);
      if (to < 0 || from < 0) { skip("Étape absente du pipeline de ce deal", value); continue; }
      if (stages[to].closed) { skip("Brief ne clôt jamais un deal", value); continue; }
      if (to <= from) { skip("Brief ne fait jamais reculer un deal", value); continue; }
    }

    if (!empty && link.mode === "fill_if_empty") { skip("Déjà remplie", value); continue; }
    if (!empty && link.mode === "update_unless_edited") {
      const mine = input.lastWritten[id];
      if (mine === undefined || !sameValue(link.type, current, mine)) { skip("Modifiée à la main dans HubSpot", value); continue; }
    }
    plans.push({ object: link.object, property: link.property, label: link.label, value, current, action: "write", reason: null });
  }
  return plans;
}

// ─── Affichage d'un exemple ─────────────────────────────────────────────────

// Une valeur HubSpot telle qu'un humain la lirait (colonne « Exemple, déjà
// dans votre HubSpot »).
export function formatExample(type: HubspotPropertyType, raw: string, options: { label: string; value: string }[], property?: string): string {
  const value = raw.trim();
  if (type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    const s = n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    return property && /amount|montant|budget|revenue|chiffre/i.test(property) ? `${s} €` : s;
  }
  if (type === "date" || type === "datetime") {
    const d = new Date(/^\d+$/.test(value) ? Number(value) : value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }
  if (type === "bool") return value === "true" ? "Oui" : value === "false" ? "Non" : value;
  if (type === "enumeration") return value.split(";").map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");
  const flat = value.replace(/\s+/g, " ");
  return flat.length > 90 ? `${flat.slice(0, 88).trimEnd()}…` : flat;
}

// Le premier exemple non vide parmi des objets récents.
export function pickExample(link: Pick<AutofillLink, "property" | "type">, options: { label: string; value: string }[], rows: Record<string, string | null>[]): string | null {
  for (const row of rows) {
    const raw = row[link.property];
    if (typeof raw === "string" && raw.trim() !== "") return formatExample(link.type, raw, options, link.property);
  }
  return null;
}
