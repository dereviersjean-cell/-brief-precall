"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDashed, ClipboardList, Play, XCircle } from "lucide-react";
import type { ModuleKey } from "@/lib/modules";
import type { ClientReview, ReviewCall } from "@/lib/client-review";
import type { CriterionResult } from "@/lib/parcours";
import { AdminPageShell, AdminPageHeader } from "@/app/admin/AdminShell";

// Rapport de préparation du point hebdomadaire, rangé dans l'ordre du
// déroulé du point (document « Brief — Parcours client type ») : constat,
// module de la semaine, action pour la semaine suivante, blocages — puis les
// annexes où l'on va chercher un chiffre pendant l'échange.

const PARIS = "Europe/Paris";

function formatReview(iso: string | null): string {
  if (!iso) return "pas de point planifié";
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: PARIS });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: PARIS });
}

function formatScore(score: number | null): string {
  return score === null ? "—" : score.toFixed(1).replace(".", ",");
}

function Delta({ now, before, decimals = 0 }: { now: number | null; before: number | null; decimals?: number }) {
  if (now === null || before === null) return null;
  const diff = now - before;
  if (Math.abs(diff) < (decimals ? 0.05 : 1)) return <span className="text-xs text-slate-400">stable</span>;
  const text = `${diff > 0 ? "+" : ""}${diff.toFixed(decimals).replace(".", ",")}`;
  return <span className={`text-xs font-medium ${diff > 0 ? "text-emerald-600" : "text-red-600"}`}>{text}</span>;
}

function Section({ step, title, duration, children }: { step?: number; title: string; duration?: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-border p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
          {step !== undefined && <span className="mr-2 text-[color:var(--violet)]">{step}.</span>}
          {title}
        </h2>
        {duration && <span className="text-xs text-slate-400">{duration}</span>}
      </div>
      {children}
    </section>
  );
}

