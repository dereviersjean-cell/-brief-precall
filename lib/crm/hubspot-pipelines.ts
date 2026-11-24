// Lecture des étapes d'un pipeline HubSpot. Volontairement SANS import :
// lib/crm/hubspot.ts tire la base de données, donc les variables
// d'environnement, et cette règle-là doit rester testable toute seule
// (tests/hubspot-pipelines.test.ts).

type RawStage = { id?: unknown; label?: unknown; metadata?: { isClosed?: unknown; probability?: unknown } };

/**
 * Les étapes gagnées d'un pipeline : fermées ET à 100 % de probabilité.
 *
 * ⚠ « Gagné » n'est PAS une étape nommée `closedwon`. Ce nom n'existe que
 * dans le pipeline par défaut d'un portail neuf ; dès qu'un client crée ses
 * propres pipelines, ses étapes portent des identifiants numériques et des
 * libellés à lui. Le filtre `dealstage = "closedwon"` d'avant le 24/11/2026
 * rendait donc zéro deal chez à peu près tous les vrais clients — constaté sur
 * le portail d'Oliverlist, dont l'étape gagnée s'appelle « Signé ».
 *
 * `probability` arrive en chaîne ("1.0", "0.5") et `isClosed` en "true"/"false".
 */
export function wonStagesOf(pipeline: { stages?: unknown }): { id: string; label: string }[] {
  const stages = Array.isArray(pipeline.stages) ? (pipeline.stages as RawStage[]) : [];
  return stages
    .filter((s) => String(s?.metadata?.isClosed) === "true" && Number(s?.metadata?.probability) === 1)
    .map((s) => ({ id: String(s.id), label: typeof s.label === "string" ? s.label : String(s.id) }));
}
