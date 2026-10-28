import Link from "next/link";
import type { DealTimeline as Timeline, GridCell, TimelineCall } from "@/lib/deal-timeline";
import type { ObjectiveStatus } from "@/lib/call-objectives";

// Le fil d'un deal (demande de Jean du 28/10/2026) : la continuité de tous
// ses calls. En haut, la grille « information clé × call » ; en dessous, un
// bloc par call — ce qu'il devait aller chercher, ce qu'il a obtenu, ce qui a
// coincé, ce qui a été convenu — relié au suivant par le temps écoulé.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";

const OBJECTIVE: Record<ObjectiveStatus, { label: string; tone: string }> = {
  obtenu: { label: "Obtenu", tone: "bg-emerald-50 text-emerald-700" },
  deja_obtenu: { label: "Déjà obtenu", tone: "bg-slate-100 text-slate-600" },
  a_preciser: { label: "À préciser", tone: "bg-amber-50 text-amber-800" },
  pas_aborde: { label: "Pas abordé", tone: "bg-rose-50 text-rose-700" },
};

const HANDLING = {
  bien_traitee: { label: "bien traitée", tone: "text-emerald-700" },
  partiellement: { label: "partiellement traitée", tone: "text-amber-700" },
  non_traitee: { label: "non traitée", tone: "text-rose-700" },
} as const;

