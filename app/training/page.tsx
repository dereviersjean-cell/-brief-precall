import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { getEffectiveUserId } from "@/lib/session-user";
import {
  getUserRole,
  getUserOrganizationId,
  isTrainingEnabledForOrganization,
  listTrainingObjectionCandidatesForUser,
  listTrainingSessionsForUser,
  getTrainingStatsForOrganization,
  getCommercialsForManager,
} from "@/lib/db";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";
import TrainingClient from "./TrainingClient";
import TrainingLockedClient from "./TrainingLockedClient";
import CommercialSelector from "../dashboard/CommercialSelector";
import FadeIn from "../dashboard/FadeIn";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ objection?: string; commercial?: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const { objection, commercial: selectedId } = await searchParams;
  const organizationId = await getUserOrganizationId(userId);

  const trainingEnabled = organizationId ? await isTrainingEnabledForOrganization(organizationId) : false;
  if (!trainingEnabled) {
    return <TrainingLockedClient />;
  }

  const role = await getUserRole(userId);

  // Manager : jamais le contenu des sessions (transcripts/débriefs) d'un
  // commercial — décision produit, l'entraînement doit rester un espace sûr.
  // Seulement les compteurs/scores agrégés, en équipe ou pour un commercial
  // précis via le sélecteur (même getTrainingStatsForOrganization que
  // /team/insights, filtré côté page pour la vue individuelle).
  if (role === "manager") {
    const commercials = await getCommercialsForManager(userId);
    const selected = selectedId ? commercials.find((c) => c.id === selectedId) ?? null : null;
    const allStats = await getTrainingStatsForOrganization(organizationId!).catch(() => []);
    const stats = selected ? allStats.filter((s) => s.userId === selected.id) : allStats;

    return (
      <main className="max-w-4xl mx-auto px-4 py-10 sm:px-6">
        <FadeIn>
          <div className="mb-8">
            <PageHeader
              eyebrow="Performance"
              title="Entraînement"
              subtitle={
                selected
                  ? `Statistiques d'entraînement de ${selected.name ?? selected.email} — le contenu des sessions reste personnel.`
                  : "Qui s'entraîne et progresse dans l'équipe — le contenu des sessions reste personnel."
              }
            />
          </div>
        </FadeIn>

        <CommercialSelector commercials={commercials} selectedId={selected?.id ?? null} />

        <FadeIn delay={0.05}>
          <Card padded={false} className="px-4 py-1.5 sm:px-6">
            {stats.length === 0 ? (
              <p className="py-4 text-[13.5px] text-slate-500">Aucune session d&apos;entraînement terminée pour l&apos;instant.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.map((stat) => (
                  <li key={stat.userId} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-slate-900 truncate">{stat.name ?? stat.email}</p>
                      <p className="text-[12px] tabular-nums text-slate-500 mt-0.5">
                        {stat.sessionsCount} session{stat.sessionsCount > 1 ? "s" : ""}
                        {stat.lastSessionAt && ` · dernière le ${formatDate(stat.lastSessionAt)}`}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {stat.avgScore === null ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums ${
                            stat.avgScore >= 4
                              ? "bg-[color:var(--success-soft)] text-emerald-700"
                              : stat.avgScore >= 2.5
                                ? "bg-[color:var(--warning-soft)] text-amber-700"
                                : "bg-[color:var(--danger-soft)] text-rose-700"
                          }`}
                        >
                          {stat.avgScore.toFixed(1)}/5 en moyenne
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </FadeIn>

        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[12.5px] text-slate-500">
          <Dumbbell className="h-3.5 w-3.5" />
          Vue détaillée par objection et par équipe :{" "}
          <Link href="/team/insights" className="text-[color:var(--violet)] font-medium hover:underline">
            Équipe → Insights
          </Link>
        </p>
      </main>
    );
  }

  // Commercial — comportement inchangé : espace de pratique personnel.
  const [candidates, history] = await Promise.all([
    organizationId
      ? listTrainingObjectionCandidatesForUser(userId, organizationId).catch(() => [])
      : Promise.resolve([]),
    listTrainingSessionsForUser(userId).catch(() => []),
  ]);

  return <TrainingClient candidates={candidates} history={history} initialObjection={objection?.slice(0, 500) ?? null} />;
}
