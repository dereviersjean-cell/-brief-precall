"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MousePointerClick } from "lucide-react";
import { StateChip } from "@/app/mes-deals/deal-ui";
import type { DealState } from "@/lib/deal-progress";
import { AppSidebar } from "./AppSidebar";
import { ValdorLogo } from "./brands";
import { NB, rep } from "./team-data";

// « Suivi des deals », la page du manager, au format réel (app/deals :
// DealsBoardClient, SuiviView du 14/11/2026, ForecastView du 10/11/2026) :
//   - Suivi › À reprendre : trois chiffres, une carte par deal qui demande
//     l'intervention du manager (le problème, l'action recommandée, la
//     question à poser au commercial), puis les deals endormis ;
//   - Suivi › Tous les deals : le tableau de l'équipe ;
//   - Prévision : ce que dit HubSpot comparé à ce que les calls confirment.
// Mêmes libellés et même ordre de priorité que l'app (dégradation, engagement
// non tenu, blocage ; `lib/deal-suivi.ts`). Remplace l'aperçu Performance
// (notes sur 5, analytics), retiré de l'app le 05/11/2026.
// Données fictives, annoncées en pied ; les totaux se recoupent.

type Kind = "Dégradation" | "Engagement non tenu" | "Blocage";

const KIND_TONES: Record<Kind, string> = {
  Dégradation: "bg-rose-50 text-rose-700",
  "Engagement non tenu": "bg-rose-50 text-rose-700",
  Blocage: "bg-amber-50 text-amber-700",
};

type Deal = {
  name: string;
  color: string;
  owner: string;
  state: DealState;
  rank: number;
  stage: string;
  amount: number;
  last: string;
};

const DEALS: Deal[] = [
  { name: "Valdor Emballages", color: "#0B6B58", owner: "thomas", state: "progres", rank: 2, stage: "Présentation", amount: 40000, last: "2 oct." },
  { name: "Arvel Industrie", color: "#4B5BA8", owner: "thomas", state: "qualifier", rank: 1, stage: "Qualification", amount: 0, last: "2 oct." },
  { name: "Hexa Transports", color: "#B4532A", owner: "karim", state: "recul", rank: 2, stage: "Présentation", amount: 32000, last: "1er oct." },
  { name: "Kalio Santé", color: "#1E8C93", owner: "lea", state: "progres", rank: 2, stage: "Évaluation", amount: 22000, last: "30 sept." },
  { name: "Lumen Logistique", color: "#6C4BB0", owner: "julie", state: "relancer", rank: 3, stage: "Proposition", amount: 58000, last: "22 sept." },
  { name: "Studio Lin", color: "#C2453A", owner: "lea", state: "qualifier", rank: 2, stage: "Qualification", amount: 12000, last: "19 sept." },
  { name: "Novaterm Industrie", color: "#3F6B3A", owner: "thomas", state: "relancer", rank: 1, stage: "Qualification", amount: 0, last: "16 sept." },
  { name: "Atelier Moreau", color: "#9A6B2F", owner: "julie", state: "relancer", rank: 2, stage: "Évaluation", amount: 18000, last: "11 sept." },
];

const deal = (name: string) => DEALS.find((x) => x.name === name) ?? DEALS[0];

const ALERTS: { deal: string; kind: Kind; problem: string; action: string; question: string }[] = [
  {
    deal: "Hexa Transports",
    kind: "Dégradation",
    problem: "Le prospect a cité un concurrent moins cher et repoussé sa décision au trimestre prochain.",
    action: "Reprendre avec Karim le chiffrage du retour sur investissement avant sa relance.",
    question: "Qui, chez Hexa, a demandé le devis concurrent ?",
  },
  {
    deal: "Lumen Logistique",
    kind: "Engagement non tenu",
    problem: "La proposition promise pour le 26 septembre n'est pas partie.",
    action: "Faire partir la proposition aujourd'hui, avec une date de retour convenue.",
    question: "Qu'est-ce qui retient l'envoi de la proposition ?",
  },
  {
    deal: "Studio Lin",
    kind: "Blocage",
    problem: "Deux rendez-vous, et le décideur n'est toujours pas identifié.",
    action: "Préparer avec Léa la question du circuit de décision pour le prochain échange.",
    question: "Qui signe chez Studio Lin, en dehors de votre contact ?",
  },
];

