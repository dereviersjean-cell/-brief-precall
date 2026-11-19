"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CircleAlert, MessageCircleQuestion, MousePointerClick, Zap } from "lucide-react";
import { StateChip } from "@/app/mes-deals/deal-ui";
import type { DealState } from "@/lib/deal-progress";
import { BrandTile } from "./brands";
import { NB, rep } from "./team-data";
import { Ticker } from "./Ticker";

// « Suivi des deals », la page du manager — le « Manager Radar » du cadrage
// GTM. Mise en page reprise de la maquette d'Hubert (référence visuelle 02) :
// trois chiffres, puis à gauche la liste des deals par onglet (à reprendre,
// endormis, tous) et à droite la fiche du deal sélectionné — le problème,
// l'action recommandée, la question à poser au commercial. Libellés et ordre
// de priorité de l'app (SuiviView, `lib/deal-suivi.ts`) ; la vue « Prévision »
// (ForecastView) est au format réel.
// Un essai en radar animé (points sur fond bleu nuit, faisceau tournant) a
// été écarté par Jean le 19/11/2026 : « ça fait jeu vidéo ». Rester sobre :
// fond clair, une seule couleur d'accent, aucun effet qui tourne.
// Les deals portent le nom et le logo en couleur d'entreprises connues
// (demande de Jean, 19/11/2026 ; `BrandTile` dans brands.tsx). Les situations
// décrites sont inventées : le pied le dit en toutes lettres, pour qu'on ne
// lise pas un vrai deal en cours.
// Équipe, situations et montants fictifs ; les totaux se recoupent.

type Kind = "Dégradation" | "Engagement non tenu" | "Blocage";

const KIND_TONES: Record<Kind, string> = {
  Dégradation: "bg-rose-50 text-rose-700",
  "Engagement non tenu": "bg-rose-50 text-rose-700",
  Blocage: "bg-amber-50 text-amber-700",
};

type Deal = {
  name: string;
  owner: string;
  state: DealState;
  rank: number;
  stage: string;
  amount: number;
  last: string;
};

const DEALS: Deal[] = [
  { name: "Renault", owner: "thomas", state: "progres", rank: 2, stage: "Évaluation", amount: 40000, last: "2 oct." },
  { name: "Dassault Systèmes", owner: "thomas", state: "qualifier", rank: 1, stage: "Qualification", amount: 0, last: "2 oct." },
  { name: "Carrefour", owner: "karim", state: "recul", rank: 2, stage: "Évaluation", amount: 32000, last: "1er oct." },
  { name: "Schneider Electric", owner: "lea", state: "progres", rank: 2, stage: "Évaluation", amount: 22000, last: "30 sept." },
  { name: "Airbus", owner: "julie", state: "relancer", rank: 3, stage: "Proposition", amount: 58000, last: "22 sept." },
  { name: "Leroy Merlin", owner: "lea", state: "qualifier", rank: 2, stage: "Qualification", amount: 12000, last: "19 sept." },
  { name: "SNCF", owner: "thomas", state: "relancer", rank: 1, stage: "Qualification", amount: 0, last: "16 sept." },
  { name: "Orange", owner: "julie", state: "relancer", rank: 2, stage: "Évaluation", amount: 18000, last: "11 sept." },
];

const deal = (name: string) => DEALS.find((x) => x.name === name) ?? DEALS[0];

// Les questions sont celles qu'un manager pose à son commercial, dans le ton
// de l'app (`coachingQuestions`, lib/deal-coaching.ts) : tutoiement, question
// ouverte, jamais un reproche. Deux par deal, comme dans l'app — la première
// cherche la cause, la seconde ouvre la suite.
const ALERTS: { deal: string; kind: Kind; problem: string; action: string; questions: [string, string] }[] = [
  {
    deal: "Carrefour",
    kind: "Dégradation",
    problem: "Le prospect a cité un concurrent moins cher et repoussé sa décision au trimestre prochain.",
    action: "Reprendre avec Karim le chiffrage du retour sur investissement avant sa relance.",
    questions: [
      "Qu'est-ce qui a changé chez Carrefour depuis le dernier call pour que la décision glisse d'un trimestre ?",
      "Le concurrent est-il moins cher à périmètre égal ? Sur quoi peux-tu rechiffrer le retour sur investissement ?",
    ],
  },
  {
    deal: "Airbus",
    kind: "Engagement non tenu",
    problem: "La proposition promise pour le 26 septembre n'est pas partie.",
    action: "Faire partir la proposition aujourd'hui, avec une date de retour convenue.",
    questions: [
      "Qu'est-ce qui te manque pour envoyer la proposition : un chiffrage, une validation, une information du client ?",
      "Quelle nouvelle date peux-tu donner à Airbus aujourd'hui, et de quoi as-tu besoin pour la tenir ?",
    ],
  },
  {
    deal: "Leroy Merlin",
    kind: "Blocage",
    problem: "Deux rendez-vous, et le décideur n'est toujours pas identifié.",
    action: "Préparer avec Léa la question du circuit de décision pour le prochain échange.",
    questions: [
      "Qui valide le budget chez Leroy Merlin, et comment le faire venir au prochain call ?",
      "Veux-tu qu'on prépare ensemble la question du circuit de décision ?",
    ],
  },
];

