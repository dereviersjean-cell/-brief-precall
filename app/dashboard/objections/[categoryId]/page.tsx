import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import Link from "next/link";
import { getEffectiveUserId } from "@/lib/session-user";
import {
  getUserRole,
  getUserOrganizationId,
  getCommercialsForManager,
  getObjectionCategoryById,
  listObjectionOccurrencesForCategory,
  type ObjectionOccurrence,
} from "@/lib/db";
import { resolvePeriod, periodSearchParams } from "@/lib/period";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";
import { ArrowLeft, CheckCircle2, CircleSlash, ExternalLink, MinusCircle, Trophy, XCircle } from "lucide-react";
import FadeIn from "../../FadeIn";
import PeriodFilter from "../../PeriodFilter";
import OccurrenceDetail from "../OccurrenceDetail";

export const dynamic = "force-dynamic";

// Segment d'URL réservé pour le fourre-tout « objections qu'aucune catégorie
// ne couvre » — un uuid n'aurait rien désigné, cette entrée n'existe pas en
// base.
const UNCLASSIFIED_SLUG = "non-classees";

// Libellés recopiés plutôt qu'importés de lib/objection-classifier : ce
// module charge le SDK Anthropic, et rien ne garantit que cette page reste
// un server component (cf. bug #12, fuite du SDK dans le bundle client par
// import transitif). Trois chaînes ne valent pas ce risque.
const QUALITY_LABELS = {
  bien_traitee: "Bien traitée",
  partiellement: "Partiellement traitée",
  non_traitee: "Non traitée",
} as const;

function QualityBadge({ occurrence }: { occurrence: ObjectionOccurrence }) {
  if (!occurrence.handlingQuality) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600">
        <CircleSlash className="h-3 w-3" /> Non évaluée
      </span>
    );
  }
  const config = {
    bien_traitee: { cls: "bg-[color:var(--success-soft)] text-emerald-700", Icon: CheckCircle2 },
    partiellement: { cls: "bg-[color:var(--warning-soft)] text-amber-700", Icon: MinusCircle },
    non_traitee: { cls: "bg-[color:var(--danger-soft)] text-rose-700", Icon: XCircle },
  }[occurrence.handlingQuality];

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${config.cls}`}>
      <config.Icon className="h-3 w-3" /> {QUALITY_LABELS[occurrence.handlingQuality]}
    </span>
  );
}

// « Quel commercial a eu à faire face à cette objection sur la période
// choisie, et de quelle manière il l'a traitée. » Une ligne par occurrence
// réelle (pas par commercial) : le même commercial peut l'avoir bien traitée
// une fois et l'avoir esquivée la fois d'après, et c'est précisément ce que
// le manager doit pouvoir voir.
export default async function ObjectionCategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ commercial?: string; period?: string; from?: string; to?: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, organizationId] = await Promise.all([getUserRole(userId), getUserOrganizationId(userId)]);
  if (!organizationId) notFound();

  const isManager = role === "manager";
  const { categoryId: categorySlug } = await params;
  const query = await searchParams;
  const period = resolvePeriod(query);

  const commercials = isManager ? await getCommercialsForManager(userId) : [];
  const selected = isManager && query.commercial ? commercials.find((c) => c.id === query.commercial) ?? null : null;
  const scopedUserId = isManager ? selected?.id ?? null : userId;

  const isUnclassified = categorySlug === UNCLASSIFIED_SLUG;
  // Hors segment réservé, le slug DOIT être un uuid : sinon Postgres lève une
  // 22P02 qui remonte en erreur serveur au lieu d'un simple 404.
  if (!isUnclassified && !isUuid(categorySlug)) notFound();
  // getObjectionCategoryById filtre sur organization_id : un id valide d'une
  // autre organisation renvoie null → 404, jamais une confirmation qu'il
  // existe ailleurs.
  const category = isUnclassified ? null : await getObjectionCategoryById(organizationId, categorySlug);
  if (!isUnclassified && !category) notFound();

  const occurrences = await listObjectionOccurrencesForCategory(
    organizationId,
    isUnclassified ? null : categorySlug,
    period,
    scopedUserId
  );

  const backHref = `/dashboard/objections?${periodSearchParams(
    period.preset,
    { from: period.from?.slice(0, 10), to: period.to?.slice(0, 10) },
    { commercial: selected?.id }
  )}`;

  const wellHandled = occurrences.filter((o) => o.handlingQuality === "bien_traitee").length;
  const evaluated = occurrences.filter((o) => o.handlingQuality !== null).length;
  const byCommercial = new Set(occurrences.map((o) => o.userId).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <FadeIn>
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Toutes les objections
        </Link>
        <div className="mb-6">
          <PageHeader
            eyebrow="Objection"
            title={category?.label ?? "Non classées"}
            subtitle={
              category?.description ||
              (isUnclassified
                ? "Objections détectées dans les calls qu'aucune de vos catégories ne couvre — un signal que votre bibliothèque mérite d'être complétée."
                : undefined)
            }
          />
        </div>
      </FadeIn>

      {category?.handlingGuidance && (
        <FadeIn delay={0.03}>
          <div className="mb-5 rounded-2xl bg-[color:var(--lavender)] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[color:var(--violet)]">
              La méthode attendue
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-900">{category.handlingGuidance}</p>
          </div>
        </FadeIn>
      )}

      <PeriodFilter preset={period.preset} from={period.from} to={period.to} />

      {occurrences.length > 0 && (
        <p className="mb-4 text-[13px] tabular-nums text-slate-500">
          {occurrences.length} occurrence{occurrences.length > 1 ? "s" : ""} sur {period.label}
          {byCommercial > 0 && `, ${byCommercial} ${byCommercial > 1 ? "commerciaux concernés" : "commercial concerné"}`}
          {evaluated > 0 && ` — ${Math.round((100 * wellHandled) / evaluated)}% bien traitées`}
        </p>
      )}

      <FadeIn delay={0.05}>
        {occurrences.length === 0 ? (
          <Card>
            <p className="text-[13.5px] leading-relaxed text-slate-500">
              Cette objection n&apos;a été rencontrée par personne sur la période sélectionnée. Élargissez la période
              pour remonter plus loin.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {occurrences.map((occurrence) => (
              <li key={occurrence.id}>
                <Card padded={false} className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-slate-900">
                        {occurrence.userName ?? occurrence.userEmail ?? "Commercial inconnu"}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {new Date(occurrence.occurredAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {occurrence.companyName && ` · ${occurrence.companyName}`}
                        {occurrence.outcome && (
                          <span
                            className={`ml-2 inline-flex items-center gap-1 font-medium ${
                              occurrence.outcome === "won" ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            <Trophy className="h-3 w-3" /> Deal {occurrence.outcome === "won" ? "gagné" : "perdu"}
                          </span>
                        )}
                      </p>
                    </div>
                    <QualityBadge occurrence={occurrence} />
                  </div>

                  <div className="px-4 py-4 sm:px-5">
                    <OccurrenceDetail occurrence={occurrence} />
                  </div>

                  <div className="border-t border-border px-4 py-3 sm:px-5">
                    <Link
                      href={`/feedback/${occurrence.callId}`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--violet)] hover:underline"
                    >
                      Ouvrir le call <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </FadeIn>
    </div>
  );
}
