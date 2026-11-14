import { buildDealChronology } from "@/lib/deal-chronology";
import { nowMs } from "@/lib/format";
import { adviceFor } from "@/lib/deal-advice";
import { coachingQuestions, firstName, managerTitle, managerWhy } from "@/lib/deal-coaching";
import { buildDealMacro, lateCommitment } from "@/lib/deal-macro";
import { stateReason } from "@/lib/deal-progress";
import { getDealClosures, getDoneCommitments, getScheduledMeetingsOnDay } from "@/lib/db";
import { frenchTime, pickDealMeeting } from "@/lib/next-meeting-time";
import DealMacroView, { type MacroPriority } from "./DealMacroView";
import { loadDealPage } from "./load";

// Page d'un deal : la vue « macro » de la synthèse produit (validée par Jean
// le 03/11/2026) — en-tête, UNE priorité, engagements, état du deal,
// historique léger. Elle remplace la chronologie du 28/10/2026. Le commercial
// la voit pour ses deals ; le manager pour ceux de ses commerciaux liés et les
// siens.
export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  // Les engagements cochés partent avec le reste (lus seulement, affichés
  // après le contrôle d'accès de loadDealPage). Sans la migration 040, pas de
  // case à cocher (et rien de coché).
  const [deal, done] = await Promise.all([loadDealPage(dealId), getDoneCommitments(dealId).catch(() => null)]);
  const closure = (await getDealClosures(deal.viewer.organizationId)).get(dealId) ?? null;
  const now = nowMs();
  const ownerId = deal.fiches[deal.fiches.length - 1].ownerId;
  const owner = deal.owners[ownerId] ?? "Commercial";
  const macro = buildDealMacro({
    fiches: deal.fiches,
    progress: deal.progress,
    timeline: deal.timeline,
    chrono: buildDealChronology(deal.timeline, now),
    done: done ?? new Set(),
    now,
    ownerFirstName: firstName(owner),
  });

  // L'heure du prochain rendez-vous, lue dans l'agenda du commercial quand le
  // rendez-vous y est (décision D9). Sans elle, le jour seul.
  const nextDay = macro.nextMeeting?.date.slice(0, 10) ?? null;
  const dayMeetings = nextDay ? await getScheduledMeetingsOnDay(ownerId, nextDay).catch(() => []) : [];
  const picked = pickDealMeeting(dayMeetings, { name: deal.progress.name, lastTitle: deal.progress.lastCall.title, ownNames: Object.values(deal.owners) });
  const nextMeetingTime = picked ? frenchTime(picked.startsAt) : null;

  const isOwner = ownerId === deal.viewer.userId;
  const late = lateCommitment(macro);
  const d = deal.progress;

  // Le commercial lit son conseil ; le manager, ce qu'il en dit au
  // commercial. Un engagement en retard passe devant les deux.
  let priority: MacroPriority;
  if (late && isOwner) {
    priority = {
      title: "Rattraper un engagement en retard",
      why: `Promis au dernier call${late.date ? ` pour le ${dayLabel(late.date)}` : ""} : « ${late.text.replace(/\.$/, "")} ». Le prospect l'attend.`,
      action: "Fais-le aujourd'hui, ou écris au prospect pour lui donner une nouvelle date.",
    };
  } else if (late) {
    priority = {
      title: `Un engagement de ${firstName(owner)} est en retard`,
      why: `Promis au dernier call${late.date ? ` pour le ${dayLabel(late.date)}` : ""} : « ${late.text.replace(/\.$/, "")} ».`,
      action: `Demandez à ${firstName(owner)} où en est cet engagement et pour quand il sera fait.`,
    };
  } else if (isOwner) {
    const a = adviceFor(deal.progress);
    priority = { title: a.title, why: a.why, action: a.how[0] ?? null };
  } else {
    const q = coachingQuestions(deal.progress)[0];
    priority = {
      title: managerTitle(deal.progress, owner),
      why: managerWhy(deal.progress),
      action: q ? `À demander à ${firstName(owner)} : ${q}` : null,
    };
  }

  return (
    <DealMacroView
      dealId={dealId}
      deal={{
        name: d.name,
        domain: d.domain,
        // Un engagement en retard fait passer le deal « à relancer » (D3).
        state: late && (d.state === "progres" || d.state === "qualifier") ? "relancer" : d.state,
        stateReason: late && d.state !== "recul" && d.state !== "arret" ? "Un engagement du dernier rendez-vous est en retard." : stateReason(d),
        stage: d.hubspot?.stage ?? null,
        owner,
      }}
      macro={macro}
      priority={priority}
      canCheck={done !== null}
      nextMeetingTime={nextMeetingTime}
      closure={closure}
      // Au-delà de 60 jours sans échange, Brief propose d'abandonner (D8).
      suggestAbandon={!closure && !d.hubspot?.closed && (d.idleDays ?? 0) >= 60}
      backHref={deal.backHref}
      backLabel={deal.backLabel}
    />
  );
}

function dayLabel(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}
