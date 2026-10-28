import {
  createDealFromHubspot,
  findDealByHubspotId,
  findDealByIdentity,
  findOrCreateDeal,
  getCallActivityForUsers,
  getCallDealMemory,
  getDealHistory,
  getDealMemoryObjections,
  getDealPageFiches,
  getOrganizationEmailDomains,
  getOrganizationForUser,
  getHubspotUserForOrganization,
  getOrganizationDealRules,
  getProgressFichesForUser,
  getUserName,
  saveCallDealMemory,
  setCommercialAdvice,
  setCallDealAdvice,
  setCallNextQuestions,
  setDealHubspot,
  teachDealDomain,
  type CallWithAnalysis,
} from "./db";
import { generateDealMemory } from "./deal-memory";
import { dealIdentityFor } from "./deal-grouping";
import type { AiDealAdvice, AiPersonAdvice, DealHistoryEntry, DealMemoryContent, HubspotDealSnapshot, NextQuestions, StoredDealMemory } from "./deal-memory-schema";
import { dealObjectives, mergeKnown, type ItemsByField } from "./call-objectives";
import { tailorObjectiveQuestions } from "./objective-questions";
import { writeDealAdvice } from "./deal-advice-ai";
import { writePersonAdvice } from "./person-advice-ai";
import { buildDealProgressNow } from "./deal-progress";
import { findHubSpotDealForProspect, getHubSpotDealDomains, getHubSpotDealSnapshot } from "./crm/hubspot-deals";
import { reportWarning } from "./monitoring";

// Étape 3 : le deal HubSpot du prospect, lu avec la connexion HubSpot du
// commercial du call, sinon d'un autre membre de l'organisation. Un échec de
// HubSpot ne bloque pas la fiche : elle se rattache alors comme à l'étape 2.
async function findHubspotDeal(
  organizationId: string,
  call: CallWithAnalysis,
  identity: { domain: string | null; name: string | null } | null
): Promise<HubspotDealSnapshot | null> {
  try {
    const hubspotUser = await getHubspotUserForOrganization(organizationId, [call.user_id]);
    if (!hubspotUser) return null;
    const hubspotDealId = await findHubSpotDealForProspect(hubspotUser, {
      contactEmail: call.contact_email,
      domain: identity?.domain ?? null,
      companyName: identity?.name ?? null,
    });
    return hubspotDealId ? await getHubSpotDealSnapshot(hubspotUser, hubspotDealId) : null;
  } catch (err) {
    reportWarning("deal-memory.hubspot", err, { callId: call.id });
    return null;
  }
}

// Un deal retrouvé par HubSpot mais sans domaine (calls sans email de contact,
// cf. Peatch AI) : le domaine de l'entreprise ou des contacts HubSpot du deal
// lui est appris, pour que le brief du rendez-vous suivant le retrouve par
// l'email du contact (28/10/2026). Un échec ne touche pas la fiche.
async function learnDomainFromHubspot(organizationId: string, dealId: string, hubspotDealId: string, call: CallWithAnalysis, ownDomains: string[]) {
  try {
    const hubspotUser = await getHubspotUserForOrganization(organizationId, [call.user_id]);
    if (!hubspotUser) return;
    await teachDealDomain(organizationId, dealId, await getHubSpotDealDomains(hubspotUser, hubspotDealId), ownDomains);
  } catch (err) {
    reportWarning("deal-memory.learn-domain", err, { callId: call.id });
  }
}