function CriterionBox({ label, criterion, result }: { label: string; criterion: string; result: CriterionResult }) {
  const tone =
    result.status === "met"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : result.status === "unmet"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-border bg-slate-50 text-slate-700";
  const Icon = result.status === "met" ? CheckCircle2 : result.status === "unmet" ? AlertTriangle : CircleDashed;
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <p className="flex items-start gap-2 text-sm">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium">{label} :</span> {criterion} <span className="opacity-80">— {result.detail}</span>
        </span>
      </p>
      {result.missing.length > 0 && (
        <ul className="mt-2 ml-6 list-disc space-y-0.5 text-sm">
          {result.missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Ouvre un module pendant le point : le client le voit apparaître dès qu'il
// revient sur son onglet (ModulesProvider relit la liste au retour du focus).
function OpenModuleButton({
  organizationId,
  modules,
  moduleKey,
  label,
  onOpened,
}: {
  organizationId: string;
  modules: ModuleKey[];
  moduleKey: ModuleKey;
  label: string;
  onOpened: (next: ModuleKey[]) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = modules.includes(moduleKey);

  async function openModule() {
    if (!window.confirm(`Ouvrir le module « ${label} » pour ce client ? Il l'aura aussitôt.`)) return;
    setPending(true);
    setError(null);
    const next = [...modules, moduleKey];
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Ouverture impossible.");
      }
      onOpened(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ouverture impossible.");
    } finally {
      setPending(false);
    }
  }

  if (open) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" /> {label} ouvert
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        onClick={() => void openModule()}
        disabled={pending}
        className="px-4 py-2 brand-gradient text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Ouverture…" : `Ouvrir ${label}`}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

function CallCard({ label, call }: { label: string; call: ReviewCall }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Même chemin que « Ouvrir le compte » de la fiche client : on voit le call
  // exactement comme le client le verra pendant le partage d'écran.
  async function openAsUser() {
    if (!window.confirm(`Ouvrir ce call dans le compte de ${call.userLabel} ? Vous verrez exactement ce qu'il voit.`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: call.userId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Impossible d'ouvrir le compte.");
      }
      window.location.href = `/feedback/${call.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ouvrir le compte.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="font-medium text-slate-900">{call.title}</p>
        <p className="shrink-0 text-sm font-semibold text-slate-900">{formatScore(call.score)}/5</p>
      </div>
      <p className="text-xs text-slate-500">
        {call.userLabel} · {formatDay(call.createdAt)}
      </p>
      {call.summary && <p className="mt-2 text-sm text-slate-600 line-clamp-3">{call.summary}</p>}
      {(call.strength || call.weakness) && (
        <ul className="mt-2 space-y-1 text-sm">
          {call.strength && <li className="text-emerald-700">+ {call.strength}</li>}
          {call.weakness && <li className="text-orange-700">△ {call.weakness}</li>}
        </ul>
      )}
      <button
        onClick={() => void openAsUser()}
        disabled={pending}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--violet)] hover:text-[color:var(--violet)] disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5" />
        {pending ? "Ouverture…" : `Ouvrir dans le compte de ${call.userLabel}`}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function ClientReviewClient({ review }: { review: ClientReview }) {
  const { detail, totals, step } = review;
  const { overview } = detail;
  const [modules, setModules] = useState<ModuleKey[]>(overview.modules);

  const weekLabel = !overview.inParcours
    ? "Hors parcours"
    : review.reviewWeek === null
    ? "Parcours non daté"
    : overview.parcours.finished
    ? "Parcours terminé"
    : `Semaine ${review.reviewWeek} du parcours`;

  const objectionsClosed = !modules.includes("objections");
  const closedModules = review.closedModules.filter((m) => !modules.includes(m.key));

  return (
    <AdminPageShell maxWidth="max-w-5xl">
      <Link
        href={`/admin/clients/${overview.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[color:var(--violet)] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Fiche client
      </Link>

      <AdminPageHeader
        icon={ClipboardList}
        eyebrow="Préparer le point"
        title={overview.name}
        subtitle={
          <>
            {weekLabel} · point prévu {formatReview(overview.nextReviewAt)}
            {overview.accountManager ? ` · suivi par ${overview.accountManager}` : ""}
          </>
        }
      />

      <p className="-mt-2 mb-6 text-xs text-slate-400">
        Chiffres des 7 derniers jours, comparés aux 7 précédents. Calculé le {formatReview(review.generatedAt)}.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Calls enregistrés", value: String(totals.calls), delta: <Delta now={totals.calls} before={totals.callsPrev} /> },
          { label: "Briefs préparés", value: String(totals.briefs), delta: <Delta now={totals.briefs} before={totals.briefsPrev} /> },
          {
            label: "Score moyen",
            value: totals.avgScore === null ? "—" : `${formatScore(totals.avgScore)}/5`,
            delta: <Delta now={totals.avgScore} before={totals.avgScorePrev} decimals={1} />,
          },
          { label: "RDV dans les 7 jours", value: String(totals.upcomingMeetings), delta: null },
        ].map((tile) => (
          <div key={tile.label} className="bg-white rounded-2xl border border-border px-4 py-3 shadow-[var(--shadow-sm)]">
            <p className="text-xs text-slate-500">{tile.label}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold text-slate-900">{tile.value}</span>
              {tile.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <Section step={1} title="Le constat de la semaine" duration="10 min">
          {review.findings.length === 0 ? (
            <p className="text-sm text-slate-500">
              Pas assez de calls analysés cette semaine pour un constat chiffré. Appuyez-vous sur les chiffres ci-dessus
              ou sur un call à montrer.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-400">Choisissez-en un seul : c&apos;est lui qui ouvre le point.</p>
              <ul className="space-y-3">
                {review.findings.map((f) => (
                  <li key={f.text} className="rounded-xl border border-border px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">« {f.text} »</p>
                    <p className="mt-0.5 text-xs text-slate-400">{f.source}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        <Section step={2} title="Le module de la semaine" duration="10 min">
          {!step ? (
            <p className="text-sm text-slate-500">
              {overview.inParcours
                ? "Le parcours n'a pas de date de début : renseignez-la dans le panneau Suivi de la fiche client."
                : "Client hors parcours : tous les modules sont ouverts. Le point sert au constat et aux blocages."}
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Semaine {step.present.week} — {step.present.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">Ce qu&apos;on montre :</span> {step.present.show}
                </p>
                {step.readiness.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
                    {step.readiness.map((r) => (
                      <li key={r}>· {r}</li>
                    ))}
                  </ul>
                )}
              </div>

              {step.gate && step.gateResult && (
                <>
                  <CriterionBox label={`Critère de la semaine ${step.gate.week}`} criterion={step.gate.criterion} result={step.gateResult} />
                  {step.gateResult.status === "unmet" && step.toOpen.length > 0 && (
                    <p className="text-sm text-amber-800">
                      Règle du parcours : un module ne s&apos;ouvre que si le précédent sert. Cette semaine sert plutôt à
                      débloquer ce qui précède.
                    </p>
                  )}
                </>
              )}

              {step.present.modules.length === 0 ? (
                <p className="text-sm text-slate-500">Socle : rien à activer, à présenter sur ses propres données.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {step.present.modules.map((key) => (
                    <OpenModuleButton
                      key={key}
                      organizationId={overview.id}
                      modules={modules}
                      moduleKey={key}
                      label={step.toOpen.find((m) => m.key === key)?.label ?? review.closedModules.find((m) => m.key === key)?.label ?? key}
                      onOpened={setModules}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {(review.showcase.best || review.showcase.instructive) && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {review.showcase.best && <CallCard label="Le meilleur call de la semaine" call={review.showcase.best} />}
              {review.showcase.instructive && <CallCard label="Le plus instructif" call={review.showcase.instructive} />}
            </div>
          )}
        </Section>

        <Section step={3} title="L'action pour la semaine suivante" duration="5 min">
          {!step ? (
            <p className="text-sm text-slate-500">Une seule action, décidée avec le client à partir du constat.</p>
          ) : (
            <div className="space-y-3">
              <CriterionBox label={`Critère de la semaine ${step.present.week}`} criterion={step.present.criterion} result={step.presentResult} />
              <p className="text-sm text-slate-500">
                {step.presentResult.status === "met"
                  ? "Critère déjà atteint : proposez de passer à l'étape suivante au prochain point."
                  : step.presentResult.status === "unmet"
                  ? "Retenez une seule action, celle qui fait atteindre ce critère d'ici le prochain point."
                  : "Décision à prendre avec le client pendant ce point."}
              </p>
            </div>
          )}
        </Section>

        <Section step={4} title="Les blocages" duration="5 min">
          {review.blockers.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun blocage : agendas branchés, invitations acceptées, équipe active.</p>
          ) : (
            <ul className="space-y-2">
              {review.blockers.map((b) => (
                <li key={b.text} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${b.severity === "danger" ? "bg-red-500" : "bg-amber-400"}`} />
                  <span className="text-slate-700">{b.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Par commercial">
          {review.members.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun membre.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-4 font-medium">Membre</th>
                    <th className="py-2 pr-4 font-medium">Calls</th>
                    <th className="py-2 pr-4 font-medium">Score moyen</th>
                    <th className="py-2 pr-4 font-medium">Briefs</th>
                    <th className="py-2 font-medium">Dernière connexion</th>
                  </tr>
                </thead>
                <tbody>
                  {review.members.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="font-medium text-slate-900">{m.label}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          {m.status === "invited" ? "invité" : m.role === "manager" ? "manager" : "commercial"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {m.calls} <Delta now={m.calls} before={m.callsPrev} />
                      </td>
                      <td className="py-2.5 pr-4">
                        {formatScore(m.avgScore)} <Delta now={m.avgScore} before={m.avgScorePrev} decimals={1} />
                      </td>
                      <td className="py-2.5 pr-4">{m.briefs}</td>
                      <td className="py-2.5 text-slate-500">{m.lastSeenAt ? formatDay(m.lastSeenAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Objections de la semaine">
          {objectionsClosed && review.objections.length > 0 && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Module Objections fermé chez ce client : à garder pour sa semaine, ne pas les montrer avant.
            </p>
          )}
          {review.objections.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune objection repérée ces 7 derniers jours.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {review.objections.map((o) => (
                <li key={o.label} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-800">
                    {o.label}
                    {o.isNew && <span className="ml-2 rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-xs font-medium text-[color:var(--violet)]">nouvelle</span>}
                    {!o.isNew && o.thisWeek > o.prevWeek && (
                      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">en hausse</span>
                    )}
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {o.thisWeek} cette semaine · {o.prevWeek} la précédente
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {review.checklist.length > 0 && (
          <Section title="Critères du parcours">
            <ul className="space-y-2">
              {review.checklist.map(({ step: s, result, reached }) => {
                const Icon = result.status === "met" ? CheckCircle2 : result.status === "manual" ? CircleDashed : reached ? XCircle : CircleDashed;
                const color = result.status === "met" ? "text-emerald-600" : reached && result.status === "unmet" ? "text-amber-500" : "text-slate-300";
                return (
                  <li key={s.week} className={`flex items-start gap-2 text-sm ${reached ? "" : "opacity-60"}`}>
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                    <span>
                      <span className="font-medium text-slate-900">
                        Semaine {s.week} — {s.title}
                      </span>
                      <span className="text-slate-500"> · {s.criterion} </span>
                      <span className="text-slate-400">({result.detail})</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {overview.inParcours && closedModules.length > 0 && (
          <Section title="Pas encore ouverts">
            <ul className="space-y-1.5 text-sm">
              {closedModules.map((m) => (
                <li key={m.key} className="flex items-baseline gap-2">
                  <span className="w-24 shrink-0 text-xs text-slate-400">{m.week === null ? "À la demande" : `Semaine ${m.week}`}</span>
                  <span>
                    <span className="font-medium text-slate-900">{m.label}</span>
                    <span className="text-slate-500"> — {m.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </AdminPageShell>
  );
}
