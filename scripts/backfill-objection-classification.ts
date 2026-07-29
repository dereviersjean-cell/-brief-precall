// Backfill: range les objections DÉJÀ indexées dans call_objections dans les
// catégories définies par le manager (objection_categories, migration 006) et
// évalue la réponse apportée par le commercial.
//
// À lancer après avoir créé les catégories dans Performance > Objections,
// sinon il n'y a rien à quoi rattacher — le script s'arrête proprement en le
// disant. Relançable : par défaut il ne retouche que les lignes jamais
// classées (classified_at null), donc une deuxième exécution après l'ajout de
// nouvelles catégories ne re-consomme pas de tokens sur l'existant. Passer
// --all pour tout reclasser (à faire après une refonte des catégories).
//
// Traite les objections call par call — le classifieur voit ainsi l'ensemble
// des objections d'un même échange, ce qui donne de meilleurs rattachements
// qu'une suite de décisions isolées (même raison que dans lib/objections.ts).
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/backfill-objection-classification.ts [--org <uuid>] [--all]

import { supabaseAdmin } from "../lib/supabase";
import { listObjectionCategories } from "../lib/db";
import { classifyAndEvaluateObjections } from "../lib/objection-classifier";

type Row = {
  id: string;
  organization_id: string;
  call_id: string;
  objection: string;
  response: string;
  classified_at: string | null;
};

async function main() {
  const args = process.argv.slice(2);
  const orgFilter = args.includes("--org") ? args[args.indexOf("--org") + 1] : null;
  const reclassifyAll = args.includes("--all");

  let query = supabaseAdmin
    .from("call_objections")
    .select("id, organization_id, call_id, objection, response, classified_at");
  if (orgFilter) query = query.eq("organization_id", orgFilter);
  if (!reclassifyAll) query = query.is("classified_at", null);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    console.log("[backfill-classification] rien à classer.");
    return;
  }

  // Regroupé par organisation puis par call : les catégories sont
  // par organisation, le contexte de classification par call.
  const byOrg = new Map<string, Map<string, Row[]>>();
  for (const row of rows) {
    const orgCalls = byOrg.get(row.organization_id) ?? new Map<string, Row[]>();
    const callRows = orgCalls.get(row.call_id) ?? [];
    callRows.push(row);
    orgCalls.set(row.call_id, callRows);
    byOrg.set(row.organization_id, orgCalls);
  }

  let classified = 0;
  let attached = 0;
  let skippedNoCategories = 0;

  for (const [organizationId, orgCalls] of byOrg) {
    const categories = await listObjectionCategories(organizationId);
    if (categories.length === 0) {
      const count = Array.from(orgCalls.values()).reduce((sum, r) => sum + r.length, 0);
      console.warn(
        `[backfill-classification] org ${organizationId} — aucune catégorie définie, ${count} objection(s) ignorée(s). Créez-les dans Performance > Objections avant de relancer.`
      );
      skippedNoCategories += count;
      continue;
    }

    const categoriesForClassifier = categories.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      handling_guidance: c.handlingGuidance,
      example_phrasings: c.examplePhrasings,
    }));

    for (const [callId, callRows] of orgCalls) {
      const results = await classifyAndEvaluateObjections(
        categoriesForClassifier,
        callRows.map((r) => ({ objection: r.objection, response: r.response }))
      );

      for (let i = 0; i < callRows.length; i++) {
        const row = callRows[i];
        const result = results[i];
        if (!result) continue;

        const { error: updateError } = await supabaseAdmin
          .from("call_objections")
          .update({
            category_id: result.categoryId,
            handling_quality: result.handlingQuality,
            handling_comment: result.handlingComment,
            evaluated_against_playbook: result.evaluatedAgainstPlaybook,
            classified_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (updateError) {
          console.error(`[backfill-classification] update échoué pour ${row.id}:`, updateError.message);
          continue;
        }
        classified++;
        if (result.categoryId) attached++;
      }

      console.log(`[backfill-classification] call ${callId} — ${callRows.length} objection(s) traitée(s)`);
    }
  }

  console.log("\n=== Done ===");
  console.log({
    total: rows.length,
    classified,
    rattacheesAUneCategorie: attached,
    nonClassees: classified - attached,
    skippedNoCategories,
  });
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("\nFailed:", err);
    process.exit(1);
  }
);
