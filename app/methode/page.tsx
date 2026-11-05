import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import {
  getClientReferences,
  getEnabledModulesForUser,
  getObjectionCategoryStats,
  getOrganizationDealRules,
  isDealMemoryEnabledForOrganization,
  listObjectionCategories,
  type ClientReference,
  type ObjectionCategory,
  type ObjectionCategoryStat,
} from "@/lib/db";
import { resolvePeriod } from "@/lib/period";
import type { ModuleKey } from "@/lib/modules";
import { isCitableReference } from "@/lib/reference-quality";
import { PageHeader } from "@/app/components/ui/PageHeader";
import ObjectivesSection from "./ObjectivesSection";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-border bg-white p-5 sm:p-6";
const LINK = "text-[13.5px] font-semibold text-[color:var(--violet)] hover:underline";

// La consigne de traitement, réduite à sa première phrase : la page résume,
// le détail vit dans Objections rencontrées.
function excerpt(text: string, max = 190): string {
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  const cut = first.length > max ? `${first.slice(0, max).replace(/\s+\S*$/, "")}…` : first;
  return cut.trim();
}

function handlingLabel(stat: ObjectionCategoryStat): { text: string; bad: boolean } {
  const evaluated = stat.wellHandled + stat.partiallyHandled + stat.notHandled;
  const times = `${stat.occurrences} fois`;
  if (evaluated === 0) return { text: times, bad: false };
  const rate = Math.round((100 * stat.wellHandled) / evaluated);
  return { text: `${times} · ${rate} % bien traitée${stat.occurrences > 1 ? "s" : ""}`, bad: rate < 50 };
}

