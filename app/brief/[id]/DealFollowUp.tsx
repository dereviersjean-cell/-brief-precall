import Link from "next/link";
import type { DealBriefContext } from "@/lib/deal-brief";

// En tête du brief quand le rendez-vous fait suite à d'autres calls du même
// deal (structure cible de Jean, 27/10/2026) : ce qui est validé dans la
// checklist, ce qu'il reste à aller chercher, ce qui s'est dit la dernière
// fois. Tiré des fiches des calls précédents (lib/deal-brief.ts).

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em]";
const TILE =
  "rounded-[20px] bg-white ring-1 ring-[color:var(--lavender-strong)] shadow-[0_1px_2px_rgba(42,92,224,0.05),0_10px_28px_-20px_rgba(42,92,224,0.35)]";

function ordinal(n: number): string {
  return n === 1 ? "1er" : `${n}e`;
}

function day(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

export default function DealFollowUp({ ctx }: { ctx: DealBriefContext }) {
  const done = ctx.checklist.filter((c) => c.done).length;
  return (
    <section className={`${TILE} mt-7 overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-5 py-3.5">
        <p className="text-[14px] text-slate-900">
          <span className="font-semibold">{ordinal(ctx.callNumber)} call</span>
          <span className="text-slate-600"> · suite du deal </span>
          <Link href={`/deal/${ctx.dealId}`} className="font-semibold text-[color:var(--violet)] hover:underline">
            {ctx.dealName}
          </Link>
          {ctx.lastCall.at && <span className="text-slate-600"> · dernier call le {day(ctx.lastCall.at)}</span>}
        </p>
        <span className="text-[12.5px] font-medium tabular-nums text-slate-600">
          Checklist : {done}/{ctx.checklist.length} validés
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-3">
        <div>
          <h3 className={`${LABEL} mb-3 text-slate-500`}>La checklist du deal</h3>
          <ul className="space-y-2">
            {ctx.checklist.map((c) => (
              <li key={c.label} className="flex gap-2.5 text-[13px] leading-snug">
                <span
                  className={`mt-0.5 grid h-[17px] w-[17px] shrink-0 place-items-center rounded-md text-[11px] font-bold ${
                    c.done ? "bg-emerald-500 text-white" : "ring-1 ring-slate-300"
                  }`}
                >
                  {c.done ? "✓" : ""}
                </span>
                <span>
                  <span className={c.done ? "font-medium text-slate-900" : "font-medium text-slate-500"}>{c.label}</span>
                  {c.done && c.text && <span className="block text-[12.5px] text-slate-500">{c.text}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className={`${LABEL} mb-3 text-[color:var(--violet)]`}>À aller chercher pendant ce call</h3>
          {ctx.toFind.length === 0 && ctx.points.length === 0 && ctx.objections.length === 0 ? (
            <p className="text-[13px] text-slate-500">La checklist est complète et rien n&apos;est en suspens.</p>
          ) : (
            <ul className="space-y-2.5 text-[13.5px] leading-snug text-slate-800">
              {ctx.toFind.map((label) => (
                <li key={label} className="flex gap-2">
                  <span className="text-[color:var(--violet)]">→</span>
                  <span>
                    Obtenir : <span className="font-medium">{label.toLowerCase()}</span>
                  </span>
                </li>
              ))}
              {ctx.points.map((p) => (
                <li key={p.label} className="flex gap-2">
                  <span className="text-amber-600">△</span>
                  <span>
                    <span className="font-medium">{p.label}</span> — {p.action}
                  </span>
                </li>
              ))}
              {ctx.objections.map((o) => (
                <li key={o} className="flex gap-2">
                  <span className="text-amber-600">△</span>
                  <span>
                    Reprendre l&apos;objection : <span className="font-medium">{o}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className={`${LABEL} mb-3 text-slate-500`}>La dernière fois</h3>
          {ctx.engagements.length === 0 && ctx.points.length === 0 ? (
            <p className="text-[13px] text-slate-500">Aucun engagement relevé au dernier call.</p>
          ) : (
            <ul className="space-y-2 text-[13px] leading-snug text-slate-700">
              {ctx.engagements.map((e) => (
                <li key={e.text}>
                  {e.date && <span className="mr-1.5 font-medium text-slate-900">{day(e.date)}</span>}
                  {e.text}
                </li>
              ))}
              {ctx.points.map((p) => (
                <li key={`pt-${p.label}`} className="text-slate-600">
                  <span className="font-medium text-amber-800">{p.label} :</span> {p.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
