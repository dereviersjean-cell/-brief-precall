"use client";

import { useState } from "react";
import { Lock, Dumbbell, Mic, MessagesSquare, TrendingUp, Sparkles, Loader2, Check } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";

const FEATURES = [
  { icon: Mic, text: "Roleplay vocal face à un prospect IA qui ne lâche rien" },
  { icon: MessagesSquare, text: "Scénarios générés automatiquement depuis vos objections mal traitées" },
  { icon: TrendingUp, text: "Débrief noté après chaque session, avec la réponse à retenir" },
];

type RequestState = "idle" | "sending" | "sent" | "error";

// Module additionnel désactivé par défaut (migration 003) — /training rend
// ceci à la place de TrainingClient tant que
// isTrainingEnabledForOrganization renvoie false pour l'organisation de
// l'utilisateur. Le CTA appelle /api/training/request-unlock (trace en base
// + email admin) plutôt qu'un simple mailto — pas d'infra de facturation par
// module à ce stade, le déblocage se fait manuellement côté admin
// (setTrainingEnabledForOrganization).
export default function TrainingLockedClient() {
  const [state, setState] = useState<RequestState>("idle");

  async function handleRequest() {
    setState("sending");
    try {
      const res = await fetch("/api/training/request-unlock", { method: "POST" });
      if (!res.ok) throw new Error();
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="brief-ui mx-auto px-4 sm:px-10 py-8 max-w-3xl">
      <PageHeader
        eyebrow="Module additionnel"
        title="Entraînement"
        subtitle="Le coach IA qui fait travailler votre équipe sur les objections qu'elle n'a pas su traiter."
      />

      <div className="relative mt-8">
        {/* Aperçu flouté du produit réel, purement décoratif */}
        <div aria-hidden className="pointer-events-none select-none blur-[2px] opacity-50">
          <Card padded={false} className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl brand-gradient text-white text-[14px] font-semibold">
                CM
              </span>
              <div>
                <p className="text-[15px] font-semibold text-slate-900">Claire Morin</p>
                <p className="text-[12.5px] text-slate-500">Directrice générale · PME française</p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-slate-50 border border-border px-3.5 py-2.5 text-[13px] text-slate-700">
                « On est déjà engagés avec un concurrent, honnêtement je ne vois pas ce que ça changerait. »
              </div>
              <div className="max-w-[70%] ml-auto rounded-2xl rounded-br-md brand-gradient text-white px-3.5 py-2.5 text-[13px]">
                Qu&apos;est-ce qui vous ferait reconsidérer votre choix aujourd&apos;hui ?
              </div>
            </div>
          </Card>
        </div>

        <div className="absolute inset-0 grid place-items-center px-4">
          <div className="text-center px-6 py-8 rounded-2xl bg-white/90 backdrop-blur border border-border shadow-[var(--shadow-md)] max-w-sm">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--lavender)] text-[color:var(--violet)] mb-3">
              <Lock className="h-5 w-5" />
            </span>
            <p className="text-[14px] font-semibold text-slate-900">Module non débloqué</p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              Entraînement est un module additionnel — demandez son activation pour votre organisation.
            </p>

            {state === "sent" ? (
              <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5" /> Demande envoyée — on revient vers vous rapidement.
              </p>
            ) : (
              <button
                onClick={handleRequest}
                disabled={state === "sending"}
                className="mt-4 inline-flex items-center justify-center gap-1.5 brand-gradient h-9 px-4 rounded-lg text-[13px] font-medium text-white shadow-[var(--shadow-glow)] hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {state === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {state === "sending" ? "Envoi…" : "Je veux débloquer ce module"}
              </button>
            )}
            {state === "error" && (
              <p className="mt-2 text-[11.5px] text-rose-500">
                Erreur d&apos;envoi — écrivez-nous directement à{" "}
                <a href="mailto:hello@oliverlist.com" className="underline">
                  hello@oliverlist.com
                </a>
                .
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">Ce que ça débloque</h2>
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--lavender)] text-[color:var(--violet)]">
                <f.icon className="h-4 w-4" />
              </span>
              <span className="text-[13.5px] text-slate-700 leading-relaxed pt-1">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[11.5px] text-slate-400">
        <Dumbbell className="h-3.5 w-3.5" />
        Déjà client ? Votre administrateur peut l&apos;activer depuis l&apos;espace admin.
      </div>
    </main>
  );
}