const SLEEPING: { deal: string; idle: number }[] = [
  { deal: "Orange", idle: 21 },
  { deal: "SNCF", idle: 16 },
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
const meta = (d: Deal) => [`R${d.rank}`, d.stage, d.amount ? euros(d.amount) : null].filter(Boolean).join(" · ");
const CAPS = "text-[11px] font-semibold uppercase tracking-[0.08em] text-land-faint";

function DealLogo({ d, large = false }: { d: Deal; large?: boolean }) {
  return <BrandTile name={d.name} size={large ? 44 : 36} />;
}

function Stat({ value, format = "int", label, tone = "text-land-ink" }: { value: number; format?: "int" | "euros"; label: string; tone?: string }) {
  // Trois chiffres côte à côte, y compris sur téléphone : corps réduit sous `sm`.
  return (
    <div className="min-w-0 rounded-2xl border border-land-line bg-land-surface px-2.5 py-3 sm:px-4 sm:py-3.5">
      <div className={`whitespace-nowrap text-[16px] font-semibold tracking-[-0.02em] sm:text-[24px] ${tone}`}>
        <Ticker value={value} format={format} />
      </div>
      <div className="text-[11.5px] leading-snug text-land-muted sm:text-[13px]">{label}</div>
    </div>
  );
}

// ─── Suivi : la liste et la fiche ────────────────────────────────────────────

type Tab = "reprendre" | "endormis" | "tous";

const alertOf = (name: string) => ALERTS.find((a) => a.deal === name);
const sleepOf = (name: string) => SLEEPING.find((x) => x.deal === name);

const TAB_DEALS: Record<Tab, string[]> = {
  reprendre: ALERTS.map((a) => a.deal),
  endormis: SLEEPING.map((x) => x.deal),
  tous: DEALS.map((d) => d.name),
};

const TABS: { key: Tab; label: string }[] = [
  { key: "reprendre", label: "À reprendre" },
  { key: "endormis", label: "Endormis" },
  { key: "tous", label: "Tous les deals" },
];

// Ce que dit la fiche d'un deal qui n'appelle pas d'intervention.
const QUIET: Record<string, string> = {
  "Orange": "À relancer ou à clôturer. Il ne demande pas forcément votre intervention.",
  "SNCF": "À relancer ou à clôturer. Il ne demande pas forcément votre intervention.",
  "Renault": "R3 daté avec le directeur financier : aucune intervention nécessaire.",
  "Schneider Electric": "Deuxième rendez-vous tenu, critères de décision confirmés.",
  "Dassault Systèmes": "Premier rendez-vous tenu : la qualification commence.",
};

/** Le signal d'un deal dans la liste : son alerte, son sommeil, sinon son état. */
function Signal({ name }: { name: string }) {
  const alert = alertOf(name);
  const sleep = sleepOf(name);
  if (alert) return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${KIND_TONES[alert.kind]}`}>{alert.kind}</span>;
  if (sleep) return <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-semibold text-slate-600">{sleep.idle} j sans échange</span>;
  return <StateChip state={deal(name).state} />;
}

function DealList({ tab, onTab, selected, onSelect }: { tab: Tab; onTab: (t: Tab) => void; selected: string; onSelect: (name: string) => void }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-land-line bg-land-surface">
      <div role="tablist" aria-label="Deals affichés" className="flex gap-1 overflow-x-auto border-b border-land-line px-2 sm:px-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            data-demo={`tab-${t.key}`}
            aria-selected={tab === t.key}
            onClick={() => onTab(t.key)}
            className={`-mb-px shrink-0 border-b-2 px-2.5 py-3 text-[13.5px] transition-colors ${
              tab === t.key ? "border-land-accent font-semibold text-land-accent" : "border-transparent text-land-muted hover:text-land-ink"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums ${tab === t.key ? "bg-land-accent-soft" : "bg-land-sunken"}`}>
              {TAB_DEALS[t.key].length}
            </span>
          </button>
        ))}
      </div>
      <ul key={tab} className="land-swap p-1.5" role="tabpanel">
        {TAB_DEALS[tab].map((name) => {
          const d = deal(name);
          const on = selected === name;
          return (
            <li key={name}>
              <button
                type="button"
                data-demo={`row-${name}`}
                aria-pressed={on}
                onClick={() => onSelect(name)}
                className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                  on ? "bg-land-accent-soft ring-1 ring-inset ring-land-accent/35" : "hover:bg-land-sunken"
                }`}
              >
                <DealLogo d={d} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-land-ink">{d.name}</span>
                  <span className="block truncate text-[12.5px] text-land-muted">
                    {rep(d.owner).first} · {meta(d)}
                  </span>
                </span>
                {/* Sur téléphone le signal passe sous le nom : côte à côte, il
                    le tronquait (« Lumen Lo… »). */}
                <span className="w-full pl-[48px] sm:w-auto sm:pl-0">
                  <Signal name={name} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Block({ icon: Icon, tone, title, children }: { icon: typeof Zap; tone: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className={CAPS}>{title}</div>
        <div className="mt-0.5 text-[14px] leading-snug">{children}</div>
      </div>
    </div>
  );
}

/** La fiche du deal sélectionné. */
function DealCard({ name }: { name: string }) {
  const d = deal(name);
  const owner = rep(d.owner);
  const alert = alertOf(name);
  const sleep = sleepOf(name);
  return (
    <article key={name} className="land-swap min-w-0 rounded-2xl border border-land-line bg-land-surface p-4 shadow-[var(--land-shadow)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <DealLogo d={d} large />
          <div className="min-w-0">
            <div className="truncate text-[17px] font-semibold tracking-tight text-land-ink">{d.name}</div>
            <div className="text-[12.5px] text-land-muted">{meta(d)}</div>
          </div>
        </div>
        <Signal name={name} />
      </div>
      <div className="mt-3 flex items-center gap-2 border-b border-land-line pb-3.5 text-[13px] text-land-muted">
        <Image src={owner.photo} alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0 rounded-full object-cover" />
        <span>
          Suivi par <span className="font-medium text-land-ink">{owner.first}</span> · dernier échange le {d.last}
        </span>
      </div>
      {alert ? (
        <div className="mt-4 space-y-4">
          <Block icon={CircleAlert} tone="bg-rose-50 text-rose-700" title="Le problème">
            <span className="text-land-muted">{alert.problem}</span>
          </Block>
          <Block icon={Zap} tone="bg-land-accent-soft text-land-accent" title="Action recommandée">
            <span className="font-semibold text-land-ink">{alert.action}</span>
          </Block>
          <div className="rounded-xl bg-land-accent-soft px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-land-accent">
              <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden /> À demander à {owner.first}
            </div>
            <ul className="mt-1.5 space-y-1.5">
              {alert.questions.map((q) => (
                <li key={q} className="text-[14px] font-medium leading-snug text-land-ink">
                  «{NB}{q.replace(/ ([:?])/g, `${NB}$1`)}{NB}»
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[14px] leading-snug text-land-muted">
          {sleep && <span className="font-semibold text-land-ink">{sleep.idle} jours sans échange. </span>}
          {QUIET[name].replace(/ :/g, `${NB}:`)}
        </p>
      )}
    </article>
  );
}

function SuiviPanel({ tab, onTab, selected, onSelect }: { tab: Tab; onTab: (t: Tab) => void; selected: string; onSelect: (name: string) => void }) {
  const atStake = ALERTS.reduce((sum, a) => sum + deal(a.deal).amount, 0);
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat value={ALERTS.length} label="deals à reprendre" tone="text-rose-700" />
        <Stat value={SLEEPING.length} label="deals endormis" />
        <Stat value={atStake} format="euros" label="en jeu sur ces deals" />
      </div>
      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <DealList tab={tab} onTab={onTab} selected={selected} onSelect={onSelect} />
        <DealCard name={selected} />
      </div>
    </div>
  );
}

function Forecast() {
  const hubspot = FORECAST.reduce((s, f) => s + f.hubspot, 0);
  const brief = FORECAST.reduce((s, f) => s + f.brief, 0);
  const count = FORECAST.reduce((s, f) => s + f.count, 0);
  const cards: { label: string; value: number; detail: string; tone: string; box: string }[] = [
    {
      label: "Atterrissage prévu par Brief",
      value: SIGNED + brief,
      detail: `${euros(SIGNED)} déjà signés + ${euros(brief)} attendus sur ${count} deals`,
      tone: "text-land-ink",
      box: "border-land-line bg-land-surface",
    },
    {
      label: "Ce que dit HubSpot",
      value: SIGNED + hubspot,
      detail: `${euros(SIGNED)} signés + ${euros(hubspot)} d'après l'étape de chaque deal`,
      tone: "text-land-muted",
      box: "border-land-line bg-land-surface",
    },
    {
      label: "Écart",
      value: hubspot - brief,
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
            <div className={`mt-1 text-[26px] font-bold tracking-tight ${c.tone}`}>
              <Ticker value={c.value} format="euros" />
            </div>
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

const VIEWS: { key: View; label: string }[] = [
  { key: "suivi", label: "Suivi" },
  { key: "prevision", label: "Prévision" },
];

export function DealsBoard({ demo = false }: { demo?: boolean }) {
  const [view, setView] = useState<View>("suivi");
  const [tab, setTab] = useState<Tab>("reprendre");
  const [selected, setSelected] = useState(ALERTS[0].deal);
  // Changer d'onglet garde le deal ouvert s'il y figure, sinon ouvre le premier.
  const openTab = (t: Tab) => {
    setTab(t);
    setSelected((cur) => (TAB_DEALS[t].includes(cur) ? cur : TAB_DEALS[t][0]));
  };
  const rootRef = useRef<HTMLDivElement>(null);
  const { cursor, stopped } = useDemo(demo, rootRef, [
    { target: `row-${ALERTS[1].deal}`, run: () => setSelected(ALERTS[1].deal) },
    { target: `row-${ALERTS[2].deal}`, run: () => setSelected(ALERTS[2].deal) },
    { target: "tab-endormis", run: () => openTab("endormis") },
    { target: "view-prevision", run: () => setView("prevision") },
    {
      target: "view-suivi",
      run: () => {
        setView("suivi");
        setTab("reprendre");
        setSelected(ALERTS[0].deal);
      },
    },
  ]);

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
            <span className="sm:hidden">{stopped ? `À vous${NB}: touchez un deal` : "Démo interactive · touchez pour essayer"}</span>
            <span className="hidden sm:inline">{stopped ? `À vous${NB}: cliquez sur un deal ou un onglet` : "Démo interactive · cliquez sur un deal ou un onglet"}</span>
          </span>
        </div>
      )}
      {cursor && <FakeCursor {...cursor} />}
      <div className="overflow-hidden rounded-[26px] border border-land-line bg-land-bg shadow-[var(--land-shadow-lg)]">
        {/* En-tête : le titre de la page de l'app, puis les trois vues. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-land-line bg-land-surface px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-land-accent text-[14px] font-semibold text-white">B</span>
            <div>
              <div className="text-[17px] font-semibold tracking-tight text-land-ink">Suivi des deals</div>
              <div className="text-[12px] text-land-muted">Les deals de vos commerciaux, et où votre intervention compte.</div>
            </div>
          </div>
          <div className="inline-flex items-center rounded-full bg-land-sunken p-1" role="group" aria-label="Vue affichée">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                data-demo={`view-${v.key}`}
                aria-pressed={view === v.key}
                onClick={() => setView(v.key)}
                className={`h-8 rounded-full px-3 text-[13px] font-medium transition-colors sm:px-3.5 ${
                  view === v.key ? "bg-land-surface text-land-ink shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]" : "text-land-muted hover:text-land-ink"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[460px] p-3 sm:p-5 lg:min-h-[500px]">
          {view === "suivi" ? (
            <SuiviPanel tab={tab} onTab={openTab} selected={selected} onSelect={setSelected} />
          ) : (
            <div className="land-swap">
              <Forecast />
            </div>
          )}
        </div>
        <div className="border-t border-land-line bg-land-surface px-5 py-2.5 text-[11.5px] text-land-faint">
          Exemple illustratif d&apos;après Suivi des deals. Entreprises citées pour l&apos;exemple{NB}: équipe, situations et montants fictifs.
        </div>
      </div>
    </div>
  );
}
