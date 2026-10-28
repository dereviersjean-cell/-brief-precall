"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/app/mes-deals/MesDealsView";
import { Line } from "@/app/components/CopyLine";
import { actionLabel } from "@/lib/deal-advice";
import {
  coachingQuestions,
  firstName,
  INTERVENTION_ORDER,
  interventionLevel,
  managerTitle,
  managerWhy,
  personAdvice,
  recurringWeakPoint,
  type InterventionLevel,
} from "@/lib/deal-coaching";
import type { DealProgress } from "@/lib/deal-progress";

// Onglet Équipe de « Deals de l'équipe », version M3 choisie par Jean le
// 27/10/2026 parmi trois propositions, dans le même esprit que « Mes deals »
// (D3) : en haut une carte par commercial (photo, deals à reprendre, point
// qui revient) ; un clic filtre sur lui et affiche le conseil le concernant.
// En dessous, les deals de l'équipe groupés par besoin d'intervention, et le
// deal choisi : faut-il intervenir, pourquoi (la phrase du call), quoi dire
// au commercial. Le conseil est construit par lib/deal-coaching.ts.

export type TeamPerson = { id: string; name: string; avatarUrl: string | null; week: number; lastAt: string | null; deals: DealProgress[] };
// Le « Vu » de l'onglet « Où intervenir », pour les deals qui ont des alertes.
export type Reviewable = Record<string, { rules: string[]; seen: boolean }>;

const LEVEL: Record<InterventionLevel, { label: string; group: string; text: string; soft: string }> = {
  oui: { label: "Intervenir", group: "Intervenir maintenant", text: "#BE123C", soft: "#FFF1F2" },
  surveiller: { label: "À surveiller", group: "À surveiller", text: "#B45309", soft: "#FFFBEB" },
  non: { label: "Ça avance", group: "Ça avance", text: "#047857", soft: "#ECFDF5" },
};

function hue(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// La photo de profil (Google ou Microsoft), sinon les initiales sur une
// teinte propre à la personne.
export function PersonPhoto({ name, url, size }: { name: string; url: string | null; size: 28 | 44 }) {
  const [broken, setBroken] = useState(false);
  const box = size > 40 ? "h-11 w-11" : "h-7 w-7";
  if (url && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} referrerPolicy="no-referrer" onError={() => setBroken(true)} className={`${box} shrink-0 rounded-full object-cover ring-1 ring-stone-200`} />;
  }
  const h = hue(name);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={`${box} grid shrink-0 place-items-center rounded-full font-semibold`}
      style={{ fontSize: size * 0.38, background: `hsl(${h} 70% 93%)`, color: `hsl(${h} 55% 32%)` }}
    >
      {initials}
    </span>
  );
}

function Pill({ level }: { level: InterventionLevel }) {
  return (
    <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: LEVEL[level].soft, color: LEVEL[level].text }}>
      {LEVEL[level].label}
    </span>
  );
}

function Questions({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-500">{title}</p>
      <ul className="mt-2.5 space-y-2.5">
        {items.map((q) => (
          <Line key={q} text={q} />
        ))}
      </ul>
    </div>
  );
}

