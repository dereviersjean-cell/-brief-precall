"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Meeting, Brief, Contact, TalkingPoint, NewsItem } from "@/lib/types";
import type { CallHistoryItem } from "@/lib/db";
import { Target, MapPin, Clock, History, Building2, Mail, ExternalLink } from "lucide-react";
import { StatusChip } from "@/app/components/ui/ui-bits";
import CompanyLogo from "@/app/components/CompanyLogo";
import TalkToSales from "@/app/components/TalkToSales";
import { companyDomainFromEmail } from "@/lib/company-domain";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Petite étiquette en capitales, comme sur le site : « accent » pour les
// encadrés à dire en rendez-vous, neutre pour les sections.
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em]";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className={`${LABEL} text-slate-500`}>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TalkingPointItem({ point, color }: { point: TalkingPoint; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color}`} />
      <div className="min-w-0">
        <p className="text-[14px] font-semibold leading-snug text-slate-900">{point.title}</p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-600">{point.detail}</p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// Calé sur une mesure réelle (~54s pour un brief avec recherche web sur une
// entreprise déjà bien documentée, 03/09/2026 — voir le commentaire de
// maxDuration dans /api/generate-brief) plutôt que sur un minutage arbitraire.
// La recherche web est de loin la phase la plus longue, et sa fin n'est pas
// observable depuis l'API (un seul appel serveur qui résout tools + réponse
// d'un coup) : plutôt que de prétendre à une granularité qu'on n'a pas, cette
// étape reste active jusqu'à la fin réelle, et la barre progresse en continu
// sur une courbe qui ralentit sans jamais se figer — un délai de 90s sur une
// entreprise peu documentée reste visiblement "en cours", pas "bloqué".
const STEP_2_AT_S = 3;
const STEP_3_AT_S = 12;
// Choisi pour que la barre atteigne ~80% vers 30s (la durée typique
// observée) tout en continuant, très lentement, au-delà — jamais un plateau
// figé même largement passé cette durée.
const PROGRESS_TAU_S = 18;
const PROGRESS_CAP = 96;
const LONG_WAIT_HINT_AT_S = 20;

// Beaucoup d'URL de photo renvoyées par l'annuaire sont des liens LinkedIn
// SIGNÉS, qui répondent 400 hors de leur site (vérifié le 04/09/2026, y
// compris avec des en-têtes de navigateur). On tente donc l'affichage, et on
// retombe sur les initiales dès que le chargement échoue — jamais d'image
// cassée, et rien à maintenir quand un lien expire.
function ContactAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  if (photoUrl && !failed) {
    // Avatar externe de taille fixe, sur des hôtes variables (LinkedIn, S3) :
    // next/image imposerait de déclarer chaque domaine sans rien apporter ici,
    // et son optimisation n'a pas de sens sur une vignette de 36 px.
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={photoUrl}
        alt={name}
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full bg-[color:var(--lavender)] object-cover"
      />
    );
  }

  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--lavender)] text-[12px] font-semibold text-[color:var(--violet)]">
      {initials}
    </div>
  );
}