// Méthode (05/11/2026, maquette G1 B choisie par Jean) : toute la méthode de
// l'équipe sur une page. Remplace « Playbook & objections » (la grille de
// notation disparaît avec la note sur 5) et « Références clients » au menu ;
// le détail des objections et la bibliothèque de références restent sur leurs
// pages. Chaque bloc n'existe que si son module est ouvert.
export default async function MethodePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { userId, role, organizationId } = viewer;
  if (!organizationId) redirect("/brief");
  const isManager = role === "manager";

  const [modules, dealMemory, rules, stats, categories, references] = await Promise.all([
    getEnabledModulesForUser(userId).catch((): ModuleKey[] => []),
    isDealMemoryEnabledForOrganization(organizationId),
    getOrganizationDealRules(organizationId).catch(() => null),
    // Le manager voit l'équipe, le commercial ses propres calls.
    getObjectionCategoryStats(organizationId, resolvePeriod({ period: "90d" }), isManager ? null : userId).catch(() => [] as ObjectionCategoryStat[]),
    listObjectionCategories(organizationId).catch(() => [] as ObjectionCategory[]),
    getClientReferences(userId).catch(() => [] as ClientReference[]),
  ]);

  const showObjectives = dealMemory && rules !== null;
  const showObjections = modules.includes("objections");
  const showReferences = modules.includes("references");
  if (!showObjectives && !showObjections && !showReferences) redirect("/brief");

  let n = 0;
  const numbers = {
    objectives: showObjectives ? ++n : 0,
    objections: showObjections ? ++n : 0,
    references: showReferences ? ++n : 0,
  };

  const encountered = stats
    .filter((s) => s.categoryId !== null && s.occurrences > 0)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 4);
  const unclassified = stats.find((s) => s.categoryId === null)?.occurrences ?? 0;

  const citable = references.filter(isCitableReference);
  // Trois exemples de clients différents, au résultat rédigé (« 45 000 € »
  // seul compte comme citable mais ne dit rien à l'oral).
  const seen = new Set<string>();
  const examples = citable.filter((ref) => {
    const key = (ref.client_name ?? "").trim().toLowerCase();
    if (!key || seen.has(key) || (ref.result ?? "").trim().length < 25) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Méthode de vente de l'équipe"
        title="Méthode"
        subtitle="Ce que l'équipe doit obtenir à chaque rendez-vous, comment répondre aux objections, quels clients citer."
      />

      <div className="mt-8 space-y-5">
        {showObjectives && rules && <ObjectivesSection number={numbers.objectives} initialRules={rules} canEdit={isManager} />}

        {showObjections && (
          <section className={CARD} aria-labelledby="methode-objections">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="methode-objections" className="text-[17px] font-semibold text-slate-900">
                {numbers.objections}. Objections et réponses
                <span className="ml-2 text-[14px] font-normal text-slate-500">
                  {categories.length} objection{categories.length > 1 ? "s" : ""} de référence · 3 derniers mois
                </span>
              </h2>
              <Link href="/playbook/objections" className={LINK}>
                {categories.length > 0 ? `Voir les ${categories.length}` : "Les définir"}
              </Link>
            </div>
            {categories.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-slate-500">
                Aucune objection de référence : définissez celles qui reviennent et comment y répondre, Brief s&apos;en sert pour évaluer chaque call.
              </p>
            ) : encountered.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-slate-500">Aucune de ces objections n&apos;a été rencontrée ces 3 derniers mois.</p>
            ) : (
              <ul className="mt-3">
                {encountered.map((stat) => {
                  const h = handlingLabel(stat);
                  return (
                    <li key={stat.categoryId} className="border-t border-border first:border-t-0">
                      <Link
                        href={`/playbook/objections/${stat.categoryId}?period=90d`}
                        className="grid grid-cols-1 gap-1 py-3 hover:bg-slate-50/60 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_150px] sm:gap-4"
                      >
                        <span className="text-[14px] font-semibold text-slate-900">{stat.label}</span>
                        <span className="text-[13.5px] text-slate-600">{stat.handlingGuidance ? excerpt(stat.handlingGuidance) : "Pas encore de consigne de traitement."}</span>
                        <span className={`text-[13px] tabular-nums sm:text-right ${h.bad ? "text-rose-700" : "text-slate-600"}`}>{h.text}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {unclassified > 0 && (
              <p className="mt-2 text-[13px] text-slate-500">
                {unclassified} objection{unclassified > 1 ? "s" : ""} rencontrée{unclassified > 1 ? "s" : ""} ne rentre{unclassified > 1 ? "nt" : ""} dans aucune catégorie.{" "}
                <Link href="/playbook/objections" className="font-semibold text-[color:var(--violet)] hover:underline">
                  Voir les catégories suggérées
                </Link>
              </p>
            )}
          </section>
        )}

        {showReferences && (
          <section className={CARD} aria-labelledby="methode-references">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="methode-references" className="text-[17px] font-semibold text-slate-900">
                {numbers.references}. Références clients
              </h2>
              <Link href="/references" className={LINK}>
                {references.length > 0 ? `Voir les ${references.length}` : "Importer"}
              </Link>
            </div>
            {references.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-slate-500">
                Aucune référence : importez vos cas clients, Brief cite dans chaque brief ceux qui ressemblent le plus au prospect.
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2 text-[13.5px]">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-800">
                    <strong>{references.length}</strong> référence{references.length > 1 ? "s" : ""}
                  </span>
                  <span className="rounded-lg bg-[color:var(--success-soft)] px-3 py-1.5 text-emerald-800">
                    <strong>{citable.length}</strong> citable{citable.length > 1 ? "s" : ""} (résultat chiffré)
                  </span>
                  {references.length - citable.length > 0 && (
                    <span className="rounded-lg bg-[color:var(--warning-soft)] px-3 py-1.5 text-amber-800">
                      <strong>{references.length - citable.length}</strong> à compléter
                    </span>
                  )}
                </div>
                {examples.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {examples.map((ref) => (
                      <div key={ref.id ?? ref.client_name} className="rounded-xl border border-border px-4 py-3">
                        <p className="text-[14px] font-semibold text-slate-900">{ref.client_name ?? "Client"}</p>
                        {ref.sector && <p className="text-[12.5px] text-slate-500">{ref.sector}</p>}
                        <p className="mt-1 text-[13px] text-slate-700">{excerpt(ref.result ?? "", 140)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