function SeenButton({ dealId, review }: { dealId: string; review: Reviewable[string] | undefined }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!review || review.rules.length === 0) return null;
  if (review.seen) return <span className="inline-flex h-9 items-center px-2 text-[13px] text-stone-400">Vu ✓</span>;
  async function markSeen() {
    setBusy(true);
    setError(false);
    const res = await fetch(`/api/deals/${dealId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "seen", alertRules: review?.rules ?? [] }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) setError(true);
    else router.refresh();
  }
  return (
    <>
      <button onClick={markSeen} disabled={busy} className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-medium text-stone-500 hover:text-stone-900 disabled:opacity-60">
        {busy ? "…" : "Marquer comme vu"}
      </button>
      {error && <span className="self-center text-[12.5px] text-rose-700">Impossible d&apos;enregistrer, réessayez.</span>}
    </>
  );
}

function DealDetail({ d, owner, review }: { d: DealProgress; owner: string; review: Reviewable[string] | undefined }) {
  const level = interventionLevel(d);
  const first = firstName(owner);
  const quote = d.focus.status !== "relancer" && d.topAlert?.quote ? d.topAlert : null;
  return (
    <article className="rounded-2xl bg-white p-5 ring-1 ring-stone-200 sm:p-7">
      <div className="flex items-center gap-3.5">
        <Avatar d={d} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-stone-500">
            {owner} · {d.hubspot?.stage ?? "Hors HubSpot"} · R{d.steps.length} · {d.known}/{d.total} infos
          </p>
          <h2 className="truncate text-[22px] font-semibold tracking-[-0.025em] text-stone-900">{d.name}</h2>
        </div>
        <Pill level={level} />
      </div>

      <div className="mt-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-emerald-700">Le conseil de Brief</p>
        <p className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-stone-900">{managerTitle(d, owner)}</p>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-stone-600">{managerWhy(d)}</p>
      </div>

      {quote && (
        <blockquote className="mt-4 border-l-[3px] border-emerald-500 pl-4 text-[14px] italic leading-relaxed text-stone-700">
          « {quote.quote} »{quote.speaker && <span className="block pt-1 text-[12px] not-italic text-stone-400">{quote.speaker}</span>}
        </blockquote>
      )}

      {level !== "non" && (
        <div className="mt-6">
          <Questions title={`Ce que vous pouvez dire à ${first}`} items={coachingQuestions(d)} />
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-6 border-t border-stone-100 pt-5 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[12px] font-semibold text-stone-500">Ce que {first} doit faire</h3>
          <p className="text-[14px] font-semibold text-stone-900">{actionLabel(d)}</p>
          {d.focus.detail && <p className="text-[12.5px] text-stone-500">{d.focus.detail}</p>}
        </section>
        <section>
          <h3 className="mb-2 text-[12px] font-semibold text-stone-500">À obtenir</h3>
          <p className="text-[13px] text-stone-700">{d.toObtain.length ? d.toObtain.join(" · ") : "Qualification complète"}</p>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/deal/${d.id}`} className="inline-flex h-9 items-center rounded-full bg-stone-900 px-4 text-[13px] font-semibold text-white hover:bg-stone-800">
          Ouvrir le deal
        </Link>
        <Link
          href={`/feedback/${d.lastCall.id}`}
          className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
        >
          Revoir le dernier call
        </Link>
        <SeenButton dealId={d.id} review={review} />
      </div>
    </article>
  );
}

function PersonCard({ p, selected, onClick }: { p: TeamPerson; selected: boolean; onClick: () => void }) {
  const weak = recurringWeakPoint(p.deals);
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`w-[200px] shrink-0 rounded-2xl bg-white p-3.5 text-left lg:w-auto ${selected ? "ring-2 ring-emerald-500" : "ring-1 ring-stone-200 hover:ring-stone-300"}`}
    >
      <div className="flex items-center gap-2.5">
        <PersonPhoto name={p.name} url={p.avatarUrl} size={28} />
        <p className="truncate text-[13.5px] font-semibold text-stone-900">{firstName(p.name)}</p>
      </div>
      <div className="mt-2.5 flex min-h-[20px] flex-wrap gap-1 text-[11px] font-semibold">
        {INTERVENTION_ORDER.map((l) => {
          const n = p.deals.filter((d) => interventionLevel(d) === l).length;
          return n ? (
            <span key={l} className="rounded-full px-1.5 py-px" style={{ background: LEVEL[l].soft, color: LEVEL[l].text }}>
              {n} {LEVEL[l].label.toLowerCase()}
            </span>
          ) : null;
        })}
        {p.deals.length === 0 && <span className="text-stone-400">Aucun deal suivi</span>}
      </div>
      <p className="mt-2 truncate text-[11.5px] text-stone-500">
        {weak ? `À travailler : ${weak.label.toLowerCase()}` : `${p.week} call${p.week > 1 ? "s" : ""} ces 7 derniers jours`}
      </p>
    </button>
  );
}