// Fiche contact. La hiérarchie suit ce qu'un commercial cherche dans les
// deux minutes avant son appel : à qui il parle, si cette personne peut
// décider, puis le contexte, puis les moyens de la joindre. La pastille de
// séniorité est isolée parce que c'est l'information la plus actionnable —
// elle était auparavant noyée en milieu de phrase, invisible.
function ContactCard({ contact, notFound }: { contact: Contact; notFound: boolean }) {
  const company = contact.company;
  const companySubtitle = [
    company?.industry,
    company?.employees ? `${company.employees} personnes` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Les fiches enregistrées AVANT la décomposition ne portent que `notes` :
  // on les affiche telles quelles plutôt que d'exiger une reprise de données.
  const hasStructuredFacts = !!(contact.badge || contact.city || contact.tenure || contact.previousRole);

  return (
    <div>
      <div className="flex items-start gap-3">
        <ContactAvatar name={contact.name} photoUrl={contact.photoUrl} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug text-slate-900">{contact.name}</p>
          {contact.title && <p className="text-[12.5px] leading-snug text-slate-500">{contact.title}</p>}
        </div>
      </div>

      {contact.badge && (
        <div className="mt-2.5">
          <StatusChip tone={contact.badge.tone}>
            <Target className="w-3 h-3" />
            {contact.badge.label}
          </StatusChip>
        </div>
      )}

      {hasStructuredFacts ? (
        <div className="mt-3 space-y-1.5">
          {contact.city && (
            <div className="flex items-center gap-2 text-[12.5px] text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{contact.city}</span>
            </div>
          )}
          {contact.tenure && (
            <div className="flex items-center gap-2 text-[12.5px] text-slate-500">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{contact.tenure}</span>
            </div>
          )}
          {contact.previousRole && (
            <div className="flex items-start gap-2 text-[12.5px] text-slate-500">
              <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="leading-snug">Auparavant {contact.previousRole}</span>
            </div>
          )}
        </div>
      ) : (
        contact.notes && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] leading-relaxed text-slate-600">
            {contact.notes}
          </p>
        )
      )}

      {/* L'employeur tel que l'annuaire le connaît : sa graphie fait autorité
          sur celle saisie au moment du rendez-vous (« BE WTR » vs « Bewtr »),
          et son logo est hébergé chez le fournisseur donc réellement
          affichable — contrairement aux photos de profil. */}
      {company?.name && (
        <div className="mt-3 flex items-center gap-2.5 border-t border-border pt-3">
          {company.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-8 w-8 shrink-0 rounded-lg border border-border bg-white object-contain p-0.5"
            />
          ) : (
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100">
              <Building2 className="h-4 w-4 text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-slate-900">{company.name}</p>
            {companySubtitle && <p className="truncate text-[12px] text-slate-500">{companySubtitle}</p>}
          </div>
        </div>
      )}

      {(contact.email || contact.linkedin || contact.alternateEmail) && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 text-[12.5px] text-slate-600 hover:text-[color:var(--violet)] transition-colors group"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-[color:var(--violet)] transition-colors" />
              <span className="truncate">{contact.email}</span>
            </a>
          )}
          {/* L'annuaire connaît parfois une AUTRE adresse (homonyme, ou
              autre entité du groupe : « scutum.fr » saisi, « scutum-na.com »
              rendu). On la montre sans remplacer celle saisie — au commercial
              de trancher, lui seul sait d'où vient la sienne. */}
          {contact.alternateEmail && (
            <a
              href={`mailto:${contact.alternateEmail}`}
              className="flex items-center gap-2 text-[12.5px] text-slate-500 hover:text-[color:var(--violet)] transition-colors group"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-[color:var(--violet)] transition-colors" />
              <span className="truncate">{contact.alternateEmail} (autre adresse connue)</span>
            </a>
          )}
          {contact.linkedin && (
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[12.5px] font-medium text-[color:var(--violet)] hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span>Voir le profil LinkedIn</span>
            </a>
          )}
        </div>
      )}

      {notFound && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
          Contact enregistré, mais aucune information publique trouvée. Vérifiez surtout le nom complet — un
          prénom seul ne suffit pas à identifier la personne.
        </p>
      )}
    </div>
  );
}

