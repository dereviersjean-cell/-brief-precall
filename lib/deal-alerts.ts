import { APP_URL } from "./app-url";
import {
  getActiveUserContact,
  getCallDealMemory,
  getCommercialsForManager,
  getDealBoardRows,
  getDealCard,
  getDealReviews,
  getManagersForCommercial,
} from "./db";
import { alertLabel, buildBoardNow, INTERVENTIONS, isHighRisk, morningQueue, REP_ACTIONS, sortByWeight, toBoardAlerts } from "./deal-board";
import { buildDealAlertEmail, buildDealMorningEmail, sendBuiltEmail, type DealEmailAlert } from "./email";

// Deal Execution, étape 5 (27/10/2026) : les emails. Décisions du 26/10/2026
// (reco 11, validée par Hubert) : le commercial reçoit les alertes de son call
// dès que la fiche est prête ; le manager reçoit la file chaque matin, et tout
// de suite quand le risque est élevé (lib/deal-board.ts, isHighRisk).
//
// Chaque fonction rend les emails qu'elle a construits. `send: false` les
// construit sans rien envoyer : c'est l'aperçu (scripts/preview-deal-emails.ts).

export type BuiltDealEmail = { to: string; subject: string; html: string };

// Après la fiche d'un call : un email au commercial s'il y a au moins une
// alerte, et un aux managers liés si le risque est élevé. Un manager qui est
// lui-même le commercial du call ne reçoit que l'email du commercial.
export async function sendDealAlertsForCall(callId: string, userId: string, options: { send: boolean }): Promise<BuiltDealEmail[]> {
  const fiche = await getCallDealMemory(callId);
  if (!fiche || fiche.alerts.length === 0) return [];

  const [owner, deal, managers] = await Promise.all([
    getActiveUserContact(userId),
    fiche.dealId ? getDealCard(fiche.dealId) : null,
    getManagersForCommercial(userId).catch(() => []),
  ]);
  if (!owner) return [];

  const alerts = sortByWeight(toBoardAlerts(fiche.alerts));
  const base = {
    dealName: deal?.name ?? "Votre deal",
    commercialName: owner.name,
    callAt: fiche.callAt ?? null,
    stage: deal?.hubspot?.stage ?? null,
    amount: deal?.hubspot?.amount ?? null,
  };
  const forAudience = (actions: Record<string, string>): DealEmailAlert[] =>
    alerts.map((a) => ({ label: alertLabel(a.rule), text: a.text, verbatim: a.verbatim, speaker: a.speaker, action: actions[a.rule] }));

  const emails: BuiltDealEmail[] = [
    {
      to: owner.email,
      ...buildDealAlertEmail({ ...base, audience: "commercial", alerts: forAudience(REP_ACTIONS), url: `${APP_URL}/feedback/${callId}` }),
    },
  ];

  if (isHighRisk(alerts.map((a) => a.rule))) {
    const managerEmail = buildDealAlertEmail({ ...base, audience: "manager", alerts: forAudience(INTERVENTIONS), url: `${APP_URL}/deals` });
    for (const manager of managers) {
      if (manager.id === owner.id) continue;
      emails.push({ to: manager.email, ...managerEmail });
    }
  }

  if (options.send) {
    for (const email of emails) await sendBuiltEmail(email.to, email, "sendDealAlertsForCall");
  }
  return emails;
}

// L'email du matin d'un manager : sa file de /deals, mêmes deals, même ordre.
// Rien à signaler = rien d'envoyé.
export async function sendDealMorningEmail(
  manager: { id: string; email: string; name: string | null },
  organizationId: string,
  options: { send: boolean }
): Promise<BuiltDealEmail | null> {
  const [commercials, reviews] = await Promise.all([getCommercialsForManager(manager.id), getDealReviews(manager.id).catch(() => [])]);
  const people = [{ id: manager.id, name: manager.name }, ...commercials.map((c) => ({ id: c.id, name: c.name ?? c.email }))];
  const rows = await getDealBoardRows(organizationId, people.map((p) => p.id));
  const { shown, total } = morningQueue(buildBoardNow(rows, reviews));
  if (total === 0) return null;

  const names = new Map(people.map((p) => [p.id, p.name]));
  const email: BuiltDealEmail = {
    to: manager.email,
    ...buildDealMorningEmail({
      deals: shown.map((d) => ({
        name: d.name,
        commercialName: d.ownerId === manager.id ? "Vous" : names.get(d.ownerId) ?? null,
        stage: d.hubspot?.stage ?? null,
        amount: d.hubspot?.amount ?? null,
        alertLabels: d.alerts.map((a) => alertLabel(a.rule)),
        intervention: d.intervention,
      })),
      total,
      url: `${APP_URL}/deals`,
    }),
  };
  if (options.send) await sendBuiltEmail(email.to, email, "sendDealMorningEmail");
  return email;
}