// Le conseil sur la personne filtrée : son point qui revient, les questions
// pour le prochain point avec elle.
function PersonBanner({ p }: { p: TeamPerson }) {
  const advice = personAdvice(p.name, p.deals);
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200 sm:p-6">
      <div className="flex items-start gap-3.5">
        <PersonPhoto name={p.name} url={p.avatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-emerald-700">Le conseil de Brief · {p.name}</p>
          <p className="mt-1 text-[19px] font-semibold leading-snug tracking-[-0.02em] text-stone-900">{advice.title}</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-stone-600">
            {advice.why} {p.week} call{p.week > 1 ? "s" : ""} ces 7 derniers jours.
          </p>
        </div>
      </div>
      {advice.questions.length > 0 && (
        <div className="mt-4">
          <Questions title={`Pour votre prochain point avec ${firstName(p.name)}`} items={advice.questions} />
        </div>
      )}
    </section>
  );
}

export default function TeamCoachView({
  people,
  reviewable,
  initialFilter = null,
}: {
  people: TeamPerson[];
  reviewable: Reviewable;
  // ?commercial=<id> : ouvre l'onglet filtré sur un commercial de l'équipe.
  initialFilter?: string | null;
}) {
  const [filter, setFilter] = useState<string | null>(people.some((p) => p.id === initialFilter) ? initialFilter : null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  if (people.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-5 text-[13.5px] text-stone-500 ring-1 ring-stone-200">
        Aucune activité ni aucun deal suivi dans votre équipe pour l&apos;instant.
      </p>
    );
  }

  const person = people.find((p) => p.id === filter) ?? null;
  const all = (person ? [person] : people).flatMap((p) => p.deals.map((d) => ({ d, owner: p.name })));
  const selected = all.find((x) => x.d.id === selectedId) ?? all.find((x) => interventionLevel(x.d) !== "non") ?? all[0];
  const everyDeal = people.flatMap((p) => p.deals);

  function select(id: string) {
    setSelectedId(id);
    // Sur téléphone, le détail est sous la liste : on y descend.
    if (window.matchMedia("(max-width: 1023px)").matches) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 text-[12.5px]">
        {INTERVENTION_ORDER.map((l) => (
          <span key={l} className="rounded-full px-2.5 py-1 font-semibold" style={{ background: LEVEL[l].soft, color: LEVEL[l].text }}>
            {everyDeal.filter((d) => interventionLevel(d) === l).length} {LEVEL[l].label.toLowerCase()}
          </span>
        ))}
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] lg:overflow-visible lg:px-0 lg:pb-0">
        {people.map((p) => (
          <PersonCard
            key={p.id}
            p={p}
            selected={p.id === filter}
            onClick={() => {
              setFilter(p.id === filter ? null : p.id);
              setSelectedId(null);
            }}
          />
        ))}
      </div>

      {person && <PersonBanner p={person} />}

      {all.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-[13.5px] text-stone-500 ring-1 ring-stone-200">
          {person ? `${firstName(person.name)} n'a aucun deal suivi pour l'instant.` : "Aucun deal suivi pour l'instant."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            {INTERVENTION_ORDER.map((l) => {
              const list = all.filter((x) => interventionLevel(x.d) === l);
              if (list.length === 0) return null;
              return (
                <section key={l}>
                  <h3 className="mb-2 px-1 text-[12px] font-semibold text-stone-500">
                    {LEVEL[l].group} · {list.length}
                  </h3>
                  <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
                    {list.map((x) => (
                      <li key={x.d.id} className="border-b border-stone-100 last:border-0">
                        <button
                          onClick={() => select(x.d.id)}
                          aria-current={x.d.id === selected?.d.id}
                          className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${x.d.id === selected?.d.id ? "bg-emerald-50/70" : "hover:bg-stone-50"}`}
                        >
                          <Avatar d={x.d} size={34} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold text-stone-900">{x.d.name}</p>
                            <p className="truncate text-[12px] text-stone-500">
                              {firstName(x.owner)} · {actionLabel(x.d)}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <div ref={detailRef} className="min-w-0 scroll-mt-20">
            {selected && <DealDetail d={selected.d} owner={selected.owner} review={reviewable[selected.d.id]} />}
          </div>
        </div>
      )}
    </div>
  );
}