// Génère la fiche d'un call en tenant compte de son deal (étape 2) :
//  1. on cherche le deal d'après ce que le call sait déjà du prospect (email,
//     entreprise) ;
//  2. la fiche est générée avec ce que les calls précédents du deal ont
//     retenu, pour les alertes qui comparent ;
//  3. sans repère au départ, l'entreprise relevée par la fiche elle-même sert
//     à rattacher le call. Si elle désigne un deal qui avait déjà des calls
//     antérieurs, la fiche est régénérée une fois avec cet historique — sinon
//     ce call-là ne comparerait rien.
// Partagé par la route de génération et le script de backfill.
export async function runDealMemoryForCall(call: CallWithAnalysis, organizationId: string): Promise<StoredDealMemory> {
  const callAt = call.started_at ?? call.created_at;
  const [ownDomains, commercialName, ownOrganization] = await Promise.all([
    getOrganizationEmailDomains(organizationId),
    getUserName(call.user_id).catch(() => null),
    getOrganizationForUser(call.user_id).catch(() => null),
  ]);
  const ownCompanyName = ownOrganization?.name ?? null;

  const base = {
    transcript: call.transcript,
    turns: call.transcript_json?.turns ?? null,
    speakerNames: call.speaker_names_override,
    commercialName,
    meetingTitle: call.meeting_title,
    callAt,
  };

  const knownIdentity = dealIdentityFor({
    contactEmail: call.contact_email,
    prospectCompany: call.prospect_company,
    companyName: call.company_name,
    ownDomains,
    ownCompanyName,
  });
  // Le deal HubSpot prime : deux calls rattachés au même deal HubSpot sont le
  // même deal dans Brief, quels que soient l'email ou l'entreprise saisis.
  const hubspot = await findHubspotDeal(organizationId, call, knownIdentity);
  let dealId: string | null = null;
  if (hubspot) {
    dealId =
      (await findDealByHubspotId(organizationId, hubspot.id)) ??
      (knownIdentity ? await findOrCreateDeal(organizationId, knownIdentity) : await createDealFromHubspot(organizationId, hubspot));
    await setDealHubspot(dealId, hubspot);
    await learnDomainFromHubspot(organizationId, dealId, hubspot.id, call, ownDomains);
  } else if (knownIdentity) {
    dealId = await findOrCreateDeal(organizationId, knownIdentity);
  }
  let history = dealId ? await getDealHistory(dealId, call.id, callAt) : [];

  let result = await generateDealMemory({ ...base, history });

  // Deal reconnu par le seul domaine : l'entreprise relevée par la fiche lui
  // donne son nom et un second repère.
  const extracted = dealIdentityFor({ contactEmail: null, prospectCompany: result.prospectCompany, companyName: null, ownDomains, ownCompanyName });
  if (dealId && knownIdentity && !knownIdentity.nameKey && extracted) {
    await findOrCreateDeal(organizationId, { domain: knownIdentity.domain, nameKey: extracted.nameKey, name: extracted.name });
  }

  if (!dealId) {
    const foundIdentity = extracted;
    if (foundIdentity) {
      const existing = await findDealByIdentity(organizationId, foundIdentity);
      dealId = await findOrCreateDeal(organizationId, foundIdentity);
      if (existing) {
        history = await getDealHistory(dealId, call.id, callAt);
        if (history.length > 0) result = await generateDealMemory({ ...base, history });
      }
    }
  }

  const stored = await saveCallDealMemory(call.id, organizationId, result, result.model, {
    dealId,
    callAt,
    prospectCompany: result.prospectCompany,
  });
  const nextQuestions = await writeNextQuestions(call.id, organizationId, result.prospectCompany ?? call.company_name ?? "le prospect", history, result);
  // Après les questions : le conseil les reprend.
  const advice = await writeDealAdviceForCall(call, organizationId);
  // Puis le conseil sur le commercial, qui reprend ceux de ses deals.
  await writePersonAdviceForUser(call.user_id, organizationId);
  return { ...stored, nextQuestions: nextQuestions ? { ...nextQuestions, advice } : nextQuestions };
}

