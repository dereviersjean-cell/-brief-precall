import { CalendarDays, FileText, Lock, Sparkles } from "lucide-react";
import { BRIEFS_ACCESS_DAILY_LIMIT } from "@/lib/sales-contact";

// Premier écran d'une inscription libre (accès « briefs », lib/modules.ts),
// avant les questions : dire ce qu'on vient d'ouvrir, ce que l'accès
// comprend, et qu'il existe plus loin — avant de demander quoi que ce soit.
// Même principe que le reste de l'onboarding : expliquer avant de demander.
export default function WelcomeStep({ firstName, onStart }: { firstName: string | null; onStart: () => void }) {
  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 sm:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--lavender)] px-3 py-1 text-xs font-semibold text-[color:var(--violet)]">
          <Sparkles className="h-3.5 w-3.5" />
          Bienvenue
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {firstName ? `Bienvenue sur Brief, ${firstName}` : "Bienvenue sur Brief"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Avant chaque rendez-vous, Brief prépare un dossier sur votre prospect : son entreprise, son actualité, ses
          enjeux probables et les questions à lui poser. Vous arrivez préparé en deux minutes de lecture.
        </p>

        <ul className="mt-6 space-y-3">
          <li className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--lavender)] text-[color:var(--violet)]">
              <CalendarDays className="h-4 w-4" />
            </span>
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Vos rendez-vous repérés tout seuls</span> dans votre agenda
              Google ou Outlook, ou ajoutés à la main.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--lavender)] text-[color:var(--violet)]">
              <FileText className="h-4 w-4" />
            </span>
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">{BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour</span>, inclus dans
              votre accès.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
              <Lock className="h-4 w-4" />
            </span>
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">À débloquer ensuite</span> : enregistrement et analyse de vos
              rendez-vous, suivi de votre performance.
            </p>
          </li>
        </ul>

        <p className="mt-6 text-sm text-slate-500">Trois questions pour personnaliser vos briefs, et c&apos;est parti.</p>

        <button
          onClick={onStart}
          autoFocus
          className="mt-4 inline-flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:brightness-110 transition-colors"
        >
          Commencer
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
