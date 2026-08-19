"use client";

import type { ReactNode } from "react";

// Exemples affichés pendant la visite guidée.
//
// Raison d'être : un compte neuf n'a aucune donnée, et une visite qui pointe
// des écrans vides ne montre pas ce que le produit produit. Ces maquettes
// donnent à voir le rendu réel de chaque section avant même le premier
// rendez-vous.
//
// Ce sont des MAQUETTES, pas les vrais composants : les brancher sur les
// écrans réels supposerait d'injecter de fausses données dans des pages qui
// lisent la base côté serveur — invasif, et risqué (une donnée fictive qui
// fuit en production est bien pire qu'une visite imparfaite). Chaque panneau
// porte donc une mention « Exemple » explicite : rien ici ne doit être pris
// pour les données de l'utilisateur.
//
// Le contenu est délibérément spécifique (des chiffres, des noms, des phrases
// réelles) : un exemple générique du type « Objection 1 » n'apprend rien.

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-900">{title}</p>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-amber-700">
          Exemple
        </span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-0.5 text-[11.5px] leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

function Bar({ label, value, pct, tone }: { label: string; value: string; pct: number; tone: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 truncate text-[11px] text-slate-600">{label}</span>
      <span className="w-12 shrink-0 text-right text-[11px] font-medium text-slate-900">{value}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

const DEMOS: Record<string, ReactNode> = {
  brief: (
    <Panel title="Brief — Velbrun Capital, mardi 14h">
      <div className="space-y-2.5">
        <Field label="L'entreprise">
          Cabinet de conseil en organisation et gouvernance, 45 personnes, Paris. Croissance de 18 % l&apos;an dernier.
        </Field>
        <Field label="Actualité récente">
          Ouverture d&apos;un bureau à Lyon annoncée en juin. Recrutement de deux associés sur le pôle industrie.
        </Field>
        <Field label="Votre interlocuteur">
          Antoine Ravachol, directeur associé. Vous avez échangé deux emails en mars, restés sans réponse.
        </Field>
        <Field label="Point de vigilance">
          Leur site met en avant une équipe commerciale interne — attendez-vous à l&apos;objection « on le fait
          nous-mêmes ».
        </Field>
      </div>
    </Panel>
  ),

  analyse: (
    <Panel title="Analyse — Velbrun Capital, 32 min">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-lg bg-amber-100 px-2 py-1 text-[15px] font-bold text-amber-700">3,4</span>
        <span className="text-[11px] text-slate-500">sur 5 · sentiment positif · 3 objections</span>
      </div>
      <div className="space-y-2.5">
        <Field label="Points clés">
          Budget non arbitré avant septembre · Décision partagée avec un associé · Deux prestataires consultés
        </Field>
        <Field label="Ce qui a bien marché">
          Vous avez chiffré le coût de leur situation actuelle avant d&apos;annoncer un prix.
        </Field>
        <Field label="À travailler">
          L&apos;objection « on a déjà une équipe interne » est restée sans réponse.
        </Field>
        <Field label="Prochaine étape">Envoyer le récapitulatif chiffré avant vendredi.</Field>
      </div>
    </Panel>
  ),

  scores: (
    <Panel title="Scores — vos 6 dernières semaines">
      <div className="mb-3 flex items-end gap-1">
        {[52, 58, 55, 64, 68, 72].map((h, i) => (
          <span key={i} className="flex-1 rounded-t bg-[color:var(--violet)]/70" style={{ height: h }} />
        ))}
      </div>
      <div className="space-y-1.5">
        <Bar label="Découverte" value="4,1" pct={82} tone="bg-emerald-500" />
        <Bar label="Qualification" value="3,6" pct={72} tone="bg-emerald-500" />
        <Bar label="Objections" value="2,4" pct={48} tone="bg-rose-500" />
        <Bar label="Closing" value="3,0" pct={60} tone="bg-amber-400" />
      </div>
      <p className="mt-2.5 text-[10.5px] text-slate-400">
        La dimension la plus faible vous dit où travailler en priorité.
      </p>
    </Panel>
  ),

  analytics: (
    <Panel title="Analytics — comment vous conduisez un échange">
      <div className="space-y-1.5">
        <Bar label="Vous" value="62 %" pct={62} tone="bg-amber-400" />
        <Bar label="Moyenne équipe" value="48 %" pct={48} tone="bg-emerald-500" />
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-slate-500">
        Temps de parole. En découverte on vise 35-55 % : au-delà, on présente au lieu d&apos;écouter.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2.5">
        {[
          ["1:49", "Plus long monologue"],
          ["17,3", "Questions par heure"],
          ["1,1 s", "Patience"],
        ].map(([v, l]) => (
          <div key={l}>
            <p className="text-[13px] font-semibold text-slate-900">{v}</p>
            <p className="text-[9.5px] leading-tight text-slate-400">{l}</p>
          </div>
        ))}
      </div>
    </Panel>
  ),

  objections: (
    <Panel title="Objections — « Équipe commerciale interne »">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
          Non traitée
        </span>
        <span className="text-[10.5px] text-slate-400">7 occurrences · 4 commerciaux</span>
      </div>
      <div className="space-y-2.5">
        <Field label="Ce que le prospect a dit">
          «&nbsp;On a déjà deux commerciaux en interne, je ne vois pas ce que vous feriez de plus.&nbsp;»
        </Field>
        <Field label="Ce que le commercial a répondu">
          «&nbsp;Oui, je comprends tout à fait, c&apos;est souvent le cas.&nbsp;»
        </Field>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-emerald-700">
            Ce qu&apos;il aurait fallu répondre
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-900">
            Vos commerciaux closent. Nous, on remplit leur agenda. Combien de rendez-vous qualifiés obtiennent-ils par
            semaine aujourd&apos;hui ?
          </p>
        </div>
      </div>
    </Panel>
  ),

  playbook: (
    <Panel title="Playbook — votre grille de notation">
      <div className="space-y-2">
        {[
          ["Découverte", "poids 3", "Le besoin est-il chiffré ? Le problème actuel est-il quantifié ?"],
          ["Qualification", "poids 2", "Budget, décideur et échéance sont-ils identifiés ?"],
          ["Objections", "poids 3", "Chaque réticence est-elle traitée selon la méthode définie ?"],
        ].map(([name, weight, q]) => (
          <div key={name} className="rounded-lg bg-slate-50 px-2.5 py-2">
            <p className="text-[11.5px] font-semibold text-slate-800">
              {name} <span className="font-normal text-slate-400">· {weight}</span>
            </p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">{q}</p>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[10.5px] text-slate-400">
        Défini par votre manager. C&apos;est cette grille qui note chacun de vos rendez-vous.
      </p>
    </Panel>
  ),
};

export function TourDemo({ id }: { id: string }) {
  return DEMOS[id] ?? null;
}
