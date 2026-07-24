import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import {
  getUserRole,
  getUserOrganizationId,
  getObjectionStatsForOrganization,
  getObjectionStatsForUser,
  getCommercialsForManager,
  type ObjectionStat,
} from "@/lib/db";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";
import { Trophy, XCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import FadeIn from "../FadeIn";
import CommercialSelector from "../CommercialSelector";

export const dynamic = "force-dynamic";

function SuccessBadge({ stat }: { stat: ObjectionStat }) {
  const resolved = stat.wonCount + stat.lostCount;
  if (resolved === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <HelpCircle className="w-3 h-3" /> Issue inconnue
      </span>
    );
  }
  const rate = (stat.wonCount / resolved) * 100;
  const cls = rate >= 60 ? "bg-green-100 text-green-700" : rate >= 30 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <Trophy className="w-3 h-3" /> {Math.round(rate)}% ({stat.wonCount}/{resolved})
    </span>
  );
}

// Onglet Performance > Objections — bibliothèque org-wide par défaut (le
// playbook d'objections est par organisation, pas par user), avec un
// sélecteur manager pour ne voir que les objections rencontrées par un
// commercial précis. Vue stats agrégées (fréquence + taux de succès) ;
// /settings/objections reste la bibliothèque de réponses cherchables.
export default async function ObjectionsStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ commercial?: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, organizationId] = await Promise.all([getUserRole(userId), getUserOrganizationId(userId)]);
  const isManager = role === "manager";

  const commercials = isManager ? await getCommercialsForManager(userId) : [];
  const { commercial: selectedId } = await searchParams;
  const selected = isManager && selectedId ? commercials.find((c) => c.id === selectedId) ?? null : null;

  const stats = !organizationId
    ? []
    : selected
    ? await getObjectionStatsForUser(organizationId, selected.id)
    : await getObjectionStatsForOrganization(organizationId);

  const subtitle = selected
    ? `Objections rencontrées par ${selected.name ?? selected.email}, avec leur taux de succès quand l'issue du deal est connue.`
    : "Les objections les plus fréquentes de l'équipe, avec leur taux de succès quand l'issue du deal est connue.";

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader eyebrow="Performance" title="Objections" subtitle={subtitle} />
        </div>
      </FadeIn>

      {isManager && <CommercialSelector commercials={commercials} selectedId={selected?.id ?? null} />}

      <FadeIn delay={0.05}>
        <Card padded={false} className="p-6">
          {stats.length === 0 ? (
            <p className="text-slate-400 text-sm italic">
              Aucune objection enregistrée pour l&apos;instant — elles apparaissent ici au fur et à mesure des calls
              analysés.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.map((stat, i) => (
                <li key={i} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{stat.objection}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {stat.occurrences} occurrence{stat.occurrences > 1 ? "s" : ""}
                      {stat.lostCount > 0 && (
                        <span className="inline-flex items-center gap-1 ml-2 text-rose-500">
                          <XCircle className="w-3 h-3" /> {stat.lostCount} perdue{stat.lostCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <SuccessBadge stat={stat} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </FadeIn>

      <p className="mt-4 text-xs text-slate-400">
        Pour retrouver les réponses apportées et faire une recherche sémantique,{" "}
        <Link href="/settings/objections" className="text-[color:var(--violet)] font-medium hover:underline">
          ouvrez la bibliothèque complète →
        </Link>
      </p>
    </div>
  );
}
