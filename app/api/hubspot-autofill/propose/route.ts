import { NextResponse } from "next/server";
import { autofillGuard } from "@/lib/hubspot-autofill-guard";
import { listHubSpotPipelines } from "@/lib/crm/hubspot-deals";
import { listHubSpotProperties, sampleHubSpotObjects } from "@/lib/crm/hubspot-objects";
import { AUTOFILL_OBJECTS, candidateProperties, pickExample, type AutofillObject, type AutofillProperty } from "@/lib/hubspot-autofill";
import { proposeAutofillLinks } from "@/lib/hubspot-autofill-ai";
import { reportError } from "@/lib/monitoring";

export const maxDuration = 60;

// Brief propose lui-même les correspondances : il relit les propriétés du
// HubSpot du client, choisit celles qu'un call peut remplir, et illustre
// chacune par une valeur déjà présente dans ce HubSpot. Rien n'est écrit ni
// enregistré : le manager valide ensuite (PUT /api/hubspot-autofill).
export async function POST() {
  const g = await autofillGuard();
  if ("response" in g) return g.response;
  const hubspotUser = g.hubspotUser;
  if (!hubspotUser) return NextResponse.json({ error: "HubSpot n'est pas connecté." }, { status: 400 });

  let candidates: Record<AutofillObject, AutofillProperty[]>;
  try {
    const deal = await listHubSpotProperties(hubspotUser, "deal");
    const [contact, company] = await Promise.all([listHubSpotProperties(hubspotUser, "contact"), listHubSpotProperties(hubspotUser, "company")]);
    candidates = { deal: candidateProperties("deal", deal), contact: candidateProperties("contact", contact), company: candidateProperties("company", company) };
  } catch {
    return NextResponse.json({ error: "Lecture des propriétés HubSpot impossible." }, { status: 502 });
  }

  try {
    const [links, pipelines, ...samples] = await Promise.all([
      proposeAutofillLinks(candidates),
      // Les étapes ne sont pas dans la définition de la propriété « dealstage ».
      listHubSpotPipelines(hubspotUser).catch(() => []),
      // Un exemple manquant n'empêche pas la proposition.
      ...AUTOFILL_OBJECTS.map((object) =>
        sampleHubSpotObjects(hubspotUser, object, candidates[object].map((p) => p.name)).catch(() => [] as Record<string, string | null>[])
      ),
    ]);
    const rows = Object.fromEntries(AUTOFILL_OBJECTS.map((object, i) => [object, samples[i]])) as Record<AutofillObject, Record<string, string | null>[]>;
    const withExamples = links.map((l) => {
      const options =
        l.object === "deal" && l.property === "dealstage"
          ? pipelines.flatMap((p) => p.stages.map((st) => ({ label: st.label, value: st.id })))
          : candidates[l.object].find((p) => p.name === l.property)?.options ?? [];
      return { ...l, example: pickExample(l, options, rows[l.object]) };
    });
    return NextResponse.json({ links: withExamples });
  } catch (err) {
    reportError("hubspot-autofill.propose", err, { organizationId: g.organizationId });
    return NextResponse.json({ error: "La proposition a échoué. Réessayez." }, { status: 502 });
  }
}
