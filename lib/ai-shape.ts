import { reportWarning } from "./monitoring";

// Validation de forme des réponses JSON de l'IA.
//
// Le problème : les prompts vivent dans `admin_config` et sont éditables. Un
// manager qui réécrit un prompt ne sait pas que le code attend une forme JSON
// précise — il décrit ce qu'il veut lire, pas la structure. Le modèle le suit
// correctement, et le code reçoit autre chose que ce qu'il attend.
//
// Sans validation, ça ne lève AUCUNE erreur : `JSON.parse(...) as T` accepte
// n'importe quoi, et les valeurs manquantes deviennent des chaînes vides ou
// des listes vides via les valeurs de repli. L'utilisateur voit alors un
// email vide, un devis sans ligne, un playbook sans dimension — et croit que
// l'outil est cassé sans que personne ne soit alerté. C'est le bug #20
// (« William »), qui n'avait été corrigé que sur l'analyse de call.
//
// Règle : après CHAQUE `JSON.parse` d'une réponse IA dont le prompt est
// éditable, valider ici. Mieux vaut une erreur visible qu'un contenu vide.

export type FieldRule = "string" | "nonEmptyString" | "number" | "array" | "nonEmptyArray";

function check(value: unknown, rule: FieldRule): boolean {
  switch (rule) {
    case "string":
      return typeof value === "string";
    case "nonEmptyString":
      return typeof value === "string" && value.trim().length > 0;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "array":
      return Array.isArray(value);
    case "nonEmptyArray":
      return Array.isArray(value) && value.length > 0;
  }
}

/**
 * Vérifie qu'une réponse IA parsée a bien la forme attendue, et throw sinon.
 *
 * @param scope     clé de regroupement stable, forme « module.étape ».
 * @param promptKey clé `admin_config` du prompt concerné — c'est presque
 *                  toujours lui le coupable, autant le nommer dans l'erreur
 *                  pour que le diagnostic ne demande pas d'enquête.
 */
export function validateAiShape<T>(
  scope: string,
  promptKey: string,
  parsed: unknown,
  rules: Record<string, FieldRule>
): T {
  const obj = parsed as Record<string, unknown> | null;
  const offending: string[] = [];

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    offending.push("(la réponse n'est pas un objet JSON)");
  } else {
    for (const [field, rule] of Object.entries(rules)) {
      if (!check(obj[field], rule)) offending.push(`${field} (attendu : ${rule})`);
    }
  }

  if (offending.length === 0) return obj as T;

  const error = new Error(
    `Réponse IA hors contrat — ${offending.join(", ")}. Le prompt « ${promptKey} » a probablement été édité en base sans respecter la structure JSON attendue par le code.`
  );
  // Remontée explicite : sans elle, l'erreur ne serait vue que par
  // l'utilisateur qui subit la génération ratée, jamais par l'équipe.
  reportWarning(scope, error, { promptKey, offending });
  throw error;
}
