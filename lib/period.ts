// Sélection de période partagée par les onglets Performance > Objections et
// Performance > Analytics. Sans dépendance (ni lib/db, ni SDK) — importable
// côté client comme côté serveur, même règle que lib/meeting-stage.ts et
// lib/paris-week.ts (cf. bug #12, fuite du SDK Anthropic dans le bundle
// client par import transitif).

export type PeriodPreset = "7d" | "30d" | "90d" | "12m" | "all" | "custom";

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "3 mois" },
  { value: "12m", label: "12 mois" },
  { value: "all", label: "Tout" },
];

export type ResolvedPeriod = {
  preset: PeriodPreset;
  // Bornes ISO, null = pas de borne. `to` est fixé à la fin de la journée
  // pour qu'une date de fin saisie à la main inclue bien les calls du jour.
  from: string | null;
  to: string | null;
  label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isValidDateInput(value: string | undefined): value is string {
  return !!value && !Number.isNaN(new Date(value).getTime());
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// Résout les query params (?period=, ?from=, ?to=) en bornes exploitables.
// Défaut : 90 jours — assez large pour qu'un onglet ne s'ouvre pas vide chez
// une équipe qui fait peu de calls, assez court pour rester représentatif.
export function resolvePeriod(params: { period?: string; from?: string; to?: string }): ResolvedPeriod {
  const { period, from, to } = params;

  if (period === "custom" || (!period && (isValidDateInput(from) || isValidDateInput(to)))) {
    const fromIso = isValidDateInput(from) ? new Date(from).toISOString() : null;
    // Fin de journée incluse : sans cela, `to=2026-07-29` exclurait tout ce
    // qui s'est passé le 29 (interprété comme 00:00).
    const toIso = isValidDateInput(to) ? new Date(new Date(to).getTime() + DAY_MS - 1).toISOString() : null;
    const label =
      fromIso && toIso
        ? `du ${formatDay(fromIso)} au ${formatDay(toIso)}`
        : fromIso
        ? `depuis le ${formatDay(fromIso)}`
        : toIso
        ? `jusqu'au ${formatDay(toIso)}`
        : "toute la période";
    return { preset: "custom", from: fromIso, to: toIso, label };
  }

  const now = Date.now();
  switch (period) {
    case "7d":
      return { preset: "7d", from: new Date(now - 7 * DAY_MS).toISOString(), to: null, label: "7 derniers jours" };
    case "30d":
      return { preset: "30d", from: new Date(now - 30 * DAY_MS).toISOString(), to: null, label: "30 derniers jours" };
    case "12m":
      return { preset: "12m", from: new Date(now - 365 * DAY_MS).toISOString(), to: null, label: "12 derniers mois" };
    case "all":
      return { preset: "all", from: null, to: null, label: "depuis le début" };
    case "90d":
    default:
      return { preset: "90d", from: new Date(now - 90 * DAY_MS).toISOString(), to: null, label: "3 derniers mois" };
  }
}

// Reconstruit la query string en préservant les autres paramètres de la page
// (notamment ?commercial= du sélecteur manager).
export function periodSearchParams(
  preset: PeriodPreset,
  custom: { from?: string | null; to?: string | null } = {},
  extra: Record<string, string | null | undefined> = {}
): string {
  const params = new URLSearchParams();
  params.set("period", preset);
  if (preset === "custom") {
    if (custom.from) params.set("from", custom.from);
    if (custom.to) params.set("to", custom.to);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}