function GeneratingProgress({ company, isRegenerating = false }: { company: string; isRegenerating?: boolean }) {
  const [elapsedS, setElapsedS] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsedS((Date.now() - start) / 1000), 200);
    return () => clearInterval(id);
  }, []);

  const currentStep = elapsedS < STEP_2_AT_S ? 0 : elapsedS < STEP_3_AT_S ? 1 : 2;

  const steps = [
    {
      label: "Recherche des informations sur l'entreprise...",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      // La phase la plus longue de loin (recherche web réelle) — le libellé
      // le dit explicitement plutôt que de laisser croire à une progression
      // linéaire par étapes égales.
      label: "Recherche web et analyse approfondie...",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607zM12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5" />
        </svg>
      ),
    },
    {
      label: "Rédaction de votre brief...",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
    },
  ];

  // Courbe asymptotique (1 - e^-t/τ) : progresse vite au début, ralentit
  // ensuite, ne s'arrête jamais tout à fait — contrairement à des paliers
  // fixes qui restent bloqués à 90% pendant 40s+ sur une génération lente.
  const progressWidth = Math.min(PROGRESS_CAP, 100 * (1 - Math.exp(-elapsedS / PROGRESS_TAU_S)));

  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 sm:px-7 sm:py-16">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--lavender)]">
            <svg className="h-6 w-6 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-900">
            {isRegenerating ? "Régénération de votre brief" : "Génération de votre brief"}
          </h2>
          <p className="mt-1 text-[14px] text-slate-500">Analyse de {company} en cours...</p>
          {/* Honnête plutôt que rassurant à tort : au-delà d'un délai
              raisonnable, dire que ça peut prendre du temps évite de laisser
              croire à un blocage — voir le commentaire au-dessus sur pourquoi
              la durée varie autant (recherche web réelle, pas un minutage
              fixe). */}
          {elapsedS > LONG_WAIT_HINT_AT_S && (
            <p className="mt-2 text-[12.5px] text-slate-500">
              Peut prendre jusqu&apos;à une minute pour une entreprise peu documentée en ligne.
            </p>
          )}
        </div>

        <div className="mb-6 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[color:var(--primary)] transition-all duration-300 ease-out"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="space-y-2">
          {steps.map((step, i) => {
            const isCompleted = i < currentStep;
            const isActive = i === currentStep;

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors duration-500 ${
                  isActive ? "bg-[color:var(--lavender)]" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                    isCompleted
                      ? "bg-[color:var(--success-soft)] text-emerald-700"
                      : isActive
                      ? "bg-white text-[color:var(--violet)]"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>

                <span
                  className={`flex-1 text-[13.5px] transition-colors duration-500 ${
                    isCompleted
                      ? "text-slate-500"
                      : isActive
                      ? "text-slate-900 font-medium"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>

                {isActive && (
                  <div className="shrink-0 text-[color:var(--violet)]">
                    <Spinner />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const talkingPointColors = ["bg-[color:var(--violet)]"];
const painPointColors = ["bg-[color:var(--warning)]"];

interface ApiResponse {
  overview: string;
  accroche: string;
  pain_points: Array<{ title: string; detail: string }>;
  arguments: Array<{ title: string; detail: string }>;
  vocabulaire: string[];
  actualites?: NewsItem[];
  references?: Array<{ client_name: string; relevance: string; pitch: string }>;
  historique_relationnel?: string;
  contact?: Contact;
}

function adaptApiBrief(api: ApiResponse): Brief {
  return {
    companyOverview: api.overview,
    suggestedOpeningLine: api.accroche,
    painPoints: api.pain_points,
    talkingPoints: api.arguments,
    recentNews: [],
    objectives: [],
    keywords: api.vocabulaire,
    actualites: api.actualites,
    contact: api.contact,
    references: api.references,
    historiqueRelationnel: api.historique_relationnel,
  };
}

function formatNewsDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

const sentimentCls: Record<string, string> = {
  positif: "bg-[color:var(--success-soft)] text-emerald-700",
  neutre: "bg-slate-100 text-slate-600",
  négatif: "bg-[color:var(--danger-soft)] text-rose-700",
};

function callScoreCls(score: number) {
  return score >= 4
    ? "bg-[color:var(--success-soft)] text-emerald-700"
    : score >= 2.5
    ? "bg-[color:var(--warning-soft)] text-amber-700"
    : "bg-[color:var(--danger-soft)] text-rose-700";
}

function formatCallDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function BriefClient({
  meeting,
  autoGenerate = false,
  contactEmail: initialContactEmail = null,
  contactName: initialContactName = null,
  callHistory = [],
}: {
  meeting: Meeting;
  autoGenerate?: boolean;
  contactEmail?: string | null;
  contactName?: string | null;
  callHistory?: CallHistoryItem[];
}) {
  // État et non prop figée : renseigner un contact depuis le panneau
  // Contacts doit être pris en compte par une régénération lancée juste
  // après, sans recharger la page. Sinon le client renvoie `null` et la
  // fiche disparaît du brief régénéré (constaté le 04/09/2026).
  const [contactEmail, setContactEmail] = useState<string | null>(initialContactEmail);
  // Ce qu'on affiche en titre : le nom du rendez-vous quand on l'a, sinon le
  // nom d'entreprise comme avant. La génération, elle, continue de s'appuyer
  // sur meeting.company — c'est lui qui alimente Pappers et les actualités.
  const displayName = meeting.title?.trim() || meeting.company;

  const [pdfBusy, setPdfBusy] = useState<"share" | "export" | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Le PDF est rendu par le serveur (@react-pdf/renderer, même chaîne que les
  // devis) et relu depuis la base : le fichier partagé est donc exactement le
  // brief enregistré, pas l'état de l'écran.
  //
  // Il est préparé à l'AVANCE, au survol du bouton. Ce n'est pas une
  // optimisation de confort mais la condition pour que le partage fonctionne :
  // navigator.share() exige une activation utilisateur récente, et attendre un
  // aller-retour réseau à l'intérieur du gestionnaire de clic la consomme. La
  // première version faisait exactement ça — le navigateur rejetait l'appel et
  // il ne se passait visiblement rien.
  const pdfPromiseRef = useRef<Promise<File | null> | null>(null);
  const pdfFileRef = useRef<File | null>(null);

  const buildPdf = useCallback(async (): Promise<File | null> => {
    const res = await fetch(`/api/briefs/${encodeURIComponent(meeting.id)}/pdf`);
    if (!res.ok) {
      setPdfError(
        res.status === 404
          ? "Ce brief n'est pas encore enregistré — générez-le d'abord."
          : "Le PDF n'a pas pu être généré, réessayez."
      );
      return null;
    }
    const blob = await res.blob();
    return new File([blob], `Brief - ${displayName}.pdf`, { type: "application/pdf" });
  }, [meeting.id, displayName]);

  const warmPdf = useCallback(() => {
    if (pdfPromiseRef.current) return pdfPromiseRef.current;
    const promise = buildPdf()
      .then((file) => {
        pdfFileRef.current = file;
        return file;
      })
      .catch(() => {
        // Un échec ne doit pas rester en cache : le survol suivant réessaie.
        pdfPromiseRef.current = null;
        return null;
      });
    pdfPromiseRef.current = promise;
    return promise;
  }, [buildPdf]);

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    // Révoqué au tour suivant : révoquer immédiatement annulerait le
    // téléchargement dans certains navigateurs.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function handleExportPdf() {
    setPdfBusy("export");
    setPdfError(null);
    try {
      const file = await warmPdf();
      if (file) download(file);
    } finally {
      setPdfBusy(null);
    }
  }

  function handleShare() {
    setPdfError(null);
    const ready = pdfFileRef.current;

    // Chemin nominal : le fichier est déjà là (préparé au survol), donc
    // navigator.share est appelé sans await intermédiaire et l'activation du
    // clic est intacte. C'est le seul cas où un rejet AbortError signifie
    // vraiment « l'utilisateur a fermé la feuille de partage ».
    if (ready && navigator.canShare?.({ files: [ready] })) {
      navigator.share({ files: [ready], title: displayName }).catch((err: Error) => {
        if (err?.name !== "AbortError") download(ready);
      });
      return;
    }

    // Chemin dégradé : rien en cache (clic immédiat, ou appareil tactile sans
    // survol). On attend le fichier, ce qui consomme l'activation — un rejet
    // ne serait alors plus interprétable. On tente quand même le partage, et
    // au moindre échec on télécharge, plutôt que de laisser l'utilisateur
    // devant un bouton qui ne fait rien.
    setPdfBusy("share");
    warmPdf()
      .then(async (file) => {
        if (!file) return;
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: displayName });
          } catch {
            download(file);
          }
        } else {
          download(file);
        }
      })
      .finally(() => setPdfBusy(null));
  }

  const [brief, setBrief] = useState<Brief | null>(meeting.brief ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState(!!meeting.brief);
  // `quotaReached` : plafond quotidien de l'accès « briefs » (inscription
  // libre) — on propose alors de parler à Hubert plutôt que d'attendre.
  const [rateLimited, setRateLimited] = useState<{ message: string; retryAfterMs: number; quotaReached: boolean } | null>(null);

  // Renseigner / corriger le contact d'un brief déjà généré. L'adresse était
  // optionnelle à la création d'un RDV manuel et rien ne permettait de la
  // rattraper ensuite.
  const [editingContact, setEditingContact] = useState(false);
  const [contactInput, setContactInput] = useState("");
  // Le nom suffit à retrouver la personne quand on connaît l'entreprise —
  // c'est souvent tout ce dont dispose le commercial, et une adresse mal
  // devinée ne renvoie rien (cf. enrichContact dans lib/apollo.ts).
  const [contactNameInput, setContactNameInput] = useState("");
  // Modifiable : le nom d'entreprise du brief est celui saisi à la création
  // (« Bewtr »), pas forcément celui sous lequel l'annuaire connaît la
  // société (« BE WTR ») — et cet écart fait échouer la recherche sans rien
  // dire. Le rendre visible et corrigeable évite de laisser l'utilisateur
  // deviner.
  const [contactCompanyInput, setContactCompanyInput] = useState(meeting.company);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  // false = l'adresse a été enregistrée mais Apollo n'a rien trouvé (ou n'est
  // pas configuré) : on le dit, plutôt que de laisser croire à un bug quand
  // la fiche n'affiche que l'email.
  const [contactEnriched, setContactEnriched] = useState<boolean | null>(null);

  async function saveContact() {
    const email = contactInput.trim();
    const name = contactNameInput.trim();
    if ((!email && !name) || contactSaving) return;
    setContactSaving(true);
    setContactError(null);
    try {
      const res = await fetch(`/api/briefs/${encodeURIComponent(meeting.id)}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: email || undefined,
          contactName: name || undefined,
          companyName: contactCompanyInput.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setContactError((data as { error?: string }).error ?? "Erreur lors de l'enregistrement.");
        return;
      }
      const { contact, enriched } = data as { contact: Contact; enriched: boolean };
      setBrief((prev) => (prev ? { ...prev, contact } : prev));
      // Indispensable : sans ça, une régénération lancée juste après
      // repartirait sans contact et effacerait la fiche qu'on vient d'ajouter.
      // On retient l'adresse RENVOYÉE (Apollo corrige parfois celle saisie),
      // pas celle tapée.
      setContactEmail(contact.email ?? email ?? null);
      setContactEnriched(enriched);
      setEditingContact(false);
    } catch {
      setContactError("Impossible de contacter le serveur.");
    } finally {
      setContactSaving(false);
    }
  }

  // Partage sur appareil tactile : préparer le PDF sans attendre le tap.
  //
  // `navigator.share()` exige une activation utilisateur non consommée (bug
  // #30). Sur desktop le survol prépare le fichier à l'avance, donc le clic
  // appelle share() sans attente. Sur iPhone il n'y a pas de survol : le tap
  // tombait dans le chemin dégradé, l'await consommait l'activation, Safari
  // rejetait, et « Partager » se comportait comme « Exporter PDF » — sur la
  // plateforme où la feuille de partage est justement la plus utile.
  //
  // `pointerdown` ne suffit pas : il ne précède le clic que de ~200 ms, quand
  // le rendu du PDF en demande une à deux secondes. On le prépare donc dès
  // l'affichage du brief, et UNIQUEMENT là où rien d'autre ne le fera —
  // `(hover: none)`. Sur desktop, rien ne change et rien n'est dépensé.
  useEffect(() => {
    if (!brief) return;
    if (!window.matchMedia?.("(hover: none)").matches) return;
    // Léger différé : la page a mieux à faire de sa bande passante au premier
    // rendu que de préparer un fichier dont on n'a pas encore besoin.
    const id = window.setTimeout(() => void warmPdf(), 1200);
    return () => window.clearTimeout(id);
  }, [brief, warmPdf]);

  const generateBrief = useCallback(async (force = false) => {
    setIsGenerating(true);
    setError(null);
    setRateLimited(null);
    try {
      const res = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: meeting.company,
          meetingTitle: meeting.title ?? null,
          calendarEventId: meeting.id,
          contactEmail: contactEmail ?? null,
          // Sans le nom, une adresse absente de l'annuaire ne donne aucune
          // fiche : c'est le critère qui rattrape ce cas.
          contactName: initialContactName ?? null,
          // Only used server-side to enrich the pre-call notification email
          // (sous-étape B) — not used by generateBrief itself.
          meetingStartsAt: meeting.date,
          force,
        }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setRateLimited({
          message: data.error ?? "Limite atteinte.",
          retryAfterMs: data.retryAfterMs ?? 0,
          quotaReached: data.quotaReached === true,
        });
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }
      setBrief(adaptApiBrief(data as ApiResponse));
      setIsAiGenerated(true);
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setIsGenerating(false);
    }
  }, [meeting.company, meeting.title, meeting.id, meeting.date, contactEmail, initialContactName]);

  useEffect(() => {
    if (autoGenerate && !meeting.brief) {
      generateBrief();
    }
  }, [autoGenerate, generateBrief, meeting.brief]);

  const badge = isGenerating
    ? { label: "Génération...", bg: "bg-[color:var(--lavender)]", fg: "text-[color:var(--violet)]", dot: "bg-[color:var(--violet)] animate-pulse" }
    : isAiGenerated
    ? { label: "Brief IA", bg: "bg-[color:var(--lavender)]", fg: "text-[color:var(--violet)]", dot: "bg-[color:var(--violet)]" }
    : brief
    ? { label: "Données mockées", bg: "bg-[color:var(--warning-soft)]", fg: "text-amber-700", dot: "bg-[color:var(--warning)]" }
    : { label: "Aucun brief", bg: "bg-slate-100", fg: "text-slate-600", dot: "bg-slate-400" };

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      {/* `top-14` et non `top-0` : la TopBar du layout est elle-même
          `sticky top-0 z-10`. Deux barres collantes au même décalage et au même
          z-index, c'est la seconde qui recouvre la première dès le premier
          pixel de défilement — le fil d'Ariane, la cloche et, sur mobile, le
          bouton du menu disparaissaient dessous. C'est exactement la règle du
          bug #26, que cette barre-ci n'avait jamais appliquée. */}
      <div className="sticky top-14 z-[9] bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* `min-w-0` + `truncate` : sur 390 px les deux boutons prennent la
              moitié de la barre, le fil d'Ariane doit pouvoir se couper plutôt
              que les pousser hors de l'écran. Le titre reste lisible en entier
              juste en dessous, dans le corps de la page. */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/brief"
              className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Brief
            </Link>
            <span className="text-slate-300">/</span>
            <span className="truncate text-[13px] font-medium text-slate-900">{displayName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShare}
              onMouseEnter={warmPdf}
              onFocus={warmPdf}
              onPointerDown={warmPdf}
              disabled={pdfBusy !== null}
              className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {pdfBusy === "share" ? "Préparation…" : "Partager"}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={pdfBusy !== null}
              className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {pdfBusy === "export" ? "Préparation…" : "Exporter PDF"}
            </button>
          </div>
        </div>
        {pdfError && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2">
            <p className="text-[13px] text-rose-700">{pdfError}</p>
          </div>
        )}
      </div>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Le brief tient sur une seule feuille, comme sur le site : en-tête
            (statut, date), titre, accroche, puis le corps en deux colonnes. */}
        <div className="overflow-hidden rounded-[20px] border border-border bg-white">
          {/* Meeting header */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-3.5 sm:px-7">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${badge.bg} ${badge.fg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </div>
            {/* La date et l'heure du rendez-vous, et rien d'autre : la
                durée était toujours 60 min par défaut et le secteur un
                tiret. Vide si la date est inconnue (brief enregistré
                avant la migration 013) — mieux que la fausse date que
                cette ligne affichait, celle du chargement de la page. */}
            {meeting.date && (
              <p className="text-[13px] tabular-nums text-slate-500">{formatDateTime(meeting.date)}</p>
            )}
          </div>

          <div className="px-5 pt-6 sm:px-7">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Le logo de l'entreprise plutôt que l'initiale du titre du
                  rendez-vous — qui donnait un « R » pour « Rendez vous
                  bewtr », c'est-à-dire rien. Source privilégiée : le logo de
                  l'annuaire déjà enregistré avec le contact ; à défaut, le
                  domaine de son adresse. */}
              <CompanyLogo
                src={brief?.contact?.company?.logoUrl}
                domain={companyDomainFromEmail(contactEmail)}
                name={brief?.contact?.company?.name ?? meeting.company}
                alt={brief?.contact?.company?.name ?? displayName}
                className="h-11 w-11 shrink-0 rounded-xl border border-border bg-white object-contain p-1"
                fallback={
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-[18px] font-semibold text-slate-500">
                    {(brief?.contact?.company?.name ?? meeting.company).charAt(0).toUpperCase()}
                  </div>
                }
              />
              <h1 className="min-w-0 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[28px]">
                {displayName}
              </h1>
            </div>

            {/* Plafond quotidien de l'accès « briefs » : le contact commercial
                plutôt qu'une simple attente. */}
            {rateLimited?.quotaReached && (
              <div className="mt-5">
                <TalkToSales
                  variant="banner"
                  title={rateLimited.message}
                  description="Besoin de plus de briefs, ou de l'enregistrement et de l'analyse de vos rendez-vous ? Parlons-en."
                />
              </div>
            )}

            {/* Rate limit banner */}
            {rateLimited && !rateLimited.quotaReached && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[color:var(--warning-soft)] px-5 py-4">
                <svg className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
                <div>
                  <p className="mb-0.5 text-[14px] font-semibold text-amber-800">Limite de génération atteinte</p>
                  <p className="text-[13.5px] text-amber-700">{rateLimited.message}</p>
                </div>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[color:var(--danger-soft)] px-5 py-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-rose-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-[13.5px] text-rose-700">{error}</p>
                </div>
                <button
                  onClick={() => generateBrief()}
                  disabled={isGenerating}
                  className="inline-flex h-8 shrink-0 items-center rounded-lg border border-rose-200 bg-white px-3 text-[13px] font-medium text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Mock data banner — masqué pendant la génération, sinon il
                s'affiche en double avec l'animation plein écran ci-dessous. */}
            {!isAiGenerated && !error && brief && !isGenerating && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[color:var(--warning-soft)] px-5 py-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[13.5px] text-amber-800">
                    Ce brief utilise des données exemples. Générez une version personnalisée par l&apos;IA.
                  </p>
                </div>
                <button
                  onClick={() => generateBrief()}
                  disabled={isGenerating}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white hover:brightness-110 transition disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <Spinner />
                      Génération...
                    </>
                  ) : (
                    "Générer avec l'IA →"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Génération ou régénération en cours : même animation dans les
              deux cas — remplace le brief existant plutôt que de le griser en
              fond, puisqu'il est de toute façon sur le point d'être remplacé. */}
          {isGenerating && <GeneratingProgress company={meeting.company} isRegenerating={!!brief} />}

          {/* Brief content */}
          {brief && !isGenerating && (
            <div>
              <div className="space-y-4 px-5 pt-5 sm:px-7">
                {/* Suggested opening line */}
                {brief.suggestedOpeningLine && (
                  <div className="rounded-2xl bg-[color:var(--lavender)] px-5 py-4">
                    <p className={`${LABEL} text-[color:var(--violet)]`}>
                      Accroche suggérée
                    </p>
                    <p className="mt-1.5 text-[16.5px] font-medium leading-snug text-slate-900 sm:text-[18px]">
                      «&nbsp;{brief.suggestedOpeningLine}&nbsp;»
                    </p>
                  </div>
                )}

                {/* Historique relationnel */}
                {brief.historiqueRelationnel && (
                  <div className="rounded-2xl bg-[color:var(--warning-soft)] px-5 py-4">
                    <p className={`${LABEL} flex items-center gap-1.5 text-amber-700`}>
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Historique avec ce contact
                    </p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-slate-900">
                      {brief.historiqueRelationnel}
                    </p>
                  </div>
                )}

                {/* Historique des calls */}
                {callHistory.length > 0 && (
                  <div className="pt-2">
                    <p className={`${LABEL} text-slate-500`}>
                      Calls précédents
                    </p>
                    <div className="mt-2.5 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                      {callHistory.map((c) => (
                        <Link
                          key={c.id}
                          href={`/feedback/${c.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group"
                        >
                          <span className="text-[13px] text-slate-700 group-hover:text-slate-900 transition-colors">
                            {formatCallDate(c.date)}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.follow_up_sent_at && (
                              <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                                  <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                                </svg>
                                Envoyé
                              </span>
                            )}
                            {c.sentiment && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${sentimentCls[c.sentiment] ?? "bg-slate-100 text-slate-600"}`}>
                                {c.sentiment}
                              </span>
                            )}
                            {c.global_score !== null && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums ${callScoreCls(c.global_score)}`}>
                                {c.global_score.toFixed(1)}/5
                              </span>
                            )}
                            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Une seule colonne sous `lg`. À trois colonnes sur 390 px, la
                  principale tombait à ~195 px et la latérale à ~98 px : le texte
                  se coupait tous les trois mots et les pastilles de vocabulaire
                  s'empilaient une lettre par ligne. */}
              <div className="grid grid-cols-1 gap-7 px-5 pb-7 pt-7 sm:px-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
                {/* Main column */}
                <div className="min-w-0 space-y-7">
                  <Section title="Vue d'ensemble">
                    <p className="text-[14px] leading-relaxed text-slate-900">{brief.companyOverview}</p>
                    {(brief.revenue || brief.employees || meeting.website) && (
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3">
                        {brief.revenue && (
                          <div>
                            <p className="text-[12px] text-slate-500">Revenus</p>
                            <p className="text-[15px] font-semibold tabular-nums text-slate-900">{brief.revenue}</p>
                          </div>
                        )}
                        {brief.employees && (
                          <div>
                            <p className="text-[12px] text-slate-500">Effectif</p>
                            <p className="text-[15px] font-semibold tabular-nums text-slate-900">{brief.employees}</p>
                          </div>
                        )}
                        {meeting.website && (
                          <div className="min-w-0">
                            <p className="text-[12px] text-slate-500">Site web</p>
                            <p className="break-all text-[15px] font-semibold text-[color:var(--violet)]">{meeting.website}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Section>

                  {/* Ordre de lecture d'un commercial deux minutes avant
                      l'appel, le même que l'exemple du site : ce qui se dit
                      d'abord (les pain points et leurs questions, la
                      référence à citer), le contexte ensuite (arguments,
                      actualités). Les actualités venaient en premier, les
                      pain points en dernier. */}
                  {brief.painPoints.length > 0 && (
                    <Section title="Pain points identifiés">
                      <div className="space-y-3.5">
                        {brief.painPoints.map((p, i) => (
                          <TalkingPointItem key={i} point={p} color={painPointColors[i % painPointColors.length]} />
                        ))}
                      </div>
                    </Section>
                  )}

                  {brief.references && brief.references.length > 0 && (
                    <Section title="Références clients">
                      <div className="space-y-3">
                        {brief.references.map((ref, i) => (
                          <div key={i} className="rounded-2xl border border-border p-4">
                            <p className="text-[15px] font-semibold text-slate-900">{ref.client_name}</p>
                            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">{ref.relevance}</p>
                            <div className="mt-3 rounded-xl bg-[color:var(--lavender)] px-4 py-3">
                              <p className={`${LABEL} text-[color:var(--violet)]`}>
                                À dire en call
                              </p>
                              <p className="mt-1 text-[13.5px] leading-relaxed text-slate-900">{ref.pitch}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {brief.talkingPoints.length > 0 && (
                    <Section title="Arguments commerciaux">
                      <div className="space-y-3.5">
                        {brief.talkingPoints.map((p, i) => (
                          <TalkingPointItem key={i} point={p} color={talkingPointColors[i % talkingPointColors.length]} />
                        ))}
                      </div>
                    </Section>
                  )}

                  {brief.actualites && brief.actualites.length > 0 && (
                    <Section title="Actualités récentes">
                      <div className="-mx-2.5 space-y-0.5">
                        {brief.actualites.map((article, i) => (
                          <a
                            key={i}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 group rounded-xl px-2.5 py-2 hover:bg-slate-50 transition-colors"
                          >
                            <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold tabular-nums text-slate-500">
                              {i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13.5px] font-medium leading-snug text-slate-900 group-hover:text-[color:var(--violet)] transition-colors">
                                {article.titre}
                              </p>
                              {article.description && (
                                <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-slate-600">
                                  {article.description}
                                </p>
                              )}
                              <p className="mt-0.5 text-[12px] text-slate-500">
                                {article.source}
                                {(() => { const d = formatNewsDate(article.date); return d ? ` · ${d}` : ""; })()}
                              </p>
                            </div>
                            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-[color:var(--violet)] shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </Section>
                  )}

                  {brief.recentNews.length > 0 && (
                    <Section title="Actualités (texte)">
                      <div className="space-y-2.5">
                        {brief.recentNews.map((news, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold tabular-nums text-slate-500">
                              {i + 1}
                            </div>
                            <p className="text-[13.5px] leading-relaxed text-slate-900">{news}</p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>

                {/* Sidebar */}
                <aside className="min-w-0 space-y-7 border-t border-border pt-7 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <Section title="Contacts">
                    {/* brief.contact plutôt que meeting.contacts (toujours vide
                        — jamais alimenté) : construit côté serveur à partir
                        d'Apollo quand un contactEmail est connu, avec repli sur
                        le seul email si l'enrichissement échoue ou n'est pas
                        configuré (cf. lib/apollo.ts). */}
                    {brief.contact ? (
                      <ContactCard contact={brief.contact} notFound={contactEnriched === false} />
                    ) : (
                      !editingContact && (
                        <p className="text-[13px] text-slate-500">Aucun contact identifié pour ce rendez-vous.</p>
                      )
                    )}

                    {/* Saisie du contact — l'adresse est optionnelle à la
                        création d'un RDV manuel, il faut donc pouvoir la
                        renseigner ou la corriger ensuite. Met à jour la seule
                        fiche contact, sans relancer la génération du brief
                        (~54s et un appel Claude pour une donnée qui n'en dépend
                        pas). */}
                    {editingContact ? (
                      <div className="mt-3 space-y-2.5">
                        <div>
                          <label className="mb-1 block text-[12px] font-medium text-slate-600">
                            Nom et prénom
                          </label>
                          <input
                            type="text"
                            value={contactNameInput}
                            onChange={(e) => setContactNameInput(e.target.value)}
                            autoFocus
                            placeholder="ex. Edmond Dantès"
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveContact();
                              if (e.key === "Escape") setEditingContact(false);
                            }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[12px] font-medium text-slate-600">
                            Email (optionnel)
                          </label>
                          <input
                            type="email"
                            value={contactInput}
                            onChange={(e) => setContactInput(e.target.value)}
                            placeholder="prenom@entreprise.com"
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveContact();
                              if (e.key === "Escape") setEditingContact(false);
                            }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[12px] font-medium text-slate-600">
                            Entreprise
                          </label>
                          <input
                            type="text"
                            value={contactCompanyInput}
                            onChange={(e) => setContactCompanyInput(e.target.value)}
                            placeholder="ex. BE WTR"
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveContact();
                              if (e.key === "Escape") setEditingContact(false);
                            }}
                          />
                        </div>
                        {/* Nom complet + entreprise exacte : c'est la
                            combinaison qui permet de retrouver la personne. Un
                            prénom seul, ou une raison sociale approximative, ne
                            remontent rien. */}
                        <p className="text-[12px] leading-relaxed text-slate-500">
                          Le nom complet (prénom + nom) suffit, même sans email. L&apos;orthographe de
                          l&apos;entreprise n&apos;a pas besoin d&apos;être exacte.
                        </p>
                        {contactError && <p className="text-[12px] text-rose-700">{contactError}</p>}
                        <div className="flex gap-2 pt-0.5">
                          <button
                            onClick={() => setEditingContact(false)}
                            className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-border bg-white px-3 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={saveContact}
                            disabled={(!contactInput.trim() && !contactNameInput.trim()) || contactSaving}
                            className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-[color:var(--primary)] px-3 text-[12.5px] font-medium text-white hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {contactSaving ? "Recherche…" : "Enregistrer"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setContactInput(brief.contact?.email ?? "");
                          // Uniquement si le nom vient d'un enrichissement
                          // réussi (un poste l'accompagne). Sinon il a été
                          // DÉDUIT de l'adresse — « gautier@… » donne
                          // « Gautier », un prénom seul, avec lequel la
                          // recherche ne peut pas aboutir. Le pré-remplir
                          // revenait à faire revalider une saisie condamnée.
                          setContactNameInput(brief.contact?.title ? brief.contact.name : "");
                          setContactCompanyInput(meeting.company);
                          setContactError(null);
                          setEditingContact(true);
                        }}
                        className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg border border-border bg-white text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        {brief.contact ? "Modifier le contact" : "Ajouter un contact"}
                      </button>
                    )}
                  </Section>

                  {brief.objectives.length > 0 && (
                    <Section title="Objectifs du call">
                      <div className="space-y-2">
                        {brief.objectives.map((obj, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-border" />
                            <p className="text-[13px] leading-snug text-slate-900">{obj}</p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {brief.competitorsUsed && brief.competitorsUsed.length > 0 && (
                    <Section title="Outils utilisés actuellement">
                      <div className="flex flex-wrap gap-1.5">
                        {brief.competitorsUsed.map((c) => (
                          <span key={c} className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-600">
                            {c}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {brief.keywords && brief.keywords.length > 0 && (
                    <Section title="Vocabulaire métier">
                      <div className="flex flex-wrap gap-1.5">
                        {brief.keywords.map((kw) => (
                          <span key={kw} className="rounded-full bg-[color:var(--lavender)] px-2.5 py-1 text-[12px] font-medium text-[color:var(--violet)]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Regenerate button */}
                  <button
                    onClick={() => generateBrief(true)}
                    disabled={isGenerating}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Spinner />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Régénérer le brief
                      </>
                    )}
                  </button>
                </aside>
              </div>
            </div>
          )}

          {/* Empty state (no brief, not generating) */}
          {!brief && !isGenerating && (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center sm:px-7">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--lavender)]">
                <svg className="h-6 w-6 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
              </div>
              <h2 className="mb-1 text-[16px] font-semibold text-slate-900">Aucun brief pour ce rendez-vous</h2>
              <p className="mb-6 text-[14px] text-slate-500">
                Générez un brief IA personnalisé pour {meeting.company}.
              </p>
              <button
                onClick={() => generateBrief()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-5 text-[14px] font-medium text-white hover:brightness-110 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Générer avec l&apos;IA
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
