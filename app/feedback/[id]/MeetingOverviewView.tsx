import type { MeetingOverview, ImpactTag } from "@/lib/meeting-overview";
import { StateChip } from "@/app/mes-deals/deal-ui";

// La page d'un meeting en trois questions (maquette A choisie par Jean le
// 14/11/2026, questions d'Hubert). La vidéo, le temps de parole et la
// synthèse sont au-dessus, dans FeedbackDetailClient. Consigne : concis.

const PLAYBOOK = {
  obtenu: { label: "Validé", tone: "bg-emerald-50 text-emerald-700" },
  a_preciser: { label: "Partiel", tone: "bg-amber-50 text-amber-700" },
  pas_aborde: { label: "Manquant", tone: "bg-rose-50 text-rose-700" },
  deja_obtenu: { label: "Déjà acquis", tone: "bg-slate-100 text-slate-500" },
} as const;

const TAGS: Record<ImpactTag, { label: string; tone: string }> = {
  nouveau: { label: "Nouveau", tone: "bg-blue-50 text-blue-700" },
  recul: { label: "Recul", tone: "bg-rose-50 text-rose-700" },
  concurrent: { label: "Concurrent", tone: "bg-amber-50 text-amber-700" },
  inchange: { label: "Inchangé", tone: "bg-slate-100 text-slate-600" },
  vigilance: { label: "Vigilance", tone: "bg-amber-50 text-amber-700" },
};

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em]";

function day(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-xs)]">{children}</section>;
}

function Question({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-slate-900">
      <span className="text-[color:var(--violet)]">{n}.</span> {children}
    </h2>
  );
}

