import Image from "next/image";
import { ArrowRight, CalendarDays, FileText, Mic } from "lucide-react";
import { BRIEFS_ACCESS_DAILY_LIMIT } from "@/lib/sales-contact";

// Premier écran d'une inscription libre (accès « briefs », lib/modules.ts),
// avant les questions : dire ce qu'on vient d'ouvrir, ce que l'accès
// comprend, et qu'il existe plus loin — avant de demander quoi que ce soit.
// Même principe que le reste de l'onboarding : expliquer avant de demander.
// Refait le 14/10/2026 (« plus joyeux, plus moderne », Jean) : l'illustration
// de la fusée de la landing, un ton d'accueil, une seule action.
const POINTS = [
  {
    icon: CalendarDays,
    tile: "bg-gradient-to-br from-[#2A5CE0] to-[#6A4BE8] text-white",
    title: "Vos rendez-vous, repérés tout seuls",
    text: "Dans votre agenda Google ou Outlook — ou ajoutés à la main.",
  },
  {
    icon: FileText,
    tile: "bg-gradient-to-br from-emerald-400 to-teal-500 text-white",
    title: `${BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour offerts`,
    text: "L'entreprise, son actualité, les bonnes questions à poser.",
  },
  {
    icon: Mic,
    tile: "bg-gradient-to-br from-amber-300 to-orange-400 text-white",
    title: "Et pour aller plus loin",
    text: "L'enregistrement et l'analyse de vos rendez-vous, quand vous le voudrez.",
  },
];

export default function WelcomeStep({ firstName, onStart }: { firstName: string | null; onStart: () => void }) {
  return (
    <div className="w-full max-w-4xl">
      <div className="grid overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(42,92,224,0.06),0_24px_60px_-28px_rgba(42,92,224,0.45)] ring-1 ring-[color:var(--lavender-strong)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* La fusée de la landing : le compte vient de décoller. */}
        <div className="relative h-52 bg-[#1F3FB8] md:h-auto">
          <Image
            src="/landing/cta-scene.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover object-[50%_35%]"
          />
        </div>

        <div className="p-7 sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success-soft)] px-3 py-1 text-[12.5px] font-semibold text-emerald-700">
            <span aria-hidden>🎉</span> Compte créé
          </span>
          <h1 className="mt-4 text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] text-slate-900 sm:text-[38px]">
            C&apos;est parti{firstName ? `, ${firstName}` : ""} !
          </h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-slate-500">
            Avant chaque rendez-vous, Brief prépare tout à votre place. Deux minutes de lecture, et vous arrivez prêt.
          </p>

          <ul className="mt-7 space-y-4">
            {POINTS.map((p) => (
              <li key={p.title} className="flex items-start gap-3.5">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-[0_8px_18px_-10px_rgba(42,92,224,0.7)] ${p.tile}`}>
                  <p.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[15px] font-semibold leading-snug text-slate-900">{p.title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-500">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-slate-100 pt-6">
            <button
              onClick={onStart}
              autoFocus
              className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#2A5CE0] to-[#6A4BE8] px-6 text-[15px] font-semibold text-white shadow-[0_12px_28px_-12px_rgba(76,63,214,0.85)] transition hover:brightness-110"
            >
              Personnaliser mes briefs
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="text-[13.5px] text-slate-400">3 questions · moins d&apos;une minute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
