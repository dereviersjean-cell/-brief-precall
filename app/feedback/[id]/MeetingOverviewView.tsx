import type { MeetingOverview } from "@/lib/meeting-overview";

// L'Overview d'un meeting en cinq blocs (synthèse produit du 03/11/2026,
// validée par Jean sur aperçu) : synthèse, playbook client, impact sur le
// deal, engagements et suite, coaching vs playbook. Pas de note sur 5.

const PLAYBOOK = {
  obtenu: { label: "Validé", tone: "bg-emerald-50 text-emerald-700" },
  a_preciser: { label: "Partiel", tone: "bg-amber-50 text-amber-700" },
  pas_aborde: { label: "Manquant", tone: "bg-rose-50 text-rose-700" },
  deja_obtenu: { label: "Déjà acquis", tone: "bg-slate-100 text-slate-500" },
} as const;

function day(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

function Card({ title, hint, children, className = "" }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-xs)] sm:p-6 ${className}`}>
      <h2 className="text-[16px] font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mt-0.5 text-[12.5px] text-slate-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function MeetingOverviewView({ m }: { m: MeetingOverview }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Synthèse du call" className="lg:col-span-2">
        <p className="line-clamp-[7] text-[14px] leading-relaxed text-slate-700">{m.summary || "—"}</p>
      </Card>

      <Card title="Playbook client" hint={`Ce qu'il fallait aller chercher au R${m.rank}`}>
        {m.playbook.length === 0 ? (
          <p className="text-[13.5px] text-slate-400">Aucun objectif fixé pour ce rendez-vous.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {m.playbook.map((r) => (
              <li key={r.key} className="flex items-start gap-3 py-2.5">
                <span className={`mt-0.5 w-[84px] shrink-0 rounded-md px-2 py-0.5 text-center text-[12px] font-medium ${PLAYBOOK[r.status].tone}`}>{PLAYBOOK[r.status].label}</span>
                <span className="min-w-0 text-[13.5px] leading-relaxed text-slate-700">
                  <span className="font-semibold text-slate-900">{r.label}</span>
                  {r.text && <span className="text-slate-500"> — {r.text}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Impact sur le deal" hint="Ce que ce call a changé">
        {m.impact.length === 0 ? (
          <p className="text-[13.5px] text-slate-400">Rien d&apos;autre n&apos;a bougé sur le deal.</p>
        ) : (
          <ul className="space-y-2.5">
            {m.impact.map((i, k) => (
              <li key={k} className="flex gap-2.5 text-[13.5px] leading-relaxed text-slate-700">
                <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${i.tone === "up" ? "bg-emerald-500" : "bg-rose-500"}`} />
                {i.text}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Engagements & suite">
        {m.commitments.length === 0 ? (
          <p className="text-[13.5px] text-slate-400">Aucun engagement relevé.</p>
        ) : (
          <ul className="space-y-2.5">
            {m.commitments.map((c, k) => (
              <li key={k} className="text-[13.5px] leading-relaxed text-slate-700">
                <span className="mr-1.5 text-slate-400">○</span>
                {c.text}
                {c.date && <span className="text-slate-500"> · {day(c.date)}</span>}
              </li>
            ))}
          </ul>
        )}
        {m.next.items.length > 0 && (
          <div className="mt-4 rounded-xl bg-blue-50 p-3.5">
            <p className="text-[12.5px] font-semibold text-slate-800">À reprendre au R{m.next.rank}</p>
            <ul className="mt-1.5 space-y-1.5">
              {m.next.items.map((p) => (
                <li key={p.label} className="text-[13px] leading-relaxed text-slate-700">
                  <span className="font-semibold">{p.label}</span>
                  {p.question && <span className="text-slate-600"> — {p.question}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="Coaching vs playbook">
        {m.strengths.length > 0 && (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-emerald-700">Bien exécuté</p>
            <ul className="mt-1.5 space-y-1.5">
              {m.strengths.map((s, k) => (
                <li key={k} className="text-[13.5px] leading-relaxed text-slate-700">
                  ✓ {s}
                </li>
              ))}
            </ul>
          </>
        )}
        {m.weaknesses.length > 0 && (
          <>
            <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-700">À mieux faire</p>
            <ul className="mt-1.5 space-y-1.5">
              {m.weaknesses.map((s, k) => (
                <li key={k} className="text-[13.5px] leading-relaxed text-slate-700">
                  △ {s}
                </li>
              ))}
            </ul>
          </>
        )}
        {m.recommendation && (
          <div className="mt-4 rounded-xl bg-blue-50 p-3.5">
            <p className="text-[12.5px] font-semibold text-slate-800">Recommandation</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-slate-700">{m.recommendation}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
