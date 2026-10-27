import Link from "next/link";
import type { DealProgress, DealVerdict } from "@/lib/deal-progress";

// Vue commercial « Mes deals » (Deal Execution, 27/10/2026), sans lecture de
// données : la page lui passe les deals déjà calculés (lib/deal-progress.ts).

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

// La qualification du deal call après call : combien d'informations clés on
// connaît après chaque call, et ce que chacun a appris.
function Evolution({ deal }: { deal: DealProgress }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-2">
      {deal.steps.map((step, i) => (
        <li key={step.callId} className="flex items-center gap-2">
          {i > 0 && <span className="text-slate-300">→</span>}
          <Link
            href={`/feedback/${step.callId}`}
            title={[step.title, step.learned.length > 0 ? `Appris : ${step.learned.join(", ")}` : null].filter(Boolean).join(" · ")}
            className="block min-w-[104px] rounded-xl border border-border bg-white px-3 py-2 hover:bg-slate-50"
          >
            <p className="text-[11.5px] text-slate-500">
              Call {i + 1}
              {step.callAt ? ` · ${formatDay(step.callAt)}` : ""}
            </p>
            <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-slate-900">
              {step.known}/{deal.total}
              {step.learned.length > 0 && i > 0 && <span className="ml-1 text-[11.5px] font-medium text-emerald-700">+{step.learned.length}</span>}
            </p>
            <div className="mt-1 h-1 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[color:var(--violet)]" style={{ width: `${(step.known / deal.total) * 100}%` }} />
            </div>
            {step.alertCount > 0 && (
              <p className="mt-1 text-[11.5px] text-amber-700">
                {step.alertCount} alerte{step.alertCount > 1 ? "s" : ""}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}

function DealProgressCard({ deal }: { deal: DealProgress }) {
  const v = VERDICTS[deal.verdict];
  const meta = [
    deal.hubspot?.stage ? `HubSpot · ${deal.hubspot.stage}` : "Hors HubSpot",
    deal.hubspot?.amount != null ? formatAmount(deal.hubspot.amount) : null,
    `${deal.steps.length} call${deal.steps.length > 1 ? "s" : ""}`,
    deal.lastCall.at ? `dernier le ${formatDay(deal.lastCall.at)}` : null,
  ].filter(Boolean);
  return (
    <article className={`${CARD} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-slate-900">
            <Link href={`/deal/${deal.id}`} className="hover:underline">
              {deal.name}
            </Link>
          </h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">{meta.join(" · ")}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${v.tone}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
          {v.label}
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-700">
        {deal.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <div className="mt-5">
        <p className={`${LABEL} mb-2`}>Évolution · informations clés connues</p>
        <Evolution deal={deal} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <p className={`${LABEL} mb-2`}>La suite prévue</p>
          {deal.nextSteps.length === 0 ? (
            <p className="text-[13px] text-slate-400">Aucun engagement relevé au dernier call.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-[13.5px] leading-relaxed text-slate-800 marker:text-slate-300">
              {deal.nextSteps.slice(0, 3).map((s, i) => (
                <li key={i}>{s.text}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-3">
          {deal.alerts.length > 0 && (
            <div>
              <p className={`${LABEL} mb-2`}>Points de vigilance</p>
              <div className="flex flex-wrap gap-1.5">
                {deal.alerts.map((a) => (
                  <span key={a} className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-800">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {deal.toObtain.length > 0 && (
            <div>
              <p className={`${LABEL} mb-2`}>Encore à obtenir</p>
              <div className="flex flex-wrap gap-1.5">
                {deal.toObtain.map((a) => (
                  <span key={a} className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-700">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-4">
        <Link href={`/deal/${deal.id}`} className="text-[13px] font-medium text-[color:var(--violet)] hover:underline">
          Ouvrir le deal →
        </Link>
      </div>
    </article>
  );
}

export default function MesDealsView({ deals, closed }: { deals: DealProgress[]; closed: number }) {
  const counts = { recul: 0, arret: 0, progres: 0 } as Record<DealVerdict, number>;
  for (const d of deals) counts[d.verdict]++;

  if (deals.length === 0) {
    return (
      <p className={`${CARD} p-5 text-[13.5px] text-slate-500`}>
        Aucun deal suivi pour l&apos;instant : chaque call enregistré crée ou complète le deal de son prospect.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(["recul", "arret", "progres"] as const).map((k) => (
          <span key={k} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${VERDICTS[k].tone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${VERDICTS[k].dot}`} />
            {counts[k]} {VERDICTS[k].label.toLowerCase()}
          </span>
        ))}
      </div>
      {deals.map((deal) => (
        <DealProgressCard key={deal.id} deal={deal} />
      ))}
      {closed > 0 && (
        <p className="text-[12.5px] text-slate-500">
          {closed} deal{closed > 1 ? "s" : ""} clos dans HubSpot, non affiché{closed > 1 ? "s" : ""}.
        </p>
      )}
      <p className="text-[12px] text-slate-400">
        En recul : le dernier call montre un recul par rapport aux précédents. À l&apos;arrêt : aucun call depuis 14 jours, ou pas de
        prochaine étape datée. En progrès : un call récent avec une suite datée.
      </p>
    </div>
  );
}
