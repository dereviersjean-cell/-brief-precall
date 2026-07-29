// Prépare une fiche d'annotation par call dans evals/objections/.
//
// Le fichier est PRÉ-REMPLI avec ce que le pipeline actuel trouve — pas pour
// te faire valider l'existant, mais pour t'éviter de tout retaper. Le biais
// est réel (on a tendance à approuver ce qui est déjà écrit), d'où le champ
// `reviewed: false` : tant qu'il n'est pas passé à true, le script d'éval
// refuse de compter ce call. Lis le transcript, corrige, puis bascule le flag.
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/eval-objections-scaffold.ts [<callId> …]
//
// Sans argument : prend les calls de l'organisation qui ont le plus
// d'objections détectées (les plus riches à annoter).

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "../lib/supabase";
import { getUserOrganizationId, listObjectionCategories } from "../lib/db";
import { extractObjectionsFromTranscript } from "../lib/call-analysis";
import { classifyAndEvaluateObjections } from "../lib/objection-classifier";

const EVAL_DIR = join(process.cwd(), "evals", "objections");
const DEFAULT_CALL_COUNT = 4;

type CallRow = { id: string; user_id: string; company_name: string | null; started_at: string | null; transcript: string | null };

async function pickCalls(explicitIds: string[]): Promise<CallRow[]> {
  if (explicitIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("calls")
      .select("id, user_id, company_name, started_at, transcript")
      .in("id", explicitIds);
    if (error) throw error;
    return (data ?? []) as CallRow[];
  }

  const { data: objections } = await supabaseAdmin.from("call_objections").select("call_id");
  const counts = new Map<string, number>();
  for (const row of ((objections ?? []) as { call_id: string }[])) {
    counts.set(row.call_id, (counts.get(row.call_id) ?? 0) + 1);
  }
  const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, DEFAULT_CALL_COUNT).map(([id]) => id);
  if (ids.length === 0) throw new Error("Aucun call avec des objections en base — passez des ids explicitement.");
  return pickCalls(ids);
}

async function main() {
  const explicitIds = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const calls = await pickCalls(explicitIds);

  mkdirSync(EVAL_DIR, { recursive: true });

  for (const call of calls) {
    const path = join(EVAL_DIR, `${call.id}.json`);
    if (existsSync(path)) {
      console.log(`· ${call.id.slice(0, 8)} — fiche déjà présente, laissée intacte`);
      continue;
    }
    if (!call.transcript) {
      console.warn(`· ${call.id.slice(0, 8)} — pas de transcript, ignoré`);
      continue;
    }

    const organizationId = await getUserOrganizationId(call.user_id);
    const categories = organizationId ? await listObjectionCategories(organizationId) : [];

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

    const labelById = new Map(categories.map((c) => [c.id, c.label]));

    writeFileSync(
      path,
      JSON.stringify(
        {
          _instructions: [
            "1. Ouvre le transcript du call (champ transcriptPreview, ou la page /feedback/<callId>).",
            "2. Dans `expected`, garde UNIQUEMENT les vraies objections : une réticence qui s'oppose à la vente, reformulable en « oui mais… ». Supprime les questions d'information.",
            "3. AJOUTE les objections réelles que le pipeline a ratées — c'est la moitié la plus importante du travail, et la seule qui mesure le rappel.",
            "4. Corrige `category` : le libellé exact d'une de tes catégories, ou null si aucune ne convient vraiment.",
            "5. Passe `reviewed` à true. Tant qu'il est à false, ce call n'est pas compté dans l'évaluation.",
          ],
          callId: call.id,
          company: call.company_name,
          date: call.started_at,
          reviewed: false,
          availableCategories: categories.map((c) => c.label),
          expected: classified.map((c) => ({
            objection: c.objection,
            category: c.categoryId ? labelById.get(c.categoryId) ?? null : null,
          })),
          transcriptPreview: call.transcript.slice(0, 2000),
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
    console.log(`· ${call.id.slice(0, 8)} — fiche créée (${classified.length} objection(s) proposée(s)) → ${path}`);
  }

  console.log(`\nFiches à annoter dans ${EVAL_DIR}. Puis : scripts/eval-objections.ts`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("\nFailed:", err);
    process.exit(1);
  }
);