function fold(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Le conseil de Brief rédigé par Haiku (lib/deal-advice-ai.ts, 28/10/2026),
// à partir de la fiche du call et de celles des calls précédents du même
// deal. Partagé avec le script de backfill. Un échec ne touche pas la fiche :
// les écrans gardent les conseils fixes.
export async function writeDealAdviceForCall(call: CallWithAnalysis, organizationId: string): Promise<AiDealAdvice | null> {
  try {
    const memory = await getCallDealMemory(call.id);
    if (!memory?.dealId) return null;
    const all = (await getDealPageFiches(memory.dealId, organizationId)) ?? [];
    const index = all.findIndex((f) => f.callId === call.id);
    if (index < 0) return null;
    const fiches = all.slice(0, index + 1);
    const rules = await getOrganizationDealRules(organizationId);
    const [progress] = buildDealProgressNow(fiches, rules);
    const latest = fiches[fiches.length - 1];
    const [objections, commercialName] = await Promise.all([getDealMemoryObjections(call.id).catch(() => []), getUserName(call.user_id).catch(() => null)]);
    const override = call.speaker_names_override ?? {};
    const participants = [
      ...new Set((call.transcript_json?.turns ?? []).map((t) => (override[t.speaker_id] || t.speaker_name_raw || "").trim()).filter(Boolean)),
    ].filter((name) => !commercialName || fold(name) !== fold(commercialName));

    const result = await writeDealAdvice({
      dealName: progress.name,
      commercialName,
      participants,
      rank: fiches.length,
      callAt: latest.callAt,
      known: mergeKnown(fiches.map((f) => f.fields)),
      commitments: (latest.fields.prochaines_etapes ?? []).map((c) => ({ text: c.text, date: c.date ?? null })),
      objections,
      alerts: latest.alerts,
      summary: call.analysis?.summary ?? null,
      nextPlan: progress.objectives ? { rank: progress.objectives.plan.rank, items: progress.objectives.plan.items.map((i) => ({ label: i.label, question: i.question })) } : null,
    });
    await setCallDealAdvice(call.id, result.advice, fiches.length + 1);
    return result.advice;
  } catch (err) {
    reportWarning("deal-memory.advice", err, { callId: call.id });
    return null;
  }
}

// Les questions du prochain call (27/10/2026) : ce qui reste à aller chercher
// d'après les objectifs du manager, une question par information, rédigée par
// Haiku. Un échec ne touche pas la fiche : les écrans gardent les questions
// fixes.
async function writeNextQuestions(
  callId: string,
  organizationId: string,
  dealName: string,
  history: DealHistoryEntry[],
  current: DealMemoryContent
): Promise<NextQuestions | null> {
  try {
    const fiches: ItemsByField[] = [...history.map((h) => h.content.fields), current.fields];
    const objectives = dealObjectives(fiches, await getOrganizationDealRules(organizationId));
    if (!objectives || objectives.plan.items.length === 0) {
      await setCallNextQuestions(callId, null);
      return null;
    }
    const result = await tailorObjectiveQuestions({ dealName, nextRank: objectives.plan.rank, known: mergeKnown(fiches), items: objectives.plan.items });
    const value: NextQuestions = { rank: objectives.plan.rank, questions: result.questions, model: result.model, generatedAt: new Date().toISOString() };
    await setCallNextQuestions(callId, value);
    return value;
  } catch (err) {
    reportWarning("deal-memory.next-questions", err, { callId });
    return null;
  }
}

// Le conseil sur un commercial pour son manager (lib/person-advice-ai.ts,
// 28/10/2026), réécrit après chacun de ses calls à partir de tous ses deals en
// cours. Partagé avec le script de backfill. Un échec ne touche rien d'autre :
// l'onglet Équipe garde les règles fixes.
export async function writePersonAdviceForUser(userId: string, organizationId: string): Promise<AiPersonAdvice | null> {
  try {
    const [fiches, rules, name, activity] = await Promise.all([
      getProgressFichesForUser(organizationId, userId),
      getOrganizationDealRules(organizationId),
      getUserName(userId).catch(() => null),
      getCallActivityForUsers([userId]).catch(() => ({}) as Record<string, { week: number }>),
    ]);
    const deals = buildDealProgressNow(fiches, rules).filter((d) => !d.hubspot?.closed);
    const result = await writePersonAdvice({ name: name ?? "le commercial", deals, week: activity[userId]?.week ?? 0 });
    if (result.advice) await setCommercialAdvice(userId, organizationId, result.advice);
    return result.advice;
  } catch (err) {
    reportWarning("deal-memory.person-advice", err, { userId });
    return null;
  }
}
