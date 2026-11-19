"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Check, Clock, Users, Play } from "lucide-react";
import { ValdorLogo } from "@/app/components/landing/brands";
import { StateChip } from "@/app/mes-deals/deal-ui";

// La page d'un meeting telle que /feedback/[id] la restitue depuis le
// 14/11/2026 (MeetingOverviewView) : l'enregistrement et « qui a parlé », la
// synthèse, puis les trois questions d'un commercial qui sort d'un
// rendez-vous —
//   1. qu'est-ce que ce rendez-vous a changé dans le deal ?
//   2. qu'est-ce qu'il faut faire maintenant ?
//   3. qu'est-ce qui aurait pu être mieux exécuté ?
// Plus de note sur 5 ni de grille pondérée (retirées le 05/11/2026) : le
// coaching tient en deux points bien exécutés et deux points à travailler,
// chacun avec la phrase à dire la prochaine fois.
// Sur la page réelle les trois blocs se suivent ; ici ils sont en onglets pour
// que l'objet tienne dans l'écran. Les trois panneaux sont empilés dans la
// même cellule de grille : la hauteur ne change pas d'un onglet à l'autre
// (Journey mesure l'objet une fois pour le mettre à l'échelle).

const NB = "\u00a0";
const nb = (s: string) => s.replace(/ ([:;?!»%])/g, `${NB}$1`).replace(/« /g, `«${NB}`);

type Tab = 0 | 1 | 2;

// `short` : libellé de l'onglet sur téléphone, où le long serait tronqué.
const QUESTIONS: { tab: string; short: string; full: string }[] = [
  { tab: "Ce que ça change", short: "Impact", full: "Qu'est-ce que ce rendez-vous a changé dans le deal ?" },
  { tab: "À faire", short: "À faire", full: "Qu'est-ce qu'il faut faire maintenant ?" },
  { tab: "À mieux exécuter", short: "Coaching", full: "Qu'est-ce qui aurait pu être mieux exécuté ?" },
];

// Étiquettes de l'impact sur le deal (Nouveau, Recul, Concurrent, Inchangé,
// Vigilance), aux couleurs de l'app.
const IMPACT_TONES = {
  Nouveau: "bg-emerald-50 text-emerald-700",
  Vigilance: "bg-amber-50 text-amber-700",
} as const;
const IMPACT: { tag: keyof typeof IMPACT_TONES; text: string }[] = [
  { tag: "Nouveau", text: "Le directeur financier, Hugo Ravel, a rejoint l'échange : il entre dans la décision." },
  { tag: "Nouveau", text: "Budget évoqué : 40 000 € par an, à confirmer par écrit." },
  { tag: "Vigilance", text: "Claire craint la charge de déploiement pour son équipe planning." },
];

const OURS = ["Envoyer le récapitulatif du R2 · aujourd'hui", "Envoyer l'exemple de déploiement de la Cartonnerie du Val · avant le 7 oct."];
const THEIRS = ["Hugo Ravel transmet le circuit de validation du budget · avant le 9 oct."];
const NEXT_QUESTIONS = ["Qui signe, et selon quel circuit de validation ?", "Quelle échéance pour démarrer avant l'ouverture de la ligne ?"];

// Playbook client : ce que le deal sait après ce rendez-vous.
const PLAYBOOK_TONES = {
  Validé: "bg-emerald-50 text-emerald-700",
  Partiel: "bg-amber-50 text-amber-700",
  Manquant: "bg-rose-50 text-rose-700",
  "Déjà acquis": "bg-slate-100 text-slate-600",
} as const;
const PLAYBOOK: [string, keyof typeof PLAYBOOK_TONES][] = [
  ["Douleur", "Déjà acquis"],
  ["Critères de décision", "Validé"],
  ["Budget", "Partiel"],
  ["Process de décision", "Manquant"],
];

const SPEAKERS: { name: string; share: number }[] = [
  { name: "Thomas Lefèvre (vous)", share: 41 },
  { name: "Claire Mercier", share: 38 },
  { name: "Hugo Ravel, DAF", share: 21 },
];

const CAPS = "text-[11px] font-semibold uppercase tracking-[0.08em]";

function Panel({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    // Grand écran : panneaux empilés (hauteur stable pour Journey). En dessous,
    // l'objet suit son texte sans mise à l'échelle : le panneau inactif est
    // retiré, sinon il laisse un grand vide sous les onglets courts.
    <div className={`[grid-area:1/1] ${on ? "land-swap" : "hidden lg:invisible lg:block"}`} aria-hidden={!on} inert={!on}>
      {children}
    </div>
  );
}

