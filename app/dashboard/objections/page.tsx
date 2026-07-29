import { redirect } from "next/navigation";
import Link from "next/link";
import { getEffectiveUserId } from "@/lib/session-user";
import {
  getUserRole,
  getUserOrganizationId,
  getCommercialsForManager,
  getObjectionCategoryStats,
  listObjectionCategories,
  type ObjectionCategoryStat,
  type ObjectionCategory,
} from "@/lib/db";
import { resolvePeriod, periodSearchParams } from "@/lib/period";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";
import { ChevronRight, Trophy, Users, XCircle } from "lucide-react";
import FadeIn from "../FadeIn";
import CommercialSelector from "../CommercialSelector";
import PeriodFilter from "../PeriodFilter";
import ObjectionsLibrary from "./ObjectionsLibrary";

export const dynamic = "force-dynamic";

// Barre de traitement : la répartition bien / partiellement / non traitée
// pour une objection donnée. C'est l'information que le manager vient
// chercher — le volume seul ne dit pas si l'équipe sait y répondre.
function HandlingBar({ stat }: { stat: ObjectionCategoryStat }) {
  const evaluated = stat.wellHandled + stat.partiallyHandled + stat.notHandled;
  if (evaluated === 0) {
    return (
      <p className="text-xs text-slate-400">
        {stat.occurrences > 0 ? "Traitement pas encore évalué" : "Jamais rencontrée sur la période"}
      </p>
    );
  }
  const segments = [
    { count: stat.wellHandled, className: "bg-emerald-500", label: "bien traitée" },
    { count: stat.partiallyHandled, className: "bg-amber-400", label: "partiellement" },
    { count: stat.notHandled, className: "bg-rose-500", label: "non traitée" },
  ].filter((s) => s.count > 0);

  return (
    <div className="w-full">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={segment.className}
            style={{ width: `${(100 * segment.count) / evaluated}%` }}
            title={`${segment.count} ${segment.label}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        {Math.round((100 * stat.wellHandled) / evaluated)}% bien traitées
        {stat.notHandled > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 text-rose-500">
            <XCircle className="h-3 w-3" /> {stat.notHandled} non traitée{stat.notHandled > 1 ? "s" : ""}
          </span>
        )}
      </p>
    </div>
  );
}

function OutcomeBadge({ stat }: { stat: ObjectionCategoryStat }) {
  const resolved = stat.wonCount + stat.lostCount;
  if (resolved === 0) return null;
  const rate = (stat.wonCount / resolved) * 100;
  const cls =
    rate >= 60 ? "bg-green-100 text-green-700" : rate >= 30 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Trophy className="h-3 w-3" /> {Math.round(rate)}% gagnés ({stat.wonCount}/{resolved})
    </span>
  );
}

// Onglet Performance > Objections. Trois strates, dans cet ordre :
//  1. la bibliothèque du manager (les « cases » qu'il définit) — repliée une
//     fois configurée ;
//  2. les statistiques par objection sur la période choisie ;
//  3. le détail par objection, sur sa propre page (/dashboard/objections/[id]).
// Le sélecteur de commercial et le filtre de période sont les deux mêmes
// query params partout dans Performance (?commercial=, ?period=/from=/to=).
export default async function ObjectionsStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ commercial?: string; period?: string; from?: string; to?: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, organizationId] = await Promise.all([getUserRole(userId), getUserOrganizationId(userId)]);
  const isManager = role === "manager";

  const commercials = isManager ? await getCommercialsForManager(userId) : [];
  const params = await searchParams;
  const selected = isManager && params.commercial ? commercials.find((c) => c.id === params.commercial) ?? null : null;
  const period = resolvePeriod(params);

  // Un commercial ne voit que ses propres objections ; le manager voit
  // l'équipe, ou un commercial précis via le sélecteur.
  const scopedUserId = isManager ? selected?.id ?? null : userId;

  const [stats, categories] = organizationId
    ? await Promise.all([
        getObjectionCategoryStats(organizationId, period, scopedUserId),
        // Pattern bug #14 : migration 006 pas encore appliquée → page
        // fonctionnelle avec une bibliothèque vide plutôt qu'un plantage.
        listObjectionCategories(organizationId).catch(() => [] as ObjectionCategory[]),
      ])
    : [[] as ObjectionCategoryStat[], [] as ObjectionCategory[]];

  const totalOccurrences = stats.reduce((sum, s) => sum + s.occurrences, 0);

  const subtitle = selected
    ? `Objections rencontrées par ${selected.name ?? selected.email} — ${period.label}.`
    : `Les objections que rencontre l'équipe, rangées dans vos catégories — ${period.label}.`;

  // La période et le commercial sélectionnés suivent le lien vers le détail :
  // « je regarde mars, je clique sur une objection » doit rester sur mars.
  const linkParams = periodSearchParams(
    period.preset,
    { from: period.from?.slice(0, 10), to: period.to?.slice(0, 10) },
    { commercial: selected?.id }
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader eyebrow="Performance" title="Objections" subtitle={subtitle} />
        </div>
      </FadeIn>

      {isManager && <CommercialSelector commercials={commercials} selectedId={selected?.id ?? null} />}

      {isManager && <ObjectionsLibrary categories={categories} />}

      <PeriodFilter preset={period.preset} from={period.from} to={period.to} />

      <FadeIn delay={0.05}>
        <Card padded={false} className="p-6">
          {totalOccurrences === 0 && categories.length === 0 ? (
            <p className="text-sm italic text-slate-400">
              {isManager
                ? "Définissez d'abord vos objections de référence ci-dessus — les objections détectées dans les calls viendront s'y ranger automatiquement."
                : "Aucune objection enregistrée pour l'instant — elles apparaissent ici au fur et à mesure des calls analysés."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.map((stat) => (
                <li key={stat.categoryId ?? "unclassified"}>
                  <Link
                    href={`/dashboard/objections/${stat.categoryId ?? "non-classees"}?${linkParams}`}
                    className="-mx-3 flex items-start justify-between gap-4 rounded-xl px-3 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{stat.label}</p>
                        <OutcomeBadge stat={stat} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {stat.occurrences} occurrence{stat.occurrences > 1 ? "s" : ""}
                        {stat.commercialsCount > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {stat.commercialsCount} commercial
                            {stat.commercialsCount > 1 ? "aux" : ""}
                          </span>
                        )}
                      </p>
                      <div className="mt-2.5 max-w-md">
                        <HandlingBar stat={stat} />
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </FadeIn>

      <p className="mt-4 text-xs text-slate-400">
        Pour retrouver le verbatim de chaque réponse et faire une recherche sémantique,{" "}
        <Link href="/settings/objections" className="font-medium text-[color:var(--violet)] hover:underline">
          ouvrez la bibliothèque complète →
        </Link>
      </p>
    </div>
  );
}
