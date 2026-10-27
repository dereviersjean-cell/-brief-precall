import Link from "next/link";
import type { DealMemoryPanel } from "@/lib/db";
import type { DealProgress, ProgressFiche } from "@/lib/deal-progress";
import type { DealReview } from "@/lib/deal-review";
import { DEAL_ALERT_RULES } from "@/lib/deal-memory-schema";
import { DealActionPlan, DealQualification } from "@/app/feedback/[id]/DealFocus";
import { VERDICTS, formatAmount, formatDay } from "@/app/mes-deals/deal-ui";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const CARD = "rounded-2xl border border-border bg-white";
type OwnedFiche = ProgressFiche & { ownerId: string };

const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

const INTERVENE: Record<DealReview["intervene"], { label: string; tone: string }> = {
  oui: { label: "Oui, intervenir", tone: "bg-rose-50 text-rose-700" },
  surveiller: { label: "À surveiller", tone: "bg-amber-50 text-amber-700" },
  non: { label: "Pas besoin pour l'instant", tone: "bg-emerald-50 text-emerald-700" },
};

// Le bilan du manager : bien fait, à corriger, faut-il intervenir.
function Review({ review }: { review: DealReview }) {
  const v = INTERVENE[review.intervene];
  return (
    <section className={`${CARD} grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-3`}>
      <div>
        <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Bien fait</h2>
        {review.good.length === 0 ? (
          <p className="text-[13px] text-slate-400">Rien à relever pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-800">
            {review.good.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">À corriger</h2>
        {review.bad.length === 0 ? (
          <p className="text-[13px] text-slate-400">Rien à corriger.</p>
        ) : (
          <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-800">
            {review.bad.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="text-amber-600">△</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className={`${LABEL} mb-2.5`}>Faut-il intervenir ?</h2>
        <span className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${v.tone}`}>{v.label}</span>
        {review.intervention && <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-800">{review.intervention}</p>}
        <p className="mt-2.5 text-[12px] text-slate-400">Le deal reste au commercial : toute intervention passe par lui.</p>
      </div>
    </section>
  );
}

// Les calls du deal dans l'ordre : ce que chacun a appris et levé.
function Calls({ progress, fiches, owners }: { progress: DealProgress; fiches: OwnedFiche[]; owners: Record<string, string> }) {
  const byId = new Map(fiches.map((f) => [f.callId, f]));
  const multipleOwners = Object.keys(owners).length > 1;
  return (
    <section className={`${CARD} p-5 sm:p-6`}>
      <h2 className={`${LABEL} mb-4`}>Les calls du deal</h2>
      <ol className="space-y-4">
        {progress.steps.map((step, i) => {
          const fiche = byId.get(step.callId);
          const owner = fiche ? owners[fiche.ownerId] : null;
          return (
            <li key={step.callId} className="relative border-l-2 border-slate-200 pl-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13.5px] font-semibold text-slate-900">
                  R{i + 1}
                  {step.callAt ? ` · ${formatDay(step.callAt)}` : ""}
                  {step.title ? <span className="font-normal text-slate-500"> · {step.title}</span> : null}
                </p>
                <Link href={`/feedback/${step.callId}`} className="text-[12.5px] font-medium text-[color:var(--violet)] hover:underline">
                  Ouvrir le call
                </Link>
              </div>
              <p className="mt-0.5 text-[12.5px] text-slate-500">
                {multipleOwners && owner ? `${owner} · ` : ""}
                {step.known}/{progress.total} informations clés connues
                {step.learned.length > 0 ? ` · appris : ${step.learned.map((l) => l.charAt(0).toLowerCase() + l.slice(1)).join(", ")}` : ""}
              </p>
              {fiche && fiche.alerts.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {fiche.alerts.map((a) => (
                    <span key={a.rule} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-medium text-amber-800">
                      {RULE_LABELS.get(a.rule) ?? a.rule}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function DealPageView({
  progress,
  fiches,
  owners,
  panel,
  review,
  backHref,
  backLabel,
}: {
  progress: DealProgress;
  fiches: OwnedFiche[];
  owners: Record<string, string>;
  panel: DealMemoryPanel | null;
  review: DealReview | null;
  backHref: string;
  backLabel: string;
}) {
  const v = VERDICTS[progress.verdict];
  const hs = progress.hubspot;
  const meta = [
    hs?.stage ? `HubSpot · ${hs.stage}${hs.stageIndex && hs.stageCount ? ` (étape ${hs.stageIndex} sur ${hs.stageCount})` : ""}` : "Hors HubSpot",
    hs?.amount != null ? formatAmount(hs.amount) : null,
    hs?.closeDate ? `clôture prévue le ${formatDay(hs.closeDate)}` : null,
    Object.values(owners).join(", "),
    `${progress.steps.length} call${progress.steps.length > 1 ? "s" : ""}`,
    progress.lastCall.at ? `dernier le ${formatDay(progress.lastCall.at)}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900">
        ← {backLabel}
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">{progress.name}</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${v.tone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
            {v.label}
          </span>
        </div>
        <p className="mt-1.5 text-[13px] text-slate-500">
          {meta.join(" · ")}
          {hs?.url && (
            <>
              {" · "}
              <a href={hs.url} target="_blank" rel="noreferrer" className="font-medium text-[color:var(--violet)] hover:underline">
                Ouvrir dans HubSpot
              </a>
            </>
          )}
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-700">
          {progress.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </header>

      {review && <Review review={review} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {panel?.initial && <DealActionPlan callId={progress.lastCall.id} panel={panel} />}
          <Calls progress={progress} fiches={fiches} owners={owners} />
        </div>
        <div className="min-w-0 space-y-6">{panel?.initial && <DealQualification callId={progress.lastCall.id} panel={panel} />}</div>
      </div>
    </div>
  );
}
