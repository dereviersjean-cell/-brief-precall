import Link from "next/link";
import { ChevronRight, Trophy, Users, XCircle } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";
import FadeIn from "@/app/dashboard/FadeIn";
import PeriodFilter from "@/app/dashboard/PeriodFilter";
import { resolvePeriod } from "@/lib/period";
import { demoObjectionStats } from "@/lib/demo-data";
import type { ObjectionCategoryStat } from "@/lib/db";

export const dynamic = "force-dynamic";

// Version démonstration de Performance > Objections.
//
// La page réelle mêle encore lecture et rendu ; plutôt que de la refactorer
// dans le même mouvement que la vue d'ensemble, on reprend ici sa mise en
// page. C'est une duplication ASSUMÉE et limitée : la liste d'objections est
// une centaine de lignes de présentation, et la refactorisation de la page
// réelle demanderait de démêler le sélecteur de commercial, la bibliothèque
// manager et les suggestions de catégories — trois blocs qui n'ont aucun sens
// en démonstration. Si cette liste évolue, elle est à reporter ici.

function HandlingBar({ stat }: { stat: ObjectionCategoryStat }) {
  const evaluated = stat.wellHandled + stat.partiallyHandled + stat.notHandled;
  if (evaluated === 0) {
    return <p className="text-xs text-slate-400">Traitement pas encore évalué</p>;
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

export default async function DemoObjectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const period = resolvePeriod(await searchParams);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader
            eyebrow="Performance"
            title="Objections"
            subtitle={`Les objections que rencontre l'équipe, rangées dans vos catégories — ${period.label}.`}
          />
        </div>
      </FadeIn>

      <PeriodFilter preset={period.preset} from={period.from} to={period.to} />

      <FadeIn delay={0.05}>
        <Card padded={false} className="p-6">
          <ul className="divide-y divide-slate-100">
            {demoObjectionStats.map((stat) => (
              <li key={stat.categoryId ?? "unclassified"}>
                {/* Non cliquable en démonstration : le détail d'une occurrence
                    exposerait un verbatim et un enregistrement qui n'existent
                    pas. Mieux vaut une liste inerte qu'un lien mort. */}
                <div className="-mx-3 flex items-start justify-between gap-4 rounded-xl px-3 py-4">
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
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-200" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </FadeIn>

      <p className="mt-4 text-xs text-slate-400">
        Dans votre compte, chaque objection s&apos;ouvre sur le détail : qui l&apos;a rencontrée, ce que le prospect a
        dit mot pour mot, la réponse apportée, et ce qu&apos;il aurait fallu répondre.{" "}
        <Link href="/dashboard/objections" className="font-medium text-[color:var(--violet)] hover:underline">
          Voir mes objections réelles →
        </Link>
      </p>
    </div>
  );
}
