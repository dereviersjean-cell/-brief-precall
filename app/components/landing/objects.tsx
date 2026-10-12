import type { ReactNode } from "react";
import Image from "next/image";
import { ValdorLogo, CartonnerieLogo } from "@/app/components/landing/brands";
import { Check, Clock, History, MapPin, Target, Play } from "lucide-react";

// Les aperçus produit de la landing. Chacun reprend la STRUCTURE RÉELLE d'un
// écran de Brief — mêmes sections, même ordre, même densité, même ton que les
// briefs et analyses produits en vrai (relevés en base le 12/10/2026) — mais
// sur un rendez-vous fictif : les vrais briefs et analyses portent sur de vrais
// prospects et de vraies conversations, qu'on ne publie pas.
//
//   BriefSheet        ↔ app/brief/[id]/BriefClient.tsx
//   SourcesObject     ↔ le même brief replié, chaque bloc avec la source que
//                       lib/brief-generator.ts interroge (registre, presse,
//                       annuaire, CRM, références clients)
//   AnalysisObject    ↔ app/feedback/[id]/FeedbackDetailClient.tsx (client)
//   ObjectionObject   ↔ /dashboard/objections/[categoryId] + OccurrenceDetail
//   DigestObject      ↔ le bilan hebdomadaire manager (lib/admin-config.ts)
//
// Le fil : Thomas Lefèvre (commercial) présente sa solution à Claire Mercier,
// directrice des opérations de Valdor Emballages, le jeudi 2 octobre à 14:30.

const NB = " ";

