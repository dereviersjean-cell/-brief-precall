"use client";

import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Circle, Compass, FileText, TrendingUp, Video, type LucideIcon } from "lucide-react";
import type { ActivationState } from "@/lib/db";
import type { ModuleKey } from "@/lib/modules";

// Présentation du produit pour un nouveau compte.
//
// L'onboarding existant ne collecte que le profil commercial : il ne dit ni ce
// qu'est Brief, ni ce qu'il reste à brancher. On pouvait le terminer et
// atterrir sur un tableau de bord vide sans comprendre pourquoi.
//
// Structure calquée sur les trois piliers de la landing (Préparer / Débriefer
// / Progresser) : quelqu'un qui a lu le site retrouve les mêmes mots, et
// l'ordre suit celui d'un vrai cycle de vente.

type Pillar = { icon: LucideIcon; step: string; title: string; lead: string; detail: string };

// Le texte suit les modules ouverts (parcours client) : un module fermé
// n'existe pas pour le client, la présentation ne doit donc ni le nommer ni
// le promettre. Tout ouvert, on retrouve le texte d'origine.
function pillarsFor(modules: readonly ModuleKey[]): Pillar[] {
  const has = (key: ModuleKey) => modules.includes(key);

  const debriefItems = [
    "le compte-rendu",
    "les points clés",
    has("objections") ? "les objections soulevées" : null,
    "les prochaines étapes",
    has("follow_up") ? "un email de suivi prêt à relire" : null,
  ].filter((item): item is string => item !== null);
  const destinations = has("crm") ? "votre boîte mail et votre CRM" : "votre boîte mail";

  const progressDetail = [
    has("playbook") ? "Chaque call est noté sur la grille de votre équipe." : "Chaque call est noté sur les étapes clés d'un rendez-vous de vente.",
    has("objections")
      ? "Vous voyez vos scores évoluer, quelles objections reviennent, comment vous les traitez, et ce qu'il aurait fallu répondre."
      : "Vous voyez vos scores évoluer, ce que vous faites bien et ce qu'il faut travailler.",
    "Votre manager suit la même chose à l'échelle de l'équipe.",
  ].join(" ");

  return [
    {
      icon: FileText,
      step: "1",
      title: "Préparer",
      lead: "Avant chaque rendez-vous, un brief vous attend.",
      detail:
        "Brief lit votre agenda, identifie le prospect, et prépare un dossier : ce que fait l'entreprise, son actualité, ses données légales, l'historique de vos échanges. Vous arrivez au rendez-vous en sachant à qui vous parlez.",
    },
    {
      icon: Video,
      step: "2",
      title: "Débriefer",
      lead: "Pendant le rendez-vous, vous n'avez rien à faire.",
      detail: `Un assistant rejoint la visio et prend des notes. À la fin, vous recevez ${joinFrench(debriefItems)}. Vous n'ouvrez même pas Brief : tout arrive dans ${destinations}.`,
    },
    {
      icon: TrendingUp,
      step: "3",
      title: "Progresser",
      lead: "Au fil des rendez-vous, vous voyez ce qui fait la différence.",
      detail: progressDetail,
    },
  ];
}

function joinFrench(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

const STEP_CONTENT: Record<
  ActivationState["steps"][number]["key"],
  { title: string; why: string; href: string; cta: string }
> = {
  profil: {
    title: "Décrire ce que vous vendez",
    why: "C'est ce qui rend vos briefs spécifiques à votre offre plutôt que génériques.",
    href: "/onboarding",
    cta: "Compléter mon profil",
  },
  agenda: {
    title: "Connecter votre agenda",
    why: "L'étape qui déclenche tout : sans elle, aucun rendez-vous n'est repéré et aucun compte-rendu n'est produit.",
    href: "/settings/connexions",
    cta: "Connecter l'agenda",
  },
  playbook: {
    title: "Définir votre playbook",
    why: "La grille sur laquelle vos rendez-vous sont notés. Sans elle, l'analyse utilise des critères génériques au lieu des vôtres.",
    href: "/dashboard/playbook",
    cta: "Ouvrir le playbook",
  },
  "premier-call": {
    title: "Attendre votre premier rendez-vous",
    why: "Dès qu'un rendez-vous en visio a lieu, il est enregistré et analysé automatiquement. Rien à faire de plus.",
    href: "/feedback",
    cta: "Voir mes rendez-vous",
  },
};

export default function WelcomeClient({
  activation,
  firstName,
  modules,
}: {
  activation: ActivationState;
  firstName: string | null;
  modules: ModuleKey[];
}) {
  const pillars = pillarsFor(modules);
  const remaining = activation.steps.filter((s) => !s.done);
  const allDone = remaining.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-[color:var(--violet)]">Bienvenue</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        {firstName ? `Bonjour ${firstName},` : "Bonjour,"} voici comment Brief fonctionne
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        Brief a un seul objectif : augmenter votre taux de closing. Il prépare vos rendez-vous, les débriefe à votre
        place, et vous montre ce qui fait la différence entre un rendez-vous gagné et un rendez-vous perdu.
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
        La plupart du temps, <strong className="text-slate-900">vous n&apos;aurez pas à ouvrir Brief</strong> : les
        briefs et les comptes-rendus arrivent dans votre boîte mail{modules.includes("crm") ? ", votre agenda et votre CRM" : " et votre agenda"}.
      </p>

      <div className="mt-10 space-y-4">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--lavender)] text-[color:var(--violet)]">
                <pillar.icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Étape {pillar.step}</p>
                <h2 className="mt-0.5 text-[17px] font-semibold text-slate-900">{pillar.title}</h2>
                <p className="mt-1 text-[14px] font-medium text-slate-700">{pillar.lead}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">{pillar.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold text-slate-900">
            {allDone ? "Votre compte est prêt" : "Ce qu'il reste à faire"}
          </h2>
          <p className="text-[13px] text-slate-400">
            {activation.completed} sur {activation.total}
          </p>
        </div>

        {/* Barre de progression : un chiffre seul ne dit pas s'il reste
            beaucoup à faire, et c'est cette impression qui décide si on
            continue ou si on referme l'onglet. */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full brand-gradient transition-all"
            style={{ width: `${(100 * activation.completed) / activation.total}%` }}
          />
        </div>

        <ul className="mt-5 space-y-4">
          {activation.steps.map((step) => {
            const content = STEP_CONTENT[step.key];
            return (
              <li key={step.key} className="flex items-start gap-3">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-[14px] font-medium ${step.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                    {content.title}
                  </p>
                  {!step.done && (
                    <>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{content.why}</p>
                      <Link
                        href={content.href}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--violet)] hover:underline"
                      >
                        {content.cta} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/demo/dashboard?tour=1"
          className="inline-flex h-10 items-center gap-2 rounded-lg brand-gradient px-4 text-[14px] font-medium text-white transition-all hover:brightness-110"
        >
          <Compass className="h-4 w-4" />
          Faire le tour de l&apos;interface
        </Link>
        <Link
          href="/brief"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
        >
          <Calendar className="h-4 w-4" />
          Aller directement à Brief
        </Link>
        <Link href="/help" className="text-[13px] text-slate-500 hover:text-slate-900">
          Consulter l&apos;aide
        </Link>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Cette page et la visite guidée restent accessibles depuis l&apos;aide — revenez-y quand vous voulez.
      </p>
    </div>
  );
}
