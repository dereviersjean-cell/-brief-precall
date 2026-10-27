import Link from "next/link";
import type { DealProgress, DealVerdict, NextStepStatus } from "@/lib/deal-progress";

// Vue commercial « Mes deals » (Deal Execution, 27/10/2026), refaite en vue
// d'ensemble (structure cible de Jean) : ses prochaines actions regroupées,
// puis son pipe — un deal par ligne, ouvert sur sa page /deal/[id]. Sans
// lecture de données : la page lui passe les deals déjà calculés
// (lib/deal-progress.ts).

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const CARD = "rounded-2xl border border-border bg-white";

export const VERDICTS: Record<DealVerdict, { label: string; tone: string; dot: string }> = {
  recul: { label: "En recul", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  arret: { label: "À l'arrêt", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  progres: { label: "En progrès", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

const STATUS: Record<NextStepStatus, { label: string; tone: string }> = {
  a_jour: { label: "À jour", tone: "bg-emerald-50 text-emerald-700" },
  en_retard: { label: "En retard", tone: "bg-rose-50 text-rose-700" },
  sans_suite: { label: "Sans suite datée", tone: "bg-amber-50 text-amber-700" },
  non_relevee: { label: "Date non relevée", tone: "bg-slate-100 text-slate-600" },
};

type ActionLine = { dealId: string; deal: string; date: string | null; text: string };

// Toutes les actions du commercial, regroupées : ce qui est en retard, ce
// qui arrive (par date), les suites à fixer, les points de vigilance.
function buildActions(deals: DealProgress[]) {
  const late: ActionLine[] = [];
  const upcoming: ActionLine[] = [];
  const toSchedule: ActionLine[] = [];
  const toHandle: ActionLine[] = [];
  for (const d of deals) {
    const n = d.nextStep;
    if (n.status === "en_retard") {
      late.push({ dealId: d.id, deal: d.name, date: n.date, text: `prévu : « ${n.text ?? "prochaine étape"} », passé sans nouveau call. Relancer le prospect.` });
      continue;
    }
    else if (n.status === "a_jour") upcoming.push({ dealId: d.id, deal: d.name, date: n.date, text: n.text ?? "Prochaine étape" });
    else if (n.status === "sans_suite") toSchedule.push({ dealId: d.id, deal: d.name, date: null, text: "Fixer une prochaine étape datée avec le prospect." });
    if (d.topAction && d.verdict !== "progres") toHandle.push({ dealId: d.id, deal: d.name, date: null, text: d.topAction });
  }
  upcoming.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  return { late, upcoming, toSchedule, toHandle };
}

function ActionGroup({ title, tone, items }: { title: string; tone: string; items: ActionLine[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className={`mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] ${tone}`}>
        {title} ({items.length})
      </h3>
      <ul className="space-y-1.5">
        {items.map((a, i) => (
          <li key={`${a.dealId}-${i}`} className="text-[13.5px] leading-relaxed text-slate-800">
            {a.date && <span className="mr-1.5 font-medium tabular-nums text-slate-500">{formatDay(a.date)}</span>}
            <Link href={`/deal/${a.dealId}`} className="font-semibold text-slate-900 hover:underline">
              {a.deal}
            </Link>
            <span className="text-slate-600"> — {a.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MesDealsView({ deals, closed }: { deals: DealProgress[]; closed: number }) {
  if (deals.length === 0) {
    return (
      <p className={`${CARD} p-5 text-[13.5px] text-slate-500`}>
        Aucun deal suivi pour l&apos;instant : chaque call enregistré crée ou complète le deal de son prospect.
      </p>
    );
  }
  const verdicts = { recul: 0, arret: 0, progres: 0 } as Record<DealVerdict, number>;
  const statuses = { a_jour: 0, en_retard: 0, sans_suite: 0, non_relevee: 0 } as Record<NextStepStatus, number>;
  for (const d of deals) {
    verdicts[d.verdict]++;
    statuses[d.nextStep.status]++;
  }
  const actions = buildActions(deals);
  const noAction = actions.late.length + actions.upcoming.length + actions.toSchedule.length + actions.toHandle.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["recul", "arret", "progres"] as const).map((k) => (
          <span key={k} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${VERDICTS[k].tone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${VERDICTS[k].dot}`} />
            {verdicts[k]} {VERDICTS[k].label.toLowerCase()}
          </span>
        ))}
        <span className="mx-1 self-center text-slate-300">|</span>
        {(["a_jour", "en_retard", "sans_suite"] as const).map((k) => (
          <span key={k} className={`rounded-full px-3 py-1 text-[13px] font-medium ${STATUS[k].tone}`}>
            {statuses[k]} {STATUS[k].label.toLowerCase()}
          </span>
        ))}
      </div>

      <section className={`${CARD} p-5 sm:p-6`}>
        <h2 className={`${LABEL} mb-4`}>Mes prochaines actions</h2>
        {noAction ? (
          <p className="text-[13.5px] text-slate-500">Rien à faire pour l&apos;instant.</p>
        ) : (
          <div className="space-y-5">
            <ActionGroup title="En retard" tone="text-rose-700" items={actions.late} />
            <ActionGroup title="À venir" tone="text-emerald-700" items={actions.upcoming} />
            <ActionGroup title="Suite à fixer" tone="text-amber-700" items={actions.toSchedule} />
            <ActionGroup title="Points à traiter" tone="text-amber-700" items={actions.toHandle} />
          </div>
        )}
      </section>

      <section className={`${CARD} overflow-x-auto`}>
        <h2 className={`${LABEL} px-5 pt-5`}>Mon pipe</h2>
        <table className="stacked-table mt-3 w-full text-left text-[13.5px] sm:min-w-[860px]">
          <thead>
            <tr className="border-b border-border text-[12px] text-slate-500">
              <th className="px-5 py-2.5 font-medium">Deal</th>
              <th className="px-3 py-2.5 font-medium">Étape</th>
              <th className="px-3 py-2.5 font-medium">Montant</th>
              <th className="px-3 py-2.5 font-medium">Dernier call</th>
              <th className="px-3 py-2.5 font-medium">Prochaine étape</th>
              <th className="px-3 py-2.5 font-medium">Suivi</th>
              <th className="px-5 py-2.5 font-medium">Tendance</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className="border-b border-border align-top last:border-0">
                <td className="px-5 py-3">
                  <Link href={`/deal/${d.id}`} className="font-semibold text-slate-900 hover:underline">
                    {d.name}
                  </Link>
                  <p className="text-[12px] text-slate-500">
                    {d.steps.length} call{d.steps.length > 1 ? "s" : ""} · {d.known}/{d.total} infos clés
                  </p>
                </td>
                <td className="px-3 py-3" data-label="Étape">
                  {d.hubspot?.stage ?? <span className="text-slate-400">Hors HubSpot</span>}
                </td>
                <td className="px-3 py-3 tabular-nums" data-label="Montant">
                  {d.hubspot?.amount != null ? formatAmount(d.hubspot.amount) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-3 tabular-nums" data-label="Dernier call">
                  {d.lastCall.at ? formatDay(d.lastCall.at) : "—"}
                </td>
                <td className="px-3 py-3" data-label="Prochaine étape">
                  {d.nextStep.date && <span className="font-medium tabular-nums text-slate-900">{formatDay(d.nextStep.date)} · </span>}
                  <span className="text-slate-700">{d.nextStep.text ?? <span className="text-slate-400">Aucune</span>}</span>
                </td>
                <td className="px-3 py-3" data-label="Suivi">
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ${STATUS[d.nextStep.status].tone}`}>
                    {STATUS[d.nextStep.status].label}
                  </span>
                </td>
                <td className="px-5 py-3" data-label="Tendance">
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ${VERDICTS[d.verdict].tone}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${VERDICTS[d.verdict].dot}`} />
                    {VERDICTS[d.verdict].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {closed > 0 && (
        <p className="text-[12.5px] text-slate-500">
          {closed} deal{closed > 1 ? "s" : ""} clos dans HubSpot, non affiché{closed > 1 ? "s" : ""}.
        </p>
      )}
      <p className="text-[12px] text-slate-400">
        Suivi — à jour : une prochaine étape datée à venir ; en retard : la date est passée sans nouveau call (ou, date non
        relevée, plus de 14 jours sans call) ; date non relevée : call analysé avant le relevé des dates. Tendance — en recul : le dernier call montre un recul ; à l&apos;arrêt : aucun call depuis 14
        jours ou pas de suite datée ; en progrès : un call récent avec une suite datée.
      </p>
    </div>
  );
}