export function Label({ children, tone = "faint" }: { children: ReactNode; tone?: "faint" | "accent" }) {
  return (
    <div
      className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
        tone === "accent" ? "text-land-accent" : "text-land-faint"
      }`}
    >
      {children}
    </div>
  );
}

const SHEET = "rounded-[20px] border border-land-line bg-land-surface shadow-[var(--land-shadow-lg)]";
const d = (i: number) => ({ "--i": i }) as React.CSSProperties;

// ─── Le brief (haut de page) ─────────────────────────────────────────────────

function ContactCard({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        {/* Portrait généré par IA (Higgsfield, 12/10/2026) : Claire Mercier est
            un contact fictif, l'aperçu le dit en légende. */}
        <Image
          src="/landing/people/avatar-claire.jpg"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-full bg-land-accent-soft object-cover"
        />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-snug text-land-ink">Claire Mercier</div>
          <div className="text-[12.5px] leading-snug text-land-muted">Directrice des opérations</div>
        </div>
      </div>
      <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-land-accent-soft px-2 py-0.5 text-[11.5px] font-semibold text-land-accent">
        <Target className="h-3 w-3" aria-hidden />
        Décisionnaire
      </span>
      {!compact && (
        <>
          <ul className="mt-3 space-y-1.5 text-[12.5px] text-land-muted">
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-land-faint" aria-hidden /> Angers
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-land-faint" aria-hidden /> En poste depuis 4{NB}ans
            </li>
            <li className="flex items-start gap-2">
              <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-land-faint" aria-hidden />
              <span className="leading-snug">Auparavant responsable de production chez Cartonnages Rivière</span>
            </li>
          </ul>
          <div className="mt-3 flex items-center gap-2.5 border-t border-land-line pt-3">
            <ValdorLogo size={32} />
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-land-ink">VALDOR EMBALLAGES</div>
              <div className="text-[12px] text-land-faint">Emballage · 140{NB}personnes</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** En-tête commun du brief : la même ligne relie le haut de page, l'étape
 * « Préparer » et l'analyse, comme dans l'app. */
export function MeetingHeader({ status }: { status: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-land-line px-5 py-3.5 sm:px-7">
      <div className="flex items-center gap-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-land-accent text-[11px] font-semibold text-land-accent-ink">
          B
        </span>
        {status}
      </div>
      <span className="whitespace-nowrap text-[13px] tabular-nums text-land-muted">Jeu. 2{NB}oct. · 14:30 · 45{NB}min</span>
    </div>
  );
}

export function BriefSheet() {
  // Le brief qui s'écrit : statut « Préparation » puis « Prêt », sections qui
  // apparaissent comme de l'encre. Tout le texte est dans le DOM dès le rendu
  // serveur ; l'animation ne masque que visuellement. Les blocs
  // `land-hero-collapse` se referment quand le brief se replie au défilement
  // (HeroStage) : ne reste que ce qu'on relit deux minutes avant l'appel.
  return (
    <figure className="mx-auto w-full max-w-[1040px]">
      <div data-hero-card className={`land-card-rise overflow-hidden text-left ${SHEET}`}>
        <MeetingHeader
          status={
            <span className="grid text-[13px] font-medium">
              <span className="land-status-busy inline-flex items-center gap-1.5 text-land-muted [grid-area:1/1]">
                <span className="land-dot h-1.5 w-1.5 rounded-full bg-land-accent" aria-hidden />
                Préparation du brief…
              </span>
              <span className="land-status-ready inline-flex items-center gap-1.5 text-land-ink [grid-area:1/1]">
                <Check className="h-3.5 w-3.5 text-land-accent" aria-hidden />
                Brief prêt
              </span>
            </span>
          }
        />

        <div className="px-5 pt-6 sm:px-7">
          <div className="flex items-center gap-3 sm:gap-4">
            <ValdorLogo size={44} className="land-pop" />
            <div className="land-write text-[24px] font-semibold tracking-[-0.02em] text-land-ink sm:text-[28px]" style={d(0)}>
              Présentation Valdor Emballages
            </div>
          </div>
          <div className="land-write mt-4 rounded-2xl bg-land-accent-soft px-5 py-4" style={d(1)}>
            <Label tone="accent">Accroche suggérée</Label>
            <p className="mt-1.5 text-[16.5px] font-medium leading-snug text-land-ink sm:text-[18px]">
              «{NB}Claire, vous ouvrez une deuxième ligne à Angers. Quand le volume double, comment gardez-vous la
              main sur les approvisionnements et les délais clients{NB}?{NB}»
              <span className="land-caret-end">
                <span className="land-caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-land-accent" aria-hidden />
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 px-5 pb-7 pt-6 sm:px-7 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <section className="land-write" style={d(2)}>
              <Label>Vue d&apos;ensemble</Label>
              <p className="mt-2 text-[14px] leading-relaxed text-land-ink">
                Valdor Emballages conçoit et fabrique des emballages en carton ondulé pour l&apos;agroalimentaire et la
                cosmétique, depuis son site historique d&apos;Angers. Entreprise familiale fondée en 1998, elle met en
                avant une offre mono-matériau recyclable depuis l&apos;entrée en vigueur du règlement européen PPWR.
              </p>
              <dl className="mt-3 flex gap-6 border-t border-land-line pt-3">
                {[
                  ["Revenus", `21${NB}M€`],
                  ["Effectif", "140"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[12px] text-land-faint">{k}</dt>
                    <dd className="text-[15px] font-semibold tabular-nums text-land-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Ce qui se referme quand le brief se replie au défilement. */}
            <div className="land-hero-collapse">
              <div className="space-y-6 pt-6">
                <section className="land-write" style={d(3)}>
                  <Label>Pain points identifiés</Label>
                  <ul className="mt-2.5 space-y-3.5">
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-land-warn" aria-hidden />
                      <div>
                        <div className="text-[14px] font-semibold text-land-ink">Montée en charge de la nouvelle ligne</div>
                        <p className="mt-0.5 text-[13.5px] leading-relaxed text-land-muted">
                          Doubler la capacité sans doubler l&apos;équipe planning crée souvent des ruptures les premiers mois.
                          Le recrutement en cours d&apos;un responsable supply chain va dans ce sens.{" "}
                          <span className="text-land-ink">Question{NB}: qui pilote la montée en charge, et avec quels outils{NB}?</span>
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-land-warn" aria-hidden />
                      <div>
                        <div className="text-[14px] font-semibold text-land-ink">Preuves de recyclabilité demandées</div>
                        <p className="mt-0.5 text-[13.5px] leading-relaxed text-land-muted">
                          Les marques de cosmétique réclament des justificatifs pour leurs propres déclarations PPWR.{" "}
                          <span className="text-land-ink">Question{NB}: comment y répondez-vous aujourd&apos;hui, et en combien de temps{NB}?</span>
                        </p>
                      </div>
                    </li>
                  </ul>
                </section>

                <section className="land-write" style={d(4)}>
                  <Label>Actualités récentes</Label>
                  <ul className="mt-2.5 space-y-2.5">
                    {[
                      ["Valdor investit 6 M€ dans une deuxième ligne de production à Angers", `Presse régionale · 2${NB}sept.`],
                      ["Recrutement d'un responsable supply chain en CDI", `Offre d'emploi · 18${NB}sept.`],
                    ].map(([t, s], i) => (
                      <li key={t} className="flex gap-3">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-land-sunken text-[11px] font-bold text-land-muted">
                          {i + 1}
                        </span>
                        <div>
                          <div className="text-[13.5px] font-medium leading-snug text-land-ink">{t}</div>
                          <div className="mt-0.5 text-[12px] text-land-faint">{s}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>

          <aside className="md:border-l md:border-land-line md:pl-6">
            <section className="land-write" style={d(2)}>
              <Label>Contact</Label>
              <div className="mt-3">
                <ContactCard />
              </div>
            </section>
            <div className="land-hero-collapse">
              <div className="space-y-6 pt-6">
                <section className="land-write" style={d(3)}>
                  <Label>Objectifs du call</Label>
                  <ul className="mt-2.5 space-y-2 text-[13px] leading-snug text-land-ink">
                    {["Valider qui décide et qui signe", "Obtenir un R3 avec la direction financière", "Caler le calendrier de la nouvelle ligne"].map(
                      (o) => (
                        <li key={o} className="flex gap-2.5">
                          <span className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-land-line" aria-hidden />
                          {o}
                        </li>
                      ),
                    )}
                  </ul>
                </section>
                <section>
                  <div className="land-write" style={d(4)}>
                    <Label>Vocabulaire métier</Label>
                  </div>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {["carton ondulé", "taux de rebut", "PPWR", "mono-matériau", "TRS"].map((w, i) => (
                      <li
                        key={w}
                        className="land-pop rounded-full bg-land-accent-soft px-2.5 py-1 text-[12px] font-medium text-land-accent"
                        style={d(i)}
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {/* Posée sur l'aurore : texte clair. */}
      <figcaption className="mt-4 text-center text-[13px] text-land-faint">
        Exemple au format réel. Entreprise et contact fictifs.
      </figcaption>
    </figure>
  );
}

// ─── Préparer : le même brief, chaque bloc avec sa source ─────────────────────

function Source({ children, i }: { children: ReactNode; i: number }) {
  // La source apparaît après le bloc qu'elle justifie, une à une, quand
  // l'étape s'affiche : le brief « se compile » sous les yeux.
  return (
    <span
      className="land-step-row inline-flex shrink-0 items-center gap-1 rounded-full bg-land-sunken px-2 py-0.5 text-[11.5px] font-medium text-land-muted"
      style={d(i)}
    >
      <Check className="h-3 w-3 text-land-accent" aria-hidden />
      {children}
    </span>
  );
}

function BlockHead({ label, source, i }: { label: string; source: string; i: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      <Source i={i}>{source}</Source>
    </div>
  );
}

export function SourcesObject() {
  // Reprise du brief replié du haut de page — même en-tête, même titre, même
  // accroche, même vue d'ensemble, même contact — avec, en plus, la source de
  // chaque bloc et la référence client que Brief en a déduite.
  return (
    <div className={`overflow-hidden ${SHEET}`}>
      <MeetingHeader
        status={
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-land-ink">
            <Check className="h-3.5 w-3.5 text-land-accent" aria-hidden />
            Brief prêt la veille à 18:00
          </span>
        }
      />
      <div className="space-y-5 px-6 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <ValdorLogo size={36} />
          <div className="text-[19px] font-semibold tracking-[-0.02em] text-land-ink">Présentation Valdor Emballages</div>
        </div>

        <div className="rounded-2xl bg-land-accent-soft px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <Label tone="accent">Accroche suggérée</Label>
            <Source i={0}>Presse régionale, 2{NB}sept.</Source>
          </div>
          <p className="mt-1.5 text-[14.5px] font-medium leading-snug text-land-ink">
            «{NB}Claire, vous ouvrez une deuxième ligne à Angers. Quand le volume double, comment gardez-vous la main
            sur les approvisionnements et les délais clients{NB}?{NB}»
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <section>
            <BlockHead label="Vue d'ensemble" source="Registre officiel" i={1} />
            <p className="mt-2 text-[13px] leading-relaxed text-land-ink">
              Emballages en carton ondulé pour l&apos;agroalimentaire et la cosmétique, site historique d&apos;Angers,
              offre mono-matériau recyclable.
            </p>
            <dl className="mt-2.5 flex gap-5">
              {[
                ["Revenus", `21${NB}M€`],
                ["Effectif", "140"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11.5px] text-land-faint">{k}</dt>
                  <dd className="text-[14px] font-semibold tabular-nums text-land-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <BlockHead label="Contact" source="Annuaire pro" i={2} />
            <div className="mt-2.5">
              <ContactCard compact />
            </div>
          </section>
        </div>

        <section className="border-t border-land-line pt-4">
          <BlockHead label="Historique" source="Votre CRM" i={3} />
          <p className="mt-1.5 text-[13px] text-land-ink">Contact entrant en septembre, aucune affaire en cours.</p>
        </section>

        <section className="land-step-row border-t border-land-line pt-4" style={d(4)}>
          <div className="flex items-center gap-2.5">
            <CartonnerieLogo size={28} />
            <div className="text-[15px] font-semibold text-land-ink">Cartonnerie du Val</div>
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-land-muted">
            Votre référence client la plus proche · même métier, même montée en charge d&apos;un deuxième site.
          </p>
          <div className="mt-2.5 rounded-xl bg-land-accent-soft px-3.5 py-2.5">
            <Label tone="accent">À dire en call</Label>
            <p className="mt-1 text-[13.5px] leading-relaxed text-land-ink">
              «{NB}La Cartonnerie du Val a ouvert son deuxième site l&apos;an dernier. Ils ont tenu leurs délais clients
              dès le premier mois, sans recruter au planning.{NB}»
            </p>
          </div>
        </section>
      </div>
      <div className="border-t border-land-line px-6 py-3 text-[12px] text-land-faint sm:px-7">
        Exemple au format réel. Entreprises, contact et chiffres fictifs.
      </div>
    </div>
  );
}

// ─── Progresser : l'objection rejoint la bibliothèque ────────────────────────

export function ObjectionObject() {
  return (
    <div className={`overflow-hidden ${SHEET}`}>
      <div className="px-6 pt-6 sm:px-7">
        <div className="text-[17px] font-semibold tracking-tight text-land-ink">Charge de déploiement pour l&apos;équipe</div>
        <div className="mt-1 text-[13px] text-land-muted">
          Catégorie de votre playbook · 9 occurrences ce trimestre · 4 commerciaux
        </div>
        <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          <span className="bg-land-accent" style={{ width: "33%" }} />
          <span className="bg-land-accent/35" style={{ width: "45%" }} />
          <span className="bg-land-line" style={{ width: "22%" }} />
        </div>
        <div className="mt-1.5 flex gap-4 text-[12px] text-land-muted">
          <span>
            <span className="font-medium tabular-nums text-land-accent">3</span> bien traitées
          </span>
          <span>
            <span className="font-medium tabular-nums text-land-ink">4</span> partiellement
          </span>
          <span>
            <span className="font-medium tabular-nums text-land-ink">2</span> sans réponse
          </span>
        </div>
      </div>

      <div className="land-step-row mx-4 mb-4 mt-5 rounded-2xl border border-land-line bg-land-bg px-4 py-4 sm:mx-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-land-ink">
            {/* Commercial fictif, portrait généré par IA. */}
            <Image src="/landing/people/avatar-thomas.jpg" alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
            <span>
              Thomas · Valdor Emballages · <span className="tabular-nums">2{NB}oct.</span>
            </span>
          </span>
          <span className="rounded-full bg-land-warn/12 px-2 py-0.5 text-[11.5px] font-semibold text-land-warn">
            Partiellement traitée
          </span>
        </div>
        <ul className="mt-3 space-y-1.5 text-[13.5px] leading-snug">
          <li className="flex gap-2">
            <span className="w-[4.5rem] shrink-0 text-land-faint">Prospect</span>
            <span className="text-land-ink">Craint qu&apos;une nouvelle intégration surcharge une équipe déjà sous tension.</span>
          </li>
          <li className="flex gap-2">
            <span className="w-[4.5rem] shrink-0 text-land-faint">Thomas</span>
            <span className="text-land-ink">Rassure sur le support, sans chiffrer le temps demandé à l&apos;équipe.</span>
          </li>
        </ul>
        <blockquote className="mt-3 border-l-2 border-land-line pl-3 text-[13px] italic leading-relaxed text-land-muted">
          «{NB}Honnêtement, l&apos;équipe est déjà sous l&apos;eau avec la nouvelle ligne. Une intégration de plus, ça me
          fait peur.{NB}»
        </blockquote>
        <div className="mt-3 rounded-xl bg-land-accent-soft px-3.5 py-3">
          <Label tone="accent">Ce qu&apos;il aurait fallu répondre</Label>
          <p className="mt-1 text-[13.5px] leading-relaxed text-land-ink">
            Chiffrer l&apos;effort{NB}: deux heures de paramétrage, puis rien. Citer la Cartonnerie du Val, déployée en
            10{NB}jours sans ressource interne.
          </p>
        </div>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-land-accent">
          <Play className="h-3.5 w-3.5" aria-hidden />
          <span>
            Revoir l&apos;extrait à <span className="tabular-nums">21:04</span>
          </span>
        </span>
      </div>
      <div className="border-t border-land-line px-6 py-3 text-[12px] text-land-faint sm:px-7">
        Exemple. Catégorie, réponses et chiffres fictifs.
      </div>
    </div>
  );
}

// ─── Managers : le bilan de la semaine ───────────────────────────────────────

export function DigestObject() {
  const sections: [string, string[]][] = [
    [
      "Ce qui a bien fonctionné dans l'équipe",
      [
        "Thomas a obtenu un R3 daté chez Valdor, avec le directeur financier invité.",
        "Julie a bien traité l'objection prix chez Lumen Logistique en chiffrant le retour sur investissement.",
      ],
    ],
    [
      "Points d'attention",
      [
        "« Charge de déploiement » est revenue 3 fois cette semaine, bien traitée une seule fois : sujet du prochain point d'équipe.",
        "Karim laisse peu parler ses prospects en découverte : c'est l'axe d'amélioration de ses trois derniers calls.",
      ],
    ],
    ["À ne pas oublier", ["Envoyer le récapitulatif promis à Valdor avant le R3 du 9 octobre."]],
  ];
  return (
    <figure className="overflow-hidden rounded-[20px] border border-land-line bg-land-bg">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-land-line px-6 py-3.5 text-[13px] sm:px-8">
        <span className="font-medium text-land-ink">Bilan de la semaine · équipe</span>
        <span className="text-land-muted">
          Vendredi <span className="tabular-nums">18:00</span> · exemple
        </span>
      </figcaption>
      <div className="grid grid-cols-1 gap-8 px-6 py-7 sm:px-8 md:grid-cols-3">
        {sections.map(([title, items]) => (
          <section key={title}>
            <div className="text-[15px] font-semibold tracking-tight text-land-ink">{title}</div>
            <ul className="mt-3 space-y-2.5">
              {items.map((t) => (
                <li key={t} className="flex gap-2.5 text-[14px] leading-relaxed text-land-muted">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-land-accent" aria-hidden />
                  <span>{t.replace(/ ([:;?!»%])/g, `${NB}$1`).replace(/« /g, `«${NB}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </figure>
  );
}

export { ContactCard };
