// Mesure le pipeline d'objections contre les fiches annotées à la main dans
// evals/objections/ (voir eval-objections-scaffold.ts pour les créer).
//
// Rejoue l'extraction ET le rattachement à chaque exécution, sur le transcript
// réel — on mesure le PIPELINE tel qu'il est aujourd'hui, pas les données
// stockées en base, qui peuvent dater d'un prompt antérieur.
//
// Trois chiffres à surveiller :
//  · rappel    — part des vraies objections retrouvées. Baisse = on rate du
//                signal, typiquement après avoir trop resserré la définition.
//  · précision — part des objections remontées qui en sont vraiment. Baisse =
//                du bruit, typiquement des questions prises pour des objections.
//  · catégorie — part des objections bien appariées dont le rattachement est
//                juste (« doit rester non classée » compte comme un succès).
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/eval-objections.ts [--verbose]

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "../lib/supabase";
import { getUserOrganizationId, listObjectionCategories } from "../lib/db";
import { extractObjectionsFromTranscript } from "../lib/call-analysis";
import { classifyAndEvaluateObjections } from "../lib/objection-classifier";
import { evaluateObjections, aggregate, MATCH_THRESHOLD, type EvalResult, type ExpectedObjection } from "../lib/objection-eval";

const EVAL_DIR = join(process.cwd(), "evals", "objections");

type Fixture = {
  callId: string;
  company?: string | null;
  reviewed?: boolean;
  expected: ExpectedObjection[];
};

function pct(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(0)} %`;
}

async function main() {
  const verbose = process.argv.includes("--verbose");

  let files: string[];
  try {
    files = readdirSync(EVAL_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    console.error(`Aucune fiche dans ${EVAL_DIR}. Lancez d'abord scripts/eval-objections-scaffold.ts.`);
    process.exit(1);
  }

  const results: EvalResult[] = [];
  let skipped = 0;

  for (const file of files) {
    const fixture = JSON.parse(readFileSync(join(EVAL_DIR, file), "utf8")) as Fixture;

    // Une fiche non relue n'est que la sortie du pipeline recopiée : la
    // compter reviendrait à mesurer le pipeline contre lui-même et à afficher
    // 100 % partout. C'est le seul garde-fou contre une éval qui se ment.
    if (!fixture.reviewed) {
      console.warn(`· ${fixture.callId.slice(0, 8)} — IGNORÉ (reviewed: false, fiche pas encore annotée)`);
      skipped++;
      continue;
    }

    const { data } = await supabaseAdmin
      .from("calls")
      .select("user_id, transcript")
      .eq("id", fixture.callId)
      .maybeSingle();
    const call = data as { user_id: string; transcript: string | null } | null;
    if (!call?.transcript) {
      console.warn(`· ${fixture.callId.slice(0, 8)} — transcript introuvable, ignoré`);
      skipped++;
      continue;
    }

    const organizationId = await getUserOrganizationId(call.user_id);
    const categories = organizationId ? await listObjectionCategories(organizationId) : [];
    const labelById = new Map(categories.map((c) => [c.id, c.label]));

    const objections = await extractObjectionsFromTranscript(call.transcript);
    const classified = await classifyAndEvaluateObjections(
      categories.map((c) => ({
        id: c.id,
        label: c.label,
        description: c.description,
        handling_guidance: c.handlingGuidance,
        example_phrasings: c.examplePhrasings,
      })),
      objections,
      call.transcript
    );

    const result = await evaluateObjections(
      fixture.expected,
      classified.map((c) => ({
        objection: c.objection,
        categoryLabel: c.categoryId ? labelById.get(c.categoryId) ?? null : null,
      }))
    );
    results.push(result);

    console.log(
      `\n· ${fixture.company ?? fixture.callId.slice(0, 8)} — attendu ${fixture.expected.length}, trouvé ${classified.length} | ` +
        `précision ${pct(result.precision)}, rappel ${pct(result.recall)}, catégorie ${pct(result.categoryAccuracy)}`
    );

    for (const miss of result.missed) {
      console.log(`    RATÉE      : ${miss.objection.slice(0, 100)}`);
    }
    for (const extra of result.spurious) {
      console.log(`    EN TROP    : ${extra.objection.slice(0, 100)}`);
    }
    for (const pair of result.matched.filter((m) => !m.categoryCorrect)) {
      console.log(
        `    MAL RANGÉE : ${pair.expected.objection.slice(0, 70)}\n` +
          `                 attendu « ${pair.expected.category ?? "non classée"} », obtenu « ${pair.predicted.categoryLabel ?? "non classée"} »`
      );
    }
    if (verbose) {
      for (const pair of result.matched.filter((m) => m.categoryCorrect)) {
        console.log(`    OK (${pair.similarity.toFixed(2)}) : ${pair.expected.objection.slice(0, 80)}`);
      }
    }
  }

  if (results.length === 0) {
    console.error("\nAucune fiche annotée exploitable. Passez `reviewed` à true après avoir corrigé une fiche.");
    process.exit(1);
  }

  const total = aggregate(results);
  console.log("\n=== Total ===");
  console.log(`calls évalués      : ${results.length}${skipped > 0 ? ` (${skipped} ignoré(s))` : ""}`);
  console.log(`précision          : ${pct(total.precision)}   (part des objections remontées qui en sont vraiment)`);
  console.log(`rappel             : ${pct(total.recall)}   (part des vraies objections retrouvées)`);
  console.log(`F1                 : ${pct(total.f1)}`);
  console.log(`rattachement juste : ${pct(total.categoryAccuracy)}`);
  console.log(`\n(appariement sémantique au seuil ${MATCH_THRESHOLD})`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("\nFailed:", err);
    process.exit(1);
  }
);