function longDay(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  const text = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "Europe/Paris",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shortDay(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

function gap(days: number): string {
  if (days === 0) return "Le même jour";
  if (days === 1) return "Le lendemain";
  return `${days} jours plus tard`;
}

function Cell({ value }: { value: GridCell }) {
  if (value === "confirme_ici")
    return (
      <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-600 text-[11px] font-bold text-white" title="Obtenu à ce call">
        ✓
      </span>
    );
  if (value === "acquis")
    return (
      <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-100 text-[11px] font-bold text-emerald-700" title="Déjà obtenu">
        ✓
      </span>
    );
  if (value === "evoque")
    return (
      <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-100 text-[12px] font-bold text-amber-800" title="Abordé, encore flou">
        ~
      </span>
    );
  return <span className="grid h-6 w-6 place-items-center rounded-md ring-1 ring-inset ring-slate-200" title="Pas encore abordé" />;
}

function Grid({ timeline }: { timeline: Timeline }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="pb-2 pr-3 text-[12px] font-medium text-slate-500">Information clé</th>
            {timeline.calls.map((c) => (
              <th key={c.callId} className="px-1 pb-2 text-center text-[12px] font-semibold text-slate-700">
                <a href={`#call-${c.rank}`} className="hover:text-[color:var(--violet)]">
                  R{c.rank}
                </a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeline.grid.map((row) => (
            <tr key={row.key} className="border-t border-slate-100">
              <td className="py-1.5 pr-3 text-[13px] text-slate-800">{row.label}</td>
              {row.cells.map((cell, i) => (
                <td key={i} className="px-1 py-1.5">
                  <span className="flex justify-center">
                    <Cell value={cell} />
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <Cell value="confirme_ici" /> obtenu à ce call
        </span>
        <span className="flex items-center gap-1.5">
          <Cell value="acquis" /> déjà obtenu
        </span>
        <span className="flex items-center gap-1.5">
          <Cell value="evoque" /> abordé, encore flou
        </span>
        <span className="flex items-center gap-1.5">
          <Cell value={null} /> pas encore abordé
        </span>
      </p>
    </div>
  );
}

function CallBlock({ call, owner, last }: { call: TimelineCall; owner: string | null; last: boolean }) {
  const first = call.rank === 1;
  const meta = [
    call.durationMinutes ? `${call.durationMinutes} min` : null,
    owner,
    call.score != null ? `score ${call.score.toFixed(1).replace(".", ",")}/5` : null,
  ].filter(Boolean);
  return (
    <li id={`call-${call.rank}`} className="relative scroll-mt-20 pl-12">
      {!first && <p className="py-3 text-[12px] font-medium text-slate-400">{call.gapDays !== null ? gap(call.gapDays) : "Ensuite"}</p>}
      <div className="relative">
        <span
          className={`absolute -left-12 top-0 grid h-9 w-9 place-items-center rounded-full text-[12.5px] font-bold ${last ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300"}`}
        >
          R{call.rank}
        </span>
        <article className="rounded-2xl border border-border bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-[15px] font-semibold text-slate-900">
              {call.at ? longDay(call.at) : "Date inconnue"}
              {last && <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">dernier call</span>}
            </h3>
            <Link href={`/feedback/${call.callId}`} className="text-[12.5px] font-medium text-[color:var(--violet)] hover:underline">
              Ouvrir le call →
            </Link>
          </div>
          {meta.length > 0 && <p className="mt-0.5 text-[12.5px] text-slate-500">{meta.join(" · ")}</p>}
          {call.summary && <p className="mt-3 text-[13.5px] leading-relaxed text-slate-700">{call.summary}</p>}

          <div className="mt-4 grid grid-cols-1 gap-5 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <section>
              <h4 className={`${LABEL} mb-2`}>Objectifs du R{call.rank}</h4>
              {call.objectives.length === 0 ? (
                <p className="text-[12.5px] text-slate-400">Aucun objectif fixé pour ce rendez-vous.</p>
              ) : (
                <ul className="space-y-1.5">
                  {call.objectives.map((o) => (
                    <li key={o.key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-slate-800">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${OBJECTIVE[o.status].tone}`}>{OBJECTIVE[o.status].label}</span>
                      {o.label}
                      {o.carried && <span className="text-[11.5px] text-slate-400">reporté</span>}
                    </li>
                  ))}
                </ul>
              )}
              {call.obtained.length > 0 && (
                <p className="mt-3 text-[12.5px] text-slate-600">
                  <span className="font-semibold text-emerald-700">Appris à ce call : </span>
                  {call.obtained.map((o) => o.charAt(0).toLowerCase() + o.slice(1)).join(", ")}
                </p>
              )}
            </section>

            <section className="space-y-4">
              {call.objections.length > 0 && (
                <div>
                  <h4 className={`${LABEL} mb-2`}>Objections</h4>
                  <ul className="space-y-1.5 text-[13px] text-slate-800">
                    {call.objections.map((o, i) => (
                      <li key={i}>
                        {o.objection}
                        {o.handlingQuality && (
                          <span className={`text-[12px] font-medium ${HANDLING[o.handlingQuality].tone}`}> · {HANDLING[o.handlingQuality].label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {call.alerts.length > 0 && (
                <div>
                  <h4 className={`${LABEL} mb-2`}>Alertes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {call.alerts.map((a) => (
                      <span key={a.rule} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-medium text-amber-800">
                        {a.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h4 className={`${LABEL} mb-2`}>Convenu pour la suite</h4>
                {call.commitments.length === 0 ? (
                  <p className="text-[12.5px] text-slate-400">Rien de convenu.</p>
                ) : (
                  <ul className="space-y-1.5 text-[13px] text-slate-800">
                    {call.commitments.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-slate-400">→</span>
                        <span>
                          {c.text}
                          {c.date && <span className="text-[12px] text-slate-500"> · {shortDay(c.date)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </article>
      </div>
    </li>
  );
}

export default function DealTimeline({ timeline, owners }: { timeline: Timeline; owners: Record<string, string> }) {
  const showOwner = Object.keys(owners).length > 1;
  const { calls } = timeline;
  const first = calls[0]?.at;
  const last = calls[calls.length - 1]?.at;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">Le fil des calls</h2>
        <p className="text-[13px] text-slate-500">
          {calls.length} call{calls.length > 1 ? "s" : ""}
          {first && last && calls.length > 1 ? ` du ${shortDay(first)} au ${shortDay(last)}` : ""}
          {timeline.spanDays ? `, sur ${timeline.spanDays} jours` : ""}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5">
        <h3 className={`${LABEL} mb-3`}>Les informations clés, call après call</h3>
        <Grid timeline={timeline} />
      </div>

      <ol className="relative space-y-0 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-slate-200">
        {calls.map((call, i) => (
          <CallBlock key={call.callId} call={call} owner={showOwner ? (owners[call.ownerId] ?? null) : null} last={i === calls.length - 1} />
        ))}
      </ol>
    </section>
  );
}
