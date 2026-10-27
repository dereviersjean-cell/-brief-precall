// Relit HubSpot pour une organisation (Deal Execution, étape 6, migration 034) :
// le parcours mesuré sur l'historique des étapes des deals de l'année, et la
// photo des deals suivis encore ouverts. Le cron refresh-deal-pipelines fait la
// même chose chaque matin à 7 h.
//
// Simulation par défaut : calcule et affiche le parcours, sans rien écrire.
// `--apply` enregistre le parcours et relit la photo des deals suivis.
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/refresh-deal-pipelines.ts --org=<id> [--apply]

import { getHubspotUserForOrganization } from "../lib/db";
import { getHubSpotPipelineStats } from "../lib/crm/hubspot-deals";
import { refreshDealPipelinesForOrganization } from "../lib/deal-pipeline-refresh";

function arg(name: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
}

async function main() {
  const orgId = arg("org");
  if (!orgId) throw new Error("--org=<id> manquant");

  if (process.argv.includes("--apply")) {
    console.log(await refreshDealPipelinesForOrganization(orgId));
    return;
  }

  const userId = await getHubspotUserForOrganization(orgId, []);
  if (!userId) throw new Error("Personne n'a connecté HubSpot dans cette organisation.");
  for (const p of await getHubSpotPipelineStats(userId, Date.now())) {
    console.log(`\n${p.pipelineLabel} — ${p.dealCount} deal(s) créés depuis un an`);
    for (const s of p.stages) {
      console.log(
        `  ${s.order + 1}. ${s.label} : ${s.current} en cours, ${s.reached} y sont passés · ` +
          `durée ${s.medianDays ?? "—"} j (${s.durationSamples} passages terminés) · ` +
          `passage ${s.passRate === null ? "—" : `${Math.round(s.passRate * 100)} %`} (${s.decided} tranchés)`
      );
    }
  }
  console.log("\nSimulation : rien d'enregistré (--apply pour enregistrer).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