const SLEEPING: { deal: string; idle: number }[] = [
  { deal: "Atelier Moreau", idle: 21 },
  { deal: "Novaterm Industrie", idle: 16 },
];

// Prévision du mois : HubSpot d'après l'étape de chaque deal, Brief d'après ce
// que les calls confirment.
const FORECAST: { owner: string; count: number; pipeline: number; hubspot: number; brief: number }[] = [
  { owner: "julie", count: 2, pipeline: 76000, hubspot: 49000, brief: 22000 },
  { owner: "karim", count: 1, pipeline: 32000, hubspot: 16000, brief: 5000 },
  { owner: "thomas", count: 1, pipeline: 40000, hubspot: 28000, brief: 24000 },
  { owner: "lea", count: 1, pipeline: 22000, hubspot: 10000, brief: 7000 },
];
const SIGNED = 38000;

const euros = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB)}${NB}€`;
const nb = (s: string) => s.replace(/ \?/g, `${NB}?`);
const meta = (d: Deal) => [`R${d.rank}`, d.stage, d.amount ? euros(d.amount) : null].filter(Boolean).join(" · ");
const CAPS = "text-[11px] font-semibold uppercase tracking-[0.08em] text-land-faint";

function DealLogo({ d, size = 34 }: { d: Deal; size?: number }) {
  if (d.name.startsWith("Valdor")) return <ValdorLogo size={size} />;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg font-bold text-white"
      style={{ backgroundColor: d.color, width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {d.name[0]}
    </span>
  );
}

function Stat({ value, label, tone = "text-land-ink" }: { value: string | number; label: string; tone?: string }) {
  return (
    <div className="min-w-0 flex-1 basis-40 rounded-2xl border border-land-line bg-land-surface px-4 py-3.5">
      <div className={`text-[24px] font-semibold tabular-nums tracking-[-0.02em] ${tone}`}>{value}</div>
      <div className="text-[13px] leading-snug text-land-muted">{label}</div>
    </div>
  );
}

function ToResume() {
  const atStake = ALERTS.reduce((sum, a) => sum + deal(a.deal).amount, 0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Stat value={ALERTS.length} label="deals demandent votre intervention" tone="text-rose-700" />
        <Stat value={SLEEPING.length} label="deals endormis" />
        <Stat value={euros(atStake)} label="en jeu sur les deals à reprendre" />
      </div>
      {ALERTS.map((a) => {
        const d = deal(a.deal);
        const first = rep(d.owner).first;
        return (
          <article key={a.deal} className="rounded-2xl border border-land-line bg-land-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <DealLogo d={d} />
                <div className="min-w-0">
                  <div className="truncate text-[15.5px] font-semibold text-land-ink">
                    {d.name} <span className="text-[13px] font-medium text-land-muted">· {first}</span>
                  </div>
                  <div className="text-[12.5px] text-land-muted">{meta(d)}</div>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${KIND_TONES[a.kind]}`}>{a.kind}</span>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[13.5px] leading-snug sm:grid-cols-[150px_minmax(0,1fr)]">
              <dt className={`${CAPS} pt-0.5`}>Le problème</dt>
              <dd className="text-land-muted">{a.problem}</dd>
              <dt className={`${CAPS} pt-0.5`}>Action recommandée</dt>
              <dd className="font-semibold text-land-ink">{a.action}</dd>
            </dl>
            <div className="mt-3 rounded-xl bg-land-accent-soft px-3.5 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-land-accent">À demander à {first}</div>
              <p className="mt-0.5 text-[13.5px] font-medium leading-snug text-land-ink">{nb(a.question)}</p>
            </div>
          </article>
        );
      })}
      <section className="rounded-2xl border border-land-line bg-land-surface p-4 sm:p-5">
        <div className="text-[15.5px] font-semibold text-land-ink">
          Deals endormis <span className="text-[13px] font-medium text-land-muted">· {SLEEPING.length}</span>
        </div>
        <p className="mt-0.5 text-[13px] text-land-muted">À relancer ou à clôturer. Ils ne demandent pas forcément votre intervention.</p>
        <ul className="mt-2 divide-y divide-land-line">
          {SLEEPING.map((s) => {
            const d = deal(s.deal);
            return (
              <li key={s.deal} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                <span className="min-w-0">
                  <span className="text-[14px] font-semibold text-land-ink">{d.name}</span>{" "}
                  <span className="text-[13px] text-land-muted">· {rep(d.owner).first}</span>
                  <span className="block text-[12.5px] text-land-muted">{meta(d)}</span>
                </span>
                <span className="whitespace-nowrap text-[13px] text-land-muted">{s.idle} jours sans échange</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function AllDeals() {
  const columns = "sm:grid-cols-[minmax(0,1.2fr)_120px_120px_minmax(0,1fr)_128px]";
  return (
    <div className="overflow-hidden rounded-2xl border border-land-line bg-land-surface">
      <div className={`hidden gap-4 border-b border-land-line px-5 py-3 ${CAPS} sm:grid ${columns}`}>
        <span>Deal</span>
        <span>Commercial</span>
        <span>État</span>
        <span>Étape</span>
        <span>Dernier échange</span>
      </div>
      <ul>
        {DEALS.map((d) => {
          const owner = rep(d.owner);
          return (
            <li key={d.name} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-land-line px-4 py-2.5 last:border-0 sm:px-5 ${columns}`}>
              <span className="flex min-w-0 items-center gap-3">
                <DealLogo d={d} size={30} />
                <span className="truncate text-[14px] font-semibold text-land-ink">{d.name}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2 text-[13px] text-land-ink">
                <Image src={owner.photo} alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-full object-cover" />
                <span className="truncate">{owner.first}</span>
              </span>
              <span>
                <StateChip state={d.state} />
              </span>
              <span className="truncate text-[13px] text-land-muted">
                R{d.rank} · {d.stage}
              </span>
              <span className="text-[13px] text-land-muted">{d.last}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Forecast() {
  const hubspot = FORECAST.reduce((s, f) => s + f.hubspot, 0);
  const brief = FORECAST.reduce((s, f) => s + f.brief, 0);
  const count = FORECAST.reduce((s, f) => s + f.count, 0);
  const cards: { label: string; value: string; detail: string; tone: string; box: string }[] = [
    {
      label: "Atterrissage prévu par Brief",
      value: euros(SIGNED + brief),
      detail: `${euros(SIGNED)} déjà signés + ${euros(brief)} attendus sur ${count} deals`,
      tone: "text-land-ink",
      box: "border-land-line bg-land-surface",
    },
    {
      label: "Ce que dit HubSpot",
      value: euros(SIGNED + hubspot),
      detail: `${euros(SIGNED)} signés + ${euros(hubspot)} d'après l'étape de chaque deal`,
      tone: "text-land-muted",
      box: "border-land-line bg-land-surface",
    },
    {
      label: "Écart",
      value: euros(hubspot - brief),
      detail: "Ce que HubSpot compte et que les calls ne confirment pas",
      tone: "text-amber-900",
      box: "border-amber-200 bg-amber-50",
    },
  ];
  const grid = "grid grid-cols-[minmax(0,1fr)_84px] items-center gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_100px_100px_100px] md:gap-4";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-4 ${c.box}`}>
            <div className={`text-[13px] ${c.box.includes("amber") ? "text-amber-900" : "text-land-muted"}`}>{c.label}</div>
            <div className={`mt-1 text-[26px] font-bold tabular-nums tracking-tight ${c.tone}`}>{c.value}</div>
            <div className={`mt-1 text-[12.5px] leading-snug ${c.box.includes("amber") ? "text-amber-900" : "text-land-muted"}`}>{c.detail}</div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-land-line bg-land-surface">
        <div className={`${grid} border-b border-land-line px-4 py-3 sm:px-5 ${CAPS}`}>
          <span>Commercial</span>
          <span className="hidden md:block">Deals en cours</span>
          <span className="hidden text-right md:block">HubSpot</span>
          <span className="text-right">Brief</span>
          <span className="hidden text-right md:block">Écart</span>
        </div>
        {FORECAST.map((f) => {
          const owner = rep(f.owner);
          return (
            <div key={f.owner} className={`${grid} border-b border-land-line px-4 py-3 text-[14px] last:border-0 sm:px-5`}>
              <span className="flex min-w-0 items-center gap-3">
                <Image src={owner.photo} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                <span className="truncate font-semibold text-land-ink">{owner.name}</span>
              </span>
              <span className="hidden text-[13px] text-land-muted md:block">
                {f.count} deal{f.count > 1 ? "s" : ""} · {euros(f.pipeline)}
              </span>
              <span className="hidden text-right tabular-nums text-land-muted md:block">{euros(f.hubspot)}</span>
              <span className="text-right font-bold tabular-nums text-land-ink">{euros(f.brief)}</span>
              <span className="hidden text-right font-semibold tabular-nums text-amber-800 md:block">{euros(f.hubspot - f.brief)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Démonstration automatique ───────────────────────────────────────────────
// Un curseur parcourt la page et clique tout seul (un onglet, puis l'autre)
// tant que le visiteur n'a pas pris la main. Il démarre quand l'aperçu est
// visible, s'arrête pour de bon dès que la vraie souris entre (ou au premier
// toucher), et n'existe pas en mouvement réduit. Le but : qu'on comprenne tout
// de suite que c'est cliquable. Repris tel quel de l'ancien aperçu Performance.
type DemoStep = { target: string; run: () => void };

function useDemo(enabled: boolean, rootRef: React.RefObject<HTMLDivElement | null>, steps: DemoStep[]) {
  const [cursor, setCursor] = useState<{ x: number; y: number; click: number } | null>(null);
  const [active, setActive] = useState(false);
  const [stopped, setStopped] = useState(false);
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  });

  // Visible à l'écran ? Mouvement réduit ?
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Seuil bas : sur le premier écran, seul le haut de l'aperçu est visible,
    // et c'est justement là (les onglets) que le curseur clique.
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting && e.intersectionRatio > 0.15), {
      threshold: [0, 0.15, 0.5],
    });
    io.observe(root);
    const stop = (e: PointerEvent) => {
      if (e.type === "pointerenter" && e.pointerType !== "mouse") return;
      setStopped(true);
    };
    root.addEventListener("pointerenter", stop);
    root.addEventListener("pointerdown", stop);
    return () => {
      io.disconnect();
      root.removeEventListener("pointerenter", stop);
      root.removeEventListener("pointerdown", stop);
    };
  }, [enabled, rootRef]);

  useEffect(() => {
    if (!enabled || !active || stopped) return;
    const root = rootRef.current;
    if (!root) return;
    let i = 0;
    let timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const play = () => {
      const step = stepsRef.current[i % stepsRef.current.length];
      const el = root.querySelector<HTMLElement>(`[data-demo="${step.target}"]`);
      const box = el?.getBoundingClientRect();
      if (!el || !box || box.width === 0) {
        later(play, 50);
        return;
      }
      i += 1;
      const r = root.getBoundingClientRect();
      setCursor((c) => ({ x: box.left - r.left + box.width / 2, y: box.top - r.top + box.height / 2, click: c?.click ?? 0 }));
      later(() => {
        setCursor((c) => (c ? { ...c, click: c.click + 1 } : c));
        step.run();
      }, 950);
      later(play, 3600);
    };
    later(play, 900);
    return () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
  }, [enabled, active, stopped, rootRef]);

  return { cursor: enabled && !stopped ? cursor : null, stopped };
}

function FakeCursor({ x, y, click }: { x: number; y: number; click: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-20 transition-transform duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
      style={{ transform: `translate(${x - 4}px, ${y - 3}px)` }}
    >
      <span key={click} className="land-click absolute -left-3 -top-3 h-8 w-8 rounded-full border-2 border-land-accent" />
      <svg width="22" height="24" viewBox="0 0 22 24" className="relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">
        <path d="M2 1.5 L2 19 L6.6 14.8 L9.6 21.6 L12.6 20.3 L9.7 13.6 L16 13.4 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── L'aperçu ────────────────────────────────────────────────────────────────

type View = "suivi" | "prevision";
type Sub = "reprendre" | "tous";

export function DealsBoard({ demo = false }: { demo?: boolean }) {
  const [view, setView] = useState<View>("suivi");
  const [sub, setSub] = useState<Sub>("reprendre");
  const rootRef = useRef<HTMLDivElement>(null);
  const { cursor, stopped } = useDemo(demo, rootRef, [
    { target: "sub-tous", run: () => setSub("tous") },
    { target: "view-prevision", run: () => setView("prevision") },
    {
      target: "view-suivi",
      run: () => {
        setView("suivi");
        setSub("reprendre");
      },
    },
  ]);

  const pill = (key: View, label: string) => (
    <button
      type="button"
      data-demo={`view-${key}`}
      aria-pressed={view === key}
      onClick={() => setView(key)}
      className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
        view === key ? "bg-land-surface text-land-ink shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]" : "text-land-muted hover:text-land-ink"
      }`}
    >
      {label}
    </button>
  );
  const tab = (key: Sub, label: string, count: number) => (
    <button
      type="button"
      role="tab"
      data-demo={`sub-${key}`}
      aria-selected={sub === key}
      onClick={() => setSub(key)}
      className={`-mb-px border-b-2 px-3.5 py-2.5 text-[14px] transition-colors ${
        sub === key ? "border-land-accent font-semibold text-land-accent" : "border-transparent text-land-muted hover:text-land-ink"
      }`}
    >
      {label} <span className="font-medium">· {count}</span>
    </button>
  );

  return (
    <div ref={rootRef} className="relative">
      {demo && (
        // Étiquette posée à cheval sur le bord haut : on la voit avant même
        // de lire la page.
        <div className="pointer-events-none absolute -top-4 left-1/2 z-10 -translate-x-1/2">
          <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-land-surface px-3.5 py-2 text-[12.5px] font-medium text-land-ink shadow-[var(--land-shadow)] ring-1 ring-land-line">
            <span className="relative grid h-2 w-2 place-items-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-land-accent/60" />
              <span className="h-2 w-2 rounded-full bg-land-accent" />
            </span>
            <MousePointerClick className="h-3.5 w-3.5 text-land-accent" aria-hidden />
            {/* Version courte sur téléphone : l'étiquette ne doit jamais
                déborder de l'écran. */}
            <span className="sm:hidden">{stopped ? `À vous${NB}: touchez un onglet` : "Démo interactive · touchez pour essayer"}</span>
            <span className="hidden sm:inline">{stopped ? `À vous${NB}: cliquez sur un onglet` : "Démo interactive · cliquez sur un onglet"}</span>
          </span>
        </div>
      )}
      {cursor && <FakeCursor {...cursor} />}
      <div className="overflow-hidden rounded-[22px] border border-land-line bg-land-bg shadow-[var(--land-shadow-lg)]">
        <div className="flex">
          {/* Barre latérale de l'app : mêmes entrées, même ordre. */}
          <AppSidebar active="suivi" note="3 deals à reprendre, 6 rendez-vous à venir dans l'équipe." />

          <div className="min-w-0 flex-1">
            {/* En-tête de la page : titre, puis Suivi / Prévision. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-land-line bg-land-surface px-4 py-3.5 sm:px-6">
              <div>
                <div className="text-[17px] font-semibold tracking-tight text-land-ink">Suivi des deals</div>
                <div className="text-[12px] text-land-muted">Les deals de vos commerciaux, et où votre intervention compte.</div>
              </div>
              <div className="inline-flex items-center rounded-full bg-land-sunken p-1" role="group" aria-label="Vue affichée">
                {pill("suivi", "Suivi")}
                {pill("prevision", "Prévision")}
              </div>
            </div>

            <div className="min-h-[460px] p-3 sm:p-5 lg:min-h-[600px]">
              {view === "suivi" ? (
                <>
                  <div role="tablist" aria-label="Vues du suivi" className="mb-4 flex flex-wrap gap-1 border-b border-land-line">
                    {tab("reprendre", "À reprendre", ALERTS.length)}
                    {tab("tous", "Tous les deals", DEALS.length)}
                  </div>
                  <div key={sub} className="land-swap" role="tabpanel">
                    {sub === "reprendre" ? <ToResume /> : <AllDeals />}
                  </div>
                </>
              ) : (
                <div className="land-swap">
                  <Forecast />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-land-line bg-land-surface px-5 py-2.5 text-[11.5px] text-land-faint">
          Exemple au format réel de Suivi des deals. Équipe, deals et montants fictifs.
        </div>
      </div>
    </div>
  );
}
