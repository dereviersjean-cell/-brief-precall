import Link from "next/link";
import type { DealMemoryPanel } from "@/lib/db";
import type { DealProgress } from "@/lib/deal-progress";
import type { DealReview } from "@/lib/deal-review";
import { DealActionPlan, DealObjectives, DealQualification } from "@/app/feedback/[id]/DealFocus";
import { VERDICTS, formatAmount, formatDay } from "@/app/mes-deals/deal-ui";
import type { DealTimeline as Timeline } from "@/lib/deal-timeline";
import DealTimeline from "./DealTimeline";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const CARD = "rounded-2xl border border-border bg-white";

const INTERVENE: Record<DealReview["intervene"], { label: string; tone: string }> = {
  oui: { label: "Oui, intervenir", tone: "bg-rose-50 text-rose-700" },
  surveiller: { label: "À surveiller", tone: "bg-amber-50 text-amber-700" },
  non: { label: "Pas besoin pour l'instant", tone: "bg-emerald-50 text-emerald-700" },
};

// Trois points visibles, le reste replié : déplié, le bilan d'un deal à
// quatre calls tenait un écran entier et cachait le fil des calls dessous.
const VISIBLE = 3;

function Points({ items, mark, tone }: { items: string[]; mark: string; tone: string }) {
  return (
    <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-800">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className={tone}>{mark}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Folded({ items, mark, tone }: { items: string[]; mark: string; tone: string }) {
  const rest = items.slice(VISIBLE);
  return (
    <>
      <Points items={items.slice(0, VISIBLE)} mark={mark} tone={tone} />
      {rest.length > 0 && (
        <details className="group mt-1.5">
          <summary className="cursor-pointer list-none text-[12.5px] font-medium text-[color:var(--violet)] hover:underline group-open:hidden">
            Voir {rest.length === 1 ? "l'autre point" : `les ${rest.length} autres points`}
          </summary>
          <Points items={rest} mark={mark} tone={tone} />
        </details>
      )}
    </>
  );
}

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
          <Folded items={review.good} mark="✓" tone="text-emerald-600" />
        )}
      </div>
      <div>
        <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">À corriger</h2>
        {review.bad.length === 0 ? (
          <p className="text-[13px] text-slate-400">Rien à corriger.</p>
        ) : (
          <Folded items={review.bad} mark="△" tone="text-amber-600" />
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

export default function DealPageView({
  timeline,
  progress,
  owners,
  panel,
  review,
  backHref,
  backLabel,
}: {
  timeline: Timeline;
  progress: DealProgress;
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

      <DealTimeline timeline={timeline} owners={owners} />

      {panel?.initial && (
        <section className="space-y-4">
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">Et maintenant</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-6">
              <DealObjectives callId={progress.lastCall.id} panel={panel} />
              <DealActionPlan callId={progress.lastCall.id} panel={panel} />
            </div>
            <div className="min-w-0 space-y-6">
              <DealQualification callId={progress.lastCall.id} panel={panel} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
