"use client";

import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Circle, FileText, TrendingUp, Video } from "lucide-react";
import type { ActivationState } from "@/lib/db";

// Présentation du produit pour un nouveau compte.
//
// L'onboarding existant ne collecte que le profil commercial : il ne dit ni ce
// qu'est Brief, ni ce qu'il reste à brancher. On pouvait le terminer et
// atterrir sur un tableau de bord vide sans comprendre pourquoi.
//
// Structure calquée sur les trois piliers de la landing (Préparer / Débriefer
// / Progresser) : quelqu'un qui a lu le site retrouve les mêmes mots, et
// l'ordre suit celui d'un vrai cycle de vente.

const PILLARS = [
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
    detail:
      "Un assistant rejoint la visio et prend des notes. À la fin, vous recevez le compte-rendu, les points clés, les objections soulevées, les prochaines étapes, et un email de suivi prêt à relire. Vous n'ouvrez même pas Brief : tout arrive dans votre boîte mail et votre CRM.",
  },
  {
    icon: TrendingUp,
    step: "3",
    title: "Progresser",
    lead: "Au fil des rendez-vous, vous voyez ce qui fait la différence.",
    detail:
      "Chaque call est noté sur la grille de votre équipe. Vous voyez vos scores évoluer, quelles objections reviennent, comment vous les traitez, et ce qu'il aurait fallu répondre. Votre manager suit la même chose à l'échelle de l'équipe.",
  },
];

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
}: {
  activation: ActivationState;
  firstName: string | null;
}) {
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
        briefs et les comptes-rendus arrivent dans votre boîte mail, votre agenda et votre CRM.
      </p>

      <div className="mt-10 space-y-4">
        {PILLARS.map((pillar) => (
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
          href="/brief"
          className="inline-flex h-10 items-center gap-2 rounded-lg brand-gradient px-4 text-[14px] font-medium text-white transition-all hover:brightness-110"
        >
          <Calendar className="h-4 w-4" />
          Commencer
        </Link>
        <Link href="/help" className="text-[13px] text-slate-500 hover:text-slate-900">
          Consulter l&apos;aide
        </Link>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Cette page reste accessible depuis l&apos;aide — revenez-y quand vous voulez.
      </p>
    </div>
  );
}
