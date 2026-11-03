import { buildDealChronology } from "@/lib/deal-chronology";
import { nowMs } from "@/lib/format";
import { adviceFor } from "@/lib/deal-advice";
import { coachingQuestions, firstName, managerTitle, managerWhy } from "@/lib/deal-coaching";
import { buildDealMacro, lateCommitment } from "@/lib/deal-macro";
import { getDoneCommitments } from "@/lib/db";
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
  const now = nowMs();
  const macro = buildDealMacro({
    fiches: deal.fiches,
    progress: deal.progress,
    timeline: deal.timeline,
    chrono: buildDealChronology(deal.timeline, now),
    done: done ?? new Set(),
    now,
  });

  const ownerId = deal.fiches[deal.fiches.length - 1].ownerId;
  const owner = deal.owners[ownerId] ?? "Commercial";
  const isOwner = ownerId === deal.viewer.userId;
  const tags = deal.progress.alerts.slice(0, 3);
  const late = lateCommitment(macro);

  // Le commercial lit son conseil ; le manager, ce qu'il en dit au
  // commercial. Un engagement en retard passe devant les deux.
  let priority: MacroPriority;
  if (late && isOwner) {
    priority = {
      title: "Rattraper un engagement en retard",
      why: `Promis au dernier call${late.date ? ` pour le ${dayLabel(late.date)}` : ""} : « ${late.text.replace(/\.$/, "")} ». Le prospect l'attend.`,
      action: "Fais-le aujourd'hui, ou écris au prospect pour lui donner une nouvelle date.",
      tags,
    };
  } else if (late) {
    priority = {
      title: `Un engagement de ${firstName(owner)} est en retard`,
      why: `Promis au dernier call${late.date ? ` pour le ${dayLabel(late.date)}` : ""} : « ${late.text.replace(/\.$/, "")} ».`,
      action: `Demandez à ${firstName(owner)} où en est cet engagement et pour quand il sera fait.`,
      tags,
    };
  } else if (isOwner) {
    const a = adviceFor(deal.progress);
    priority = { title: a.title, why: a.why, action: a.how[0] ?? null, tags };
  } else {
    const q = coachingQuestions(deal.progress)[0];
    priority = {
      title: managerTitle(deal.progress, owner),
      why: managerWhy(deal.progress),
      action: q ? `À demander à ${firstName(owner)} : ${q}` : null,
      tags,
    };
  }

  return (
    <DealMacroView
      dealId={dealId}
      progress={deal.progress}
      macro={macro}
      owner={owner}
      priority={priority}
      canCheck={done !== null}
      backHref={deal.backHref}
      backLabel={deal.backLabel}
    />
  );
}

function dayLabel(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}
