import { CalendarDays, FileText, Lock, Mail, MessageSquareWarning, Mic, Radio, Sparkles, Target } from "lucide-react";
import { BRIEFS_ACCESS_DAILY_LIMIT, SALES_CONTACT } from "@/lib/sales-contact";

// Version gratuite (accès « briefs », inscription libre) : dire clairement ce
// qu'elle comprend — la préparation des rendez-vous — et tout ce que Brief
// fait d'autre, cadenassé (demande de Jean, 14/10/2026 : « mettre en avant
// qu'ils ont la version gratuite et accès à une mini partie »). Remplace le
// bandeau « Aller plus loin » en tête de la page Brief. `compact` : une ligne,
// au-dessus d'une liste de rendez-vous.

const LOCKED = [
  { icon: Mic, title: "Enregistrement et compte-rendu", text: "Brief rejoint vos visios et résume chaque échange." },
  { icon: Target, title: "Score de chaque rendez-vous", text: "Noté sur votre méthode de vente, point par point." },
  { icon: Mail, title: "Emails de suivi rédigés", text: "Prêts à relire et à envoyer après chaque call." },
  { icon: MessageSquareWarning, title: "Objections repérées", text: "Et la bonne réponse, tirée de votre playbook." },
  { icon: Radio, title: "Synchronisation CRM", text: "HubSpot et Pipedrive mis à jour sans saisie." },
  { icon: Sparkles, title: "Coaching de l'équipe", text: "Progression, entraînement et bilans hebdomadaires." },
];

export default function FreePlanPanel({ compact = false }: { compact?: boolean }) {
  const { firstName, email, bookingUrl } = SALES_CONTACT;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
        <p className="text-[13.5px] text-slate-600">
          <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-semibold text-amber-800">Version gratuite</span>
          {BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour — une petite partie de ce que fait Brief.
        </p>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13.5px] font-semibold text-slate-900 underline-offset-4 hover:underline"
        >
          Découvrir Brief complet →
        </a>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] bg-white ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-7">
        <div className="min-w-0">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-800">Version gratuite</span>
          <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.02em] text-slate-900">
            Vous utilisez une petite partie de Brief
          </h3>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-slate-500">
            Votre accès comprend la préparation de vos rendez-vous : {BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour. Brief complet
            accompagne aussi tout ce qui se passe pendant et après le rendez-vous.
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-700 ring-1 ring-slate-100">
          <FileText className="h-4 w-4 text-emerald-600" />
          <span>
            <span className="font-semibold text-slate-900">Inclus :</span> briefs de préparation
          </span>
        </div>
      </div>

      <ul className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
        {LOCKED.map((f) => (
          <li key={f.title} className="flex items-start gap-3 bg-white px-6 py-4 sm:px-7">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <f.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-800">
                {f.title}
                <Lock className="h-3 w-3 text-slate-400" aria-label="Non inclus" />
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{f.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-7">
        <p className="text-[13.5px] text-slate-500">
          {firstName}, de l&apos;équipe Brief, vous montre tout en 30 minutes, configuré pour votre équipe.
        </p>
        <div className="flex items-center gap-4">
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-slate-600 hover:text-slate-900"
          >
            <Mail className="h-4 w-4" /> Lui écrire
          </a>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-amber-400 px-5 text-[13.5px] font-semibold text-amber-950 transition hover:bg-amber-300"
          >
            <CalendarDays className="h-4 w-4" /> Découvrir Brief complet
          </a>
        </div>
      </div>
    </section>
  );
}