export function AnalysisObject() {
  const [tab, setTab] = useState<Tab>(0);

  return (
    <div className="overflow-hidden rounded-[20px] border border-land-line bg-land-surface shadow-[var(--land-shadow-lg)]">
      <div className="flex items-start justify-between gap-4 border-b border-land-line px-6 py-4 sm:px-7">
        <div className="flex min-w-0 items-start gap-3">
          <ValdorLogo size={40} className="mt-0.5" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[17px] font-semibold tracking-tight text-land-ink">Présentation Valdor Emballages</span>
              <span className="rounded-full bg-land-accent-soft px-2 py-0.5 text-[11px] font-semibold text-land-accent">R2</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-land-muted">
              <span className="tabular-nums">Jeu. 2{NB}oct. · 14:30</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden /> <span className="tabular-nums">47{NB}min</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden /> 3 participants
              </span>
            </div>
          </div>
        </div>
      </div>

      <CallRecording />

      <div className="border-b border-land-line px-6 py-3.5 sm:px-7">
        <div className={`${CAPS} text-land-faint`}>Synthèse</div>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-land-ink">
          {nb(
            "Démonstration calée sur les besoins du R1. Claire valide l'intérêt et fait entrer le directeur financier dans la décision. Reste une crainte : la charge de déploiement pour son équipe.",
          )}
        </p>
      </div>

      {/* Les trois questions */}
      <div className="px-6 pt-4 sm:px-7">
        <div role="tablist" aria-label="Les trois questions" className="flex rounded-full bg-land-sunken p-1">
          {QUESTIONS.map((qn, i) => (
            <button
              key={qn.tab}
              type="button"
              role="tab"
              aria-selected={tab === i}
              aria-label={qn.tab}
              onClick={() => setTab(i as Tab)}
              className={`h-8 min-w-0 flex-1 truncate rounded-full px-2 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-200 ${
                tab === i ? "bg-land-surface text-land-ink shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]" : "text-land-muted hover:text-land-ink"
              }`}
            >
              <span className="tabular-nums text-land-accent">{i + 1}</span> <span className="sm:hidden">{qn.short}</span>
              <span className="hidden sm:inline">{qn.tab}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[14.5px] font-semibold leading-snug text-land-ink" aria-live="polite">
          {nb(QUESTIONS[tab].full)}
        </p>
      </div>

      <div className="grid px-6 pb-5 pt-3 sm:px-7">
        <Panel on={tab === 0}>
          <div className={`${CAPS} text-land-faint`}>Impact sur le deal</div>
          <ul className="mt-2 space-y-2">
            {IMPACT.map((row) => (
              <li key={row.text} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-land-ink">
                <span className={`mt-px shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${IMPACT_TONES[row.tag]}`}>{row.tag}</span>
                <span>{nb(row.text)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-land-bg px-3.5 py-2.5 text-[13px] text-land-muted">
            État du deal
            <StateChip state="qualifier" />
            <ArrowRight className="h-3.5 w-3.5 text-land-faint" aria-hidden />
            <StateChip state="progres" />
          </div>
        </Panel>

        <Panel on={tab === 1}>
          <div className={`${CAPS} text-land-faint`}>Engagements pris pendant ce rendez-vous</div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["À faire de notre côté", OURS],
                ["Attendu du prospect", THEIRS],
              ] as const
            ).map(([title, items]) => (
              <div key={title}>
                <div className="text-[13px] font-semibold text-land-ink">{title}</div>
                <ul className="mt-1 space-y-1.5">
                  {items.map((t) => (
                    <li key={t} className="flex gap-2 text-[13px] leading-snug text-land-muted">
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-land-line" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-land-accent-soft px-3.5 py-2.5">
            <div className={`${CAPS} text-land-accent`}>À obtenir au R3</div>
            {NEXT_QUESTIONS.map((t) => (
              <p key={t} className="mt-0.5 text-[13.5px] font-medium leading-snug text-land-ink">
                {nb(t)}
              </p>
            ))}
          </div>
        </Panel>

        <Panel on={tab === 2}>
          <ul className="flex flex-wrap gap-1.5">
            {PLAYBOOK.map(([label, status]) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-land-line py-0.5 pl-2.5 pr-0.5 text-[12px] text-land-ink">
                {label}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLAYBOOK_TONES[status]}`}>{status}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className={`${CAPS} text-emerald-700`}>Bien exécuté</div>
              <ul className="mt-1.5 space-y-1.5">
                {["Démonstration construite sur les besoins exprimés au R1.", "R3 daté avant de raccrocher, avec le directeur financier."].map((t) => (
                  <li key={t} className="flex gap-2 text-[13px] leading-snug text-land-ink">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className={`${CAPS} text-land-faint`}>À travailler</div>
              <p className="mt-1.5 text-[13px] leading-snug text-land-ink">
                Objection sur la charge de l&apos;équipe (21:04){NB}: rassurée sur le support, jamais chiffrée.
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-land-accent-soft px-3.5 py-2.5">
            <div className={`${CAPS} text-land-accent`}>À dire la prochaine fois</div>
            <p className="mt-0.5 text-[13.5px] font-medium leading-snug text-land-ink">
              «{NB}Deux heures de paramétrage, puis rien. La Cartonnerie du Val a été déployée en dix jours, sans ressource
              interne.{NB}»
            </p>
          </div>
        </Panel>
      </div>

      <div className="border-t border-land-line px-6 py-3 text-[12px] text-land-faint sm:px-7">
        Exemple au format réel de la page d&apos;un rendez-vous. Call, deal et personnes fictifs.
      </div>
    </div>
  );
}

// L'enregistrement du call, tel que le lecteur de /feedback/[id] le montre :
// la visio captée par le bot, arrêtée sur le moment que l'analyse commente
// (l'objection de Claire à 21:04, partiellement traitée). Images générées par
// IA (Higgsfield, 12/10/2026) : participants fictifs, comme le reste de
// l'exemple.
// Temps de parole repris de SPEAKERS : la vignette dit qui a parlé, et
// combien (la frise détaillée par intervenant a été retirée pour que l'objet
// tienne dans l'écran une fois la visio ajoutée).
const share = (name: string) => SPEAKERS.find((sp) => sp.name.startsWith(name))?.share ?? 0;
const CALL_TILES = [
  { name: "Claire Mercier", src: "/landing/people/call-claire.jpg", speaking: true, share: share("Claire") },
  { name: "Thomas Lefèvre (vous)", src: "/landing/people/call-thomas.jpg", speaking: false, share: share("Thomas") },
  { name: "Hugo Ravel, DAF", src: "/landing/people/call-hugo.jpg", speaking: false, share: share("Hugo") },
];
const CALL_MARKERS = [
  { at: 18, label: "Besoin reformulé", tone: "bg-land-accent" },
  { at: 44.8, label: "Objection : charge de déploiement", tone: "bg-land-coral" },
  { at: 91, label: "Prochaine étape", tone: "bg-land-accent" },
];

function CallRecording() {
  return (
    <div className="border-b border-land-line px-6 py-4 sm:px-7">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-land-faint">Enregistrement</div>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-land-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-land-coral" aria-hidden />
          Enregistré par le bot Brief<span className="hidden sm:inline"> · participants informés</span>
        </span>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl bg-[oklch(0.18_0.015_266)] p-1.5">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] grid-rows-2 gap-1.5">
          {CALL_TILES.map((t, i) => (
            <div
              key={t.name}
              className={`relative overflow-hidden rounded-xl bg-black/40 ${
                i === 0 ? "row-span-2 aspect-[16/10] sm:aspect-auto" : "aspect-video"
              }`}
            >
              <Image
                src={t.src}
                alt=""
                fill
                sizes={i === 0 ? "(min-width: 1024px) 380px, 66vw" : "(min-width: 1024px) 190px, 33vw"}
                className="object-cover"
              />
              {/* Intervenant qui parle : contour au-dessus de l'image. */}
              {t.speaking && <span aria-hidden className="absolute inset-0 rounded-xl ring-2 ring-inset ring-land-coral" />}
              <span
                className={`absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate rounded-md bg-black/55 px-1.5 py-0.5 font-medium text-white backdrop-blur-sm ${
                  i === 0 ? "text-[11.5px]" : "text-[10.5px]"
                }`}
              >
                {t.name} · <span className="tabular-nums">{t.share}{NB}%</span>
              </span>
            </div>
          ))}
        </div>
        {/* Barre de lecture : position à 21:04 sur 47 min, repères posés par
            l'analyse. */}
        <div className="flex items-center gap-3 px-1.5 pb-1 pt-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[oklch(0.18_0.015_266)]">
            <Play className="h-3.5 w-3.5 translate-x-[1px] fill-current" aria-hidden />
          </span>
          <div className="relative h-1 flex-1 rounded-full bg-white/20">
            <span className="absolute inset-y-0 left-0 rounded-full bg-white/80" style={{ width: "44.8%" }} />
            {CALL_MARKERS.map((m) => (
              <span
                key={m.label}
                title={m.label}
                className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[oklch(0.18_0.015_266)] ${m.tone}`}
                style={{ left: `${m.at}%` }}
              />
            ))}
          </div>
          <span className="shrink-0 text-[11.5px] tabular-nums text-white/75">21:04 / 47:00</span>
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-land-muted">
        <span className="h-2 w-2 rounded-full bg-land-coral" aria-hidden />
        21:04 · Objection de Claire sur la charge de déploiement, partiellement traitée
      </p>
    </div>
  );
}