export function MeetingSummary({ m }: { m: MeetingOverview }) {
  return (
    <Card>
      <h2 className="text-[16px] font-semibold text-slate-900">Synthèse</h2>
      {m.summaryLines.length > 0 ? (
        <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-[14px] leading-snug text-slate-800 marker:text-slate-400">
          {m.summaryLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 text-[13.5px] text-slate-500">Pas de synthèse pour ce rendez-vous.</p>
      )}
    </Card>
  );
}

function Commitments({ title, items }: { title: string; items: MeetingOverview["commitments"] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
      <ul className="mt-1 divide-y divide-slate-100">
        {items.map((c, k) => (
          <li key={k} className="flex items-start justify-between gap-4 py-2.5 text-[13.5px] leading-snug text-slate-800">
            <span className="min-w-0">{c.text}</span>
            <span className="whitespace-nowrap text-[12.5px] text-slate-500">{c.date ? day(c.date) : "Sans date"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MeetingOverviewView({ m }: { m: MeetingOverview }) {
  const strengths = m.coachingStrengths.length > 0 ? m.coachingStrengths : m.strengths;
  const ours = m.commitments.filter((c) => c.side === "nous");
  const theirs = m.commitments.filter((c) => c.side === "prospect");
  return (
    <div className="mt-8 space-y-8">
      <div className="space-y-3">
        <Question n={1}>Qu&apos;est-ce que ce rendez-vous a changé dans le deal ?</Question>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-semibold text-slate-900">Impact sur le deal</h3>
            {m.stateChange && (
              <span className="flex items-center gap-1.5 text-[13px] text-slate-500">
                <StateChip state={m.stateChange.from} /> → <StateChip state={m.stateChange.to} />
              </span>
            )}
          </div>
          {m.impact.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-slate-500">Ce rendez-vous n&apos;a rien changé d&apos;autre sur le deal.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {m.impact.map((i, k) => (
                <li key={k} className="grid grid-cols-1 gap-x-3 gap-y-1 py-2.5 text-[13.5px] leading-snug text-slate-800 sm:grid-cols-[96px_minmax(0,1fr)]">
                  <span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TAGS[i.tag].tone}`}>{TAGS[i.tag].label}</span>
                  </span>
                  <span>{i.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-3">
        <Question n={2}>Qu&apos;est-ce qu&apos;il faut faire maintenant ?</Question>
        <Card>
          <h3 className="text-[16px] font-semibold text-slate-900">Engagements pris pendant ce rendez-vous</h3>
          {m.commitments.length === 0 && <p className="mt-3 text-[13.5px] text-slate-500">Aucun engagement relevé.</p>}
          <div className="mt-3 space-y-4">
            <Commitments title="À faire de notre côté" items={ours} />
            <Commitments title="Attendu du prospect" items={theirs} />
          </div>
          {m.next.items.length > 0 && (
            <div className="mt-4 rounded-xl bg-[color:var(--lavender)] px-4 py-3">
              <p className={`${LABEL} text-[color:var(--violet)]`}>À obtenir au R{m.next.rank}</p>
              <ul className="mt-1.5 space-y-1.5">
                {m.next.items.map((p) => (
                  <li key={p.label} className="text-[13.5px] leading-snug text-slate-800">
                    <span className="font-semibold">{p.label}</span>
                    {p.question && <span className="text-slate-600"> : {p.question}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-3">
        <Question n={3}>Qu&apos;est-ce qui aurait pu être mieux exécuté ?</Question>
        {m.playbook.length > 0 && (
          <Card>
            <h3 className="text-[16px] font-semibold text-slate-900">
              Playbook client <span className="text-[13.5px] font-medium text-slate-500">· à obtenir au R{m.rank}</span>
            </h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {m.playbook.map((r) => (
                <li key={r.key} className="grid grid-cols-1 gap-x-3 gap-y-1 py-2.5 text-[13.5px] leading-snug sm:grid-cols-[190px_96px_minmax(0,1fr)]">
                  <span className="font-semibold text-slate-900">{r.label}</span>
                  <span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${PLAYBOOK[r.status].tone}`}>{PLAYBOOK[r.status].label}</span>
                  </span>
                  <span className="text-slate-600">{r.text ?? ""}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <h3 className="text-[16px] font-semibold text-slate-900">Coaching</h3>
          {strengths.length > 0 && (
            <div className="mt-3">
              <p className={`${LABEL} text-emerald-700`}>Bien exécuté</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13.5px] leading-snug text-slate-800 marker:text-slate-400">
                {strengths.map((s, k) => (
                  <li key={k}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {m.coachingPoints.length > 0 ? (
            <div className="mt-4">
              <p className={`${LABEL} text-slate-500`}>{m.coachingPoints.length > 1 ? "Deux points à travailler" : "Un point à travailler"}</p>
              <div className={`mt-2 grid grid-cols-1 gap-3 ${m.coachingPoints.length > 1 ? "sm:grid-cols-2" : ""}`}>
                {m.coachingPoints.map((p, k) => (
                  <div key={k} className="min-w-0 rounded-2xl border border-border p-4">
                    <p className="text-[14.5px] font-semibold text-slate-900">{p.title}</p>
                    <p className="mt-1 text-[13.5px] leading-snug text-slate-600">{p.why}</p>
                    <div className="mt-3 rounded-xl bg-[color:var(--lavender)] px-3.5 py-2.5">
                      <p className={`${LABEL} text-[color:var(--violet)]`}>À dire la prochaine fois</p>
                      <p className="mt-0.5 text-[14px] font-medium leading-snug text-slate-900">{p.say}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {m.weaknesses.length > 0 && (
                <div className="mt-4">
                  <p className={`${LABEL} text-slate-500`}>À travailler</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13.5px] leading-snug text-slate-800 marker:text-slate-400">
                    {m.weaknesses.map((s, k) => (
                      <li key={k}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {m.recommendation && (
                <div className="mt-4 rounded-xl bg-[color:var(--lavender)] px-3.5 py-2.5">
                  <p className={`${LABEL} text-[color:var(--violet)]`}>Pour le prochain rendez-vous</p>
                  <p className="mt-0.5 text-[14px] leading-snug text-slate-900">{m.recommendation}</p>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
