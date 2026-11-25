// L'import des deals gagnés HubSpot en références. Écrit après l'import raté
// du 25/11/2026 (500 lignes sans secteur ni taille) pour voir ce qui serait
// créé avant de le créer.
//
// Simulation par défaut : rien n'est enregistré. `--apply` enregistre, et
// REMPLACE les références déjà venues de HubSpot (celles saisies à la main ou
// importées d'un fichier ne sont pas touchées).
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/preview-hubspot-references.ts --user=<id> [--pipeline=<id>] [--apply]

import { getCrmTokens, saveCrmTokens, referenceEmbeddingText, saveClientReferences } from "../lib/db";
import { getDealCompanies, getDealPipelines, getWonDeals, refreshHubspotToken } from "../lib/crm/hubspot";
import { buildReference } from "../lib/crm/hubspot-references";

function arg(name: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
}

async function main() {
  const userId = arg("user");
  if (!userId) throw new Error("--user=<id> manquant");

  const stored = await getCrmTokens(userId, "hubspot");
  if (!stored) throw new Error("cet utilisateur n'a pas connecté HubSpot");
  const renewed = await refreshHubspotToken(stored.refresh_token);
  await saveCrmTokens(userId, "hubspot", renewed.access_token, renewed.refresh_token);
  const token = renewed.access_token;

  const pipelines = (await getDealPipelines(token)).filter((p) => p.wonStages.length > 0);
  const wanted = arg("pipeline");
  const pipeline = wanted ? pipelines.find((p) => p.id === wanted) : pipelines[0];
  if (!pipeline) throw new Error(`pipelines disponibles : ${pipelines.map((p) => `${p.label} (${p.id})`).join(", ")}`);
  console.log(`pipeline : ${pipeline.label} — étapes gagnées : ${pipeline.wonStages.map((s) => s.label).join(", ")}`);

  const t0 = Date.now();
  const won = await getWonDeals(token, { stageIds: pipeline.wonStages.map((s) => s.id) });
  console.log(`deals rapatriés : ${won.deals.length} sur ${won.total} — ${Date.now() - t0} ms`);

  const t1 = Date.now();
  const companies = await getDealCompanies(token, won.deals.map((d) => d.id));
  console.log(`entreprises liées : ${companies.size} / ${won.deals.length} — ${Date.now() - t1} ms`);

  const refs = won.deals.map((d) => buildReference(d, companies.get(d.id) ?? null));
  const pct = (n: number) => `${n} (${Math.round((100 * n) / (refs.length || 1))} %)`;
  console.log(`secteur : ${pct(refs.filter((r) => r.sector).length)}`);
  console.log(`effectif : ${pct(refs.filter((r) => r.company_size).length)}`);
  console.log(`texte nourri : ${pct(refs.filter((r) => (r.raw_text ?? "").length > 40).length)}`);

  console.log("\n--- 3 références telles qu'elles seraient enregistrées ---");
  for (const r of refs.slice(0, 3)) {
    console.log(`• ${r.client_name} | ${r.sector ?? "—"} | ${r.company_size ?? "—"}`);
    console.log(`  raw_text : ${r.raw_text}`);
    console.log(`  embedding sur : ${referenceEmbeddingText(r).slice(0, 140)}…`);
  }
  if (!process.argv.includes("--apply")) {
    console.log(`\ntotal ${Date.now() - t0} ms. Simulation : rien d'enregistré (--apply pour enregistrer).`);
    return;
  }

  const t2 = Date.now();
  await saveClientReferences(userId, refs, { replaceSource: "hubspot" });
  console.log(`\n${refs.length} références enregistrées en ${Date.now() - t2} ms (les précédentes venues de HubSpot ont été remplacées).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
