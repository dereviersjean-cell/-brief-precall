// Nettoyage ponctuel : supprime les objections empilées par des ré-analyses
// successives d'un même call.
//
// Jusqu'au 29/07/2026, indexCallObjections faisait un `insert` nu — un call
// ré-analysé ajoutait une nouvelle copie de ses objections au lieu de
// remplacer la précédente. Trois calls d'Oliverlist ré-analysés 5 à 7 fois
// avaient ainsi produit 72 lignes pour 13 objections réelles, et la même
// objection s'affichait huit fois dans le détail d'une catégorie.
// lib/objections.ts est corrigé ; ce script rattrape l'existant.
//
// Règle retenue : pour chaque call, on ne garde que la DERNIÈRE passe
// d'analyse. Les lignes d'une même passe sont insérées ensemble, donc
// partagent (à la seconde près) le même created_at — d'où le regroupement par
// fenêtre. C'est la version courante de l'analyse ; les passes antérieures
// sont des états périmés, pas des objections supplémentaires.
//
// SIMULATION PAR DÉFAUT : sans --apply, le script n'écrit rien et se contente
// d'afficher ce qu'il supprimerait.
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/dedupe-call-objections.ts [--apply]

import { supabaseAdmin } from "../lib/supabase";

type Row = { id: string; call_id: string; objection: string; created_at: string };

// Deux insertions séparées de plus de 2 min ne viennent pas de la même passe.
// Une passe insère toutes ses lignes en un seul appel : l'écart réel y est de
// l'ordre de la milliseconde, la marge est large exprès.
const SAME_RUN_WINDOW_MS = 120_000;

async function main() {
  const apply = process.argv.includes("--apply");

  const { data, error } = await supabaseAdmin
    .from("call_objections")
    .select("id, call_id, objection, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const byCall = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byCall.get(row.call_id) ?? [];
    list.push(row);
    byCall.set(row.call_id, list);
  }

  const toDelete: Row[] = [];
  let keptTotal = 0;

  for (const [callId, callRows] of byCall) {
    const runs: Row[][] = [];
    for (const row of callRows) {
      const lastRun = runs[runs.length - 1];
      const lastStamp = lastRun ? +new Date(lastRun[lastRun.length - 1].created_at) : null;
      if (lastRun && lastStamp !== null && +new Date(row.created_at) - lastStamp < SAME_RUN_WINDOW_MS) {
        lastRun.push(row);
      } else {
        runs.push([row]);
      }
    }

    const kept = runs[runs.length - 1];
    keptTotal += kept.length;
    if (runs.length === 1) continue;

    for (const run of runs.slice(0, -1)) toDelete.push(...run);
    console.log(
      `call ${callId.slice(0, 8)} : ${runs.length} passes, ${callRows.length} lignes → on garde les ${kept.length} de la passe du ${kept[0].created_at.slice(0, 19)}`
    );
    for (const run of runs.slice(0, -1)) {
      console.log(`    · passe du ${run[0].created_at.slice(0, 19)} — ${run.length} ligne(s) supprimée(s)`);
    }
  }

  console.log("\n=== Bilan ===");
  console.log({ total: rows.length, conservees: keptTotal, aSupprimer: toDelete.length });

  if (toDelete.length === 0) {
    console.log("Rien à nettoyer.");
    return;
  }

  if (!apply) {
    console.log("\nSIMULATION — aucune suppression effectuée. Relancer avec --apply pour appliquer.");
    return;
  }

  // Par paquets : `in` sur plusieurs centaines d'ids d'un coup fait exploser
  // la longueur de l'URL PostgREST.
  for (let i = 0; i < toDelete.length; i += 100) {
    const ids = toDelete.slice(i, i + 100).map((r) => r.id);
    const { error: deleteError } = await supabaseAdmin.from("call_objections").delete().in("id", ids);
    if (deleteError) throw deleteError;
  }
  console.log(`\n${toDelete.length} ligne(s) supprimée(s).`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("\nFailed:", err);
    process.exit(1);
  }
);
