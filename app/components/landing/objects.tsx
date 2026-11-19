import type { ReactNode } from "react";
import Image from "next/image";
import { ValdorLogo, CartonnerieLogo } from "@/app/components/landing/brands";
import { StateChip } from "@/app/mes-deals/deal-ui";
import { Check, Clock, History, MapPin } from "lucide-react";

// Les aperçus produit de la landing. Chacun reprend la STRUCTURE RÉELLE d'un
// écran de Brief — mêmes sections, même ordre, mêmes libellés — mais sur un
// deal fictif : les vrais briefs et analyses portent sur de vrais prospects
// et de vraies conversations, qu'on ne publie pas.
// Repris le 18/11/2026 sur les écrans du 14/11/2026 : plus de note sur 5, plus
// de grille de notation ni de pages Performance ; le fil est celui d'un deal.
//
//   SourcesObject     ↔ le brief d'un R1 (app/brief/[id]/BriefBlocks.tsx),
//                       chaque bloc avec la source que lib/brief-generator.ts
//                       interroge (CRM, presse, annuaire, registre, références)
//   AnalysisObject    ↔ la page d'un meeting en trois questions
//                       (app/feedback/[id]/MeetingOverviewView.tsx)
//   DealObject        ↔ la page d'un deal (app/deal/[dealId]/DealMacroView.tsx)
//   FollowUpObject    ↔ ce qui suit un rendez-vous : email de suivi rédigé,
//                       propriétés HubSpot mises à jour, engagements
//   DigestObject      ↔ le bilan hebdomadaire manager (lib/admin-config.ts)
//
// Le fil : Thomas Lefèvre (commercial) suit le deal Valdor Emballages avec
// Claire Mercier, directrice des opérations. R1 de découverte le jeudi
// 18 septembre, R2 de présentation le jeudi 2 octobre à 14:30, R3 prévu le
// jeudi 9 octobre à 10:00 avec Hugo Ravel, directeur financier.

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


// ─── Pièces communes ─────────────────────────────────────────────────────────

function ContactCard({ compact = false }: { compact?: boolean }) {
  // Plus de badge « Décisionnaire » : retiré du brief le 14/11/2026.
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
      <ul className="mt-3 space-y-1.5 text-[12.5px] text-land-muted">
        <li className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-land-faint" aria-hidden /> Angers
        </li>
        <li className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-land-faint" aria-hidden /> En poste depuis 4{NB}ans
        </li>
        {!compact && (
          <li className="flex items-start gap-2">
            <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-land-faint" aria-hidden />
            <span className="leading-snug">Auparavant responsable de production chez Cartonnages Rivière</span>
          </li>
        )}
      </ul>
    </div>
  );
}

/** En-tête commun d'un rendez-vous : le même bandeau relie le brief et
 * l'analyse, comme dans l'app. */
export function MeetingHeader({ status, when }: { status: ReactNode; when: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-land-line px-5 py-3.5 sm:px-7">
      <div className="flex items-center gap-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-land-accent text-[11px] font-semibold text-land-accent-ink">
          B
        </span>
        {status}
      </div>
      <span className="whitespace-nowrap text-[13px] tabular-nums text-land-muted">{when}</span>
    </div>
  );
}

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

// ─── Préparer : le brief d'un premier rendez-vous, chaque bloc avec sa source ─
// Structure du brief R1 du 14/11/2026 : contexte du rendez-vous (origine lue
// dans le CRM ou saisie), accroche, enjeux à explorer (hypothèse + question),
// références et preuves commerciales avec leur niveau ; à droite le contact
// et l'entreprise en quatre lignes.

const STAKES: { title: string; context: string; question: string }[] = [
  {
    title: "Montée en charge de la nouvelle ligne",
    context: "Doubler la capacité sans doubler l'équipe planning crée souvent des ruptures les premiers mois.",
    question: "Qui pilote la montée en charge, et avec quels outils ?",
  },
  {
    title: "Preuves de recyclabilité demandées",
    context: "Les marques de cosmétique réclament des justificatifs pour leurs propres déclarations.",
    question: "Comment y répondez-vous aujourd'hui, et en combien de temps ?",
  },
];

const COMPANY_ROWS: [string, string][] = [
  ["Activité", "Emballages en carton ondulé, site historique d'Angers."],
  ["Clients", "Agroalimentaire et cosmétique."],
  ["Chiffres clés", `21${NB}M€ de revenus · 140${NB}personnes`],
  ["Actualité", `6${NB}M€ investis dans une deuxième ligne à Angers.`],
];

const q = (s: string) => s.replace(/ \?/g, `${NB}?`);

export function SourcesObject() {
  return (
    <div className={`overflow-hidden ${SHEET}`}>
      <MeetingHeader
        when={`Jeu. 18${NB}sept. · 11:00 · 30${NB}min`}
        status={
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-land-ink">
            <Check className="h-3.5 w-3.5 text-land-accent" aria-hidden />
            Brief prêt la veille à 18:00
          </span>
        }
      />
      <div className="space-y-4 px-6 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <ValdorLogo size={36} />
          <div className="text-[19px] font-semibold tracking-[-0.02em] text-land-ink">Découverte Valdor Emballages</div>
        </div>

        <div className="rounded-2xl bg-land-sunken px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label>Contexte du rendez-vous</Label>
            <span className="rounded-md bg-land-accent px-1.5 py-0.5 text-[11.5px] font-bold text-white">R1</span>
            <span className="rounded-full bg-land-surface px-2.5 py-0.5 text-[12px] text-land-ink">Origine{NB}: salon ou événement</span>
            <span className="ml-auto">
              <Source i={0}>Votre CRM</Source>
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-snug text-land-ink">
            Claire a demandé une démonstration après un échange sur votre stand, début septembre.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="space-y-4">
            <section className="rounded-2xl bg-land-accent-soft px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <Label tone="accent">Accroche</Label>
                <Source i={1}>Presse régionale, 2{NB}sept.</Source>
              </div>
              <p className="mt-1.5 text-[14px] font-medium leading-snug text-land-ink">
                «{NB}Claire, vous ouvrez une deuxième ligne à Angers. Quand le volume double, comment gardez-vous la main
                sur les approvisionnements et les délais clients{NB}?{NB}»
              </p>
            </section>
            <section>
              <BlockHead label="Enjeux à explorer" source="Offre d'emploi, 12 sept." i={2} />
              <ol className="mt-1 divide-y divide-land-line">
                {STAKES.map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-2 py-2.5 last:pb-0">
                    <span className="pt-0.5 text-[12px] font-bold tabular-nums text-land-accent">0{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold leading-snug text-land-ink">{s.title}</div>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-land-muted">{s.context}</p>
                      <p className="mt-1 text-[12.5px] font-medium leading-snug text-land-ink">«{NB}{q(s.question)}{NB}»</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="space-y-4">
            <section>
              <BlockHead label="Contact" source="Annuaire pro" i={3} />
              <div className="mt-2.5">
                <ContactCard compact />
              </div>
            </section>
            <section className="border-t border-land-line pt-4">
              <BlockHead label="Entreprise" source="Registre officiel" i={4} />
              <dl className="mt-2 space-y-2">
                {COMPANY_ROWS.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11.5px] text-land-faint">{k}</dt>
                    <dd className="text-[12.5px] leading-snug text-land-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>

        {/* Références de toute l'équipe (lib/brief-generator.ts) : deux au
            plus, chacune avec son niveau — preuve de ROI, cas d'usage ou
            référence simple — et la phrase « À dire ». */}
        <section className="land-step-row border-t border-land-line pt-4" style={d(5)}>
          <BlockHead label="Références et preuves commerciales" source="Vos cas clients" i={5} />
          <div className="mt-3 rounded-2xl border border-land-line bg-land-bg p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CartonnerieLogo size={28} />
                <div className="text-[15px] font-semibold text-land-ink">Cartonnerie du Val</div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">Preuve de ROI</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-land-muted">
              Même métier, même clientèle agroalimentaire, même montée en charge d&apos;un deuxième site.
            </p>
            <div className="mt-2.5 rounded-xl bg-emerald-50 px-3.5 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">À dire</div>
              <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-land-ink">
                «{NB}La Cartonnerie du Val a ouvert son deuxième site l&apos;an dernier. Ils ont tenu leurs délais clients
                dès le premier mois, sans recruter au planning.{NB}»
              </p>
            </div>
          </div>
        </section>
      </div>
      <div className="border-t border-land-line px-6 py-3 text-[12px] text-land-faint sm:px-7">
        Exemple au format réel. Entreprises, contact et chiffres fictifs.
      </div>
    </div>
  );
}

// ─── Progresser : la page d'un deal ──────────────────────────────────────────
// Reprend DealMacroView (14/11/2026) : en-tête et boutons de clôture, une
// seule Priorité Brief, les engagements en deux listes, puis à droite l'état
// du deal et sa raison, l'étape et le montant avec leur source, le prochain
// rendez-vous et l'état du deal en huit lignes.

const COMMITMENT_TONES = {
  Fait: "bg-emerald-50 text-emerald-700",
  "À faire": "bg-amber-50 text-amber-700",
  "En attente": "bg-slate-100 text-slate-600",
} as const;

const OURS: { text: string; when: string; status: keyof typeof COMMITMENT_TONES }[] = [
  { text: "Envoyer le récapitulatif du R2", when: "2 oct.", status: "Fait" },
  { text: "Envoyer l'exemple de déploiement de la Cartonnerie du Val", when: "avant le 7 oct.", status: "À faire" },
];
const THEIRS: { text: string; when: string; status: keyof typeof COMMITMENT_TONES }[] = [
  { text: "Inviter Hugo Ravel, directeur financier, au R3", when: "9 oct.", status: "En attente" },
];

const CRITERION_TONES = {
  Confirmé: "bg-emerald-50 text-emerald-700",
  "À préciser": "bg-amber-50 text-amber-700",
  Inconnu: "bg-slate-100 text-slate-500",
} as const;

// Les huit lignes de l'état d'un deal (MACRO_ROWS de lib/deal-macro.ts).
const DEAL_STATE: [string, keyof typeof CRITERION_TONES][] = [
  ["Douleur", "Confirmé"],
  ["Impact", "Confirmé"],
  ["Budget", "À préciser"],
  ["Décideur", "À préciser"],
  ["Allié chez le client", "Confirmé"],
  ["Process de décision", "Inconnu"],
  ["Critères de décision", "Confirmé"],
  ["Échéance", "À préciser"],
];

function CommitmentList({ title, items }: { title: string; items: typeof OURS }) {
  return (
    <div className="mt-3">
      <div className="text-[13px] font-semibold text-land-ink">{title}</div>
      <ul className="mt-1 divide-y divide-land-line">
        {items.map((c) => (
          <li key={c.text} className="flex items-start gap-2.5 py-2">
            <span
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border-2 ${
                c.status === "Fait" ? "border-land-accent bg-land-accent text-white" : "border-land-line"
              }`}
              aria-hidden
            >
              {c.status === "Fait" && <Check className="h-3 w-3" />}
            </span>
            <span className={`min-w-0 flex-1 text-[13px] leading-snug ${c.status === "Fait" ? "text-land-faint line-through" : "text-land-ink"}`}>
              {c.text} <span className="inline-block whitespace-nowrap text-land-faint">· {c.when}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${COMMITMENT_TONES[c.status]}`}>{c.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 text-[13.5px] font-semibold leading-snug text-land-ink">{children}</div>
    </div>
  );
}

function From({ children }: { children: ReactNode }) {
  return <span className="ml-1.5 rounded-md bg-land-sunken px-1.5 py-0.5 text-[11px] font-medium text-land-muted">{children}</span>;
}

export function DealObject() {
  const confirmed = DEAL_STATE.filter(([, s]) => s === "Confirmé").length;
  return (
    <div className={`overflow-hidden ${SHEET}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-land-line px-6 py-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <ValdorLogo size={38} />
          <div className="min-w-0">
            <div className="truncate text-[18px] font-semibold tracking-[-0.02em] text-land-ink">Valdor Emballages</div>
            <div className="text-[12.5px] text-land-muted">Suivi par Thomas · 2 rendez-vous</div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5" aria-hidden>
          {["Gagné", "Perdu", "Abandonné"].map((b) => (
            <span key={b} className="inline-flex h-8 items-center rounded-lg border border-land-line bg-land-surface px-2.5 text-[12.5px] font-medium text-land-ink">
              {b}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)] sm:px-5">
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl bg-land-surface px-4 py-3.5 ring-2 ring-land-accent">
            <Label tone="accent">Priorité Brief</Label>
            <div className="mt-1 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-land-ink">
              Faire valider le budget par le directeur financier avant le R3
            </div>
            <dl className="mt-2.5 space-y-2 text-[13px] leading-snug">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-land-faint">Pourquoi maintenant</dt>
                <dd className="mt-0.5 text-land-muted">Hugo Ravel entre dans la décision jeudi, et le budget n&apos;a été évoqué qu&apos;à l&apos;oral.</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-land-faint">Comment</dt>
                <dd className="mt-0.5 text-land-ink">Lui envoyer le chiffrage avec l&apos;exemple de la Cartonnerie du Val avant mardi.</dd>
              </div>
            </dl>
          </section>

          <section className="land-step-row rounded-2xl border border-land-line px-4 py-3.5" style={d(0)}>
            <Label tone="accent">Actions et engagements</Label>
            <div className="mt-0.5 text-[14px] font-semibold text-land-ink">Qui doit faire quoi, pour quand</div>
            <CommitmentList title="À faire de notre côté" items={OURS} />
            <CommitmentList title="Attendu du prospect" items={THEIRS} />
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="space-y-3 rounded-2xl border border-land-line px-4 py-3.5">
            <div>
              <Label>État</Label>
              <div className="mt-1.5">
                <StateChip state="progres" />
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-land-muted">Deux rendez-vous en trois semaines, un R3 daté.</p>
            </div>
            <Fact label="Étape">
              R2 · Présentation<From>HubSpot</From>
            </Fact>
            <Fact label="Montant">
              40{NB}000{NB}€<From>Dit en rendez-vous, à confirmer</From>
            </Fact>
            <Fact label="Prochain rendez-vous">Jeudi 9 octobre, 10:00</Fact>
          </section>

          <section className="land-step-row rounded-2xl border border-land-line px-4 py-3.5" style={d(1)}>
            <div className="text-[14px] font-semibold text-land-ink">
              État du deal <span className="text-[12.5px] font-medium text-land-muted">· {confirmed} sur {DEAL_STATE.length}</span>
            </div>
            <ul className="mt-1.5 divide-y divide-land-line">
              {DEAL_STATE.map(([label, status]) => (
                <li key={label} className="flex items-center justify-between gap-2 py-1.5 text-[12.5px]">
                  <span className="truncate text-land-ink">{label}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${CRITERION_TONES[status]}`}>{status}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
      <div className="border-t border-land-line px-6 py-3 text-[12px] text-land-faint sm:px-7">
        Exemple au format réel de la page d&apos;un deal. Deal, montant et personnes fictifs.
      </div>
    </div>
  );
}

// ─── Suivi et exécution : ce que Brief prépare après le rendez-vous ──────────
// Troisième bénéfice de la page Commerciaux (cadrage GTM du 19/11/2026) :
// l'email de suivi rédigé, prêt à relire (app/feedback/[id], onglet « Email de
// suivi »), les propriétés du deal mises à jour dans HubSpot
// (lib/hubspot-autofill-run.ts) et les engagements des deux parties, tels que
// la page du deal les suit. Même rendez-vous que l'analyse : le R2 Valdor.

const FOLLOW_UP_LINES = [
  "Je vous envoie le récapitulatif et l'exemple de déploiement de la Cartonnerie du Val d'ici mardi.",
  "Vous invitez Hugo Ravel au rendez-vous du jeudi 9 octobre, à 10:00.",
];

const CRM_ROWS: [string, string][] = [
  ["Étape", "Présentation"],
  ["Montant", `40${NB}000${NB}€`],
  ["Prochain rendez-vous", `9${NB}oct.`],
];

const FOLLOW_UP_COMMITMENTS: { who: string; text: string; when: string; done?: boolean }[] = [
  { who: "Thomas", text: "Envoyer le récapitulatif du R2", when: `2${NB}oct.`, done: true },
  { who: "Thomas", text: "Envoyer l'exemple de déploiement", when: `7${NB}oct.` },
  { who: "Claire", text: "Inviter Hugo Ravel au R3", when: `9${NB}oct.` },
];

export function FollowUpObject() {
  return (
    <div className={`overflow-hidden ${SHEET}`}>
      <MeetingHeader
        when={`Jeu. 2${NB}oct. · 15:20`}
        status={<span className="text-[13px] font-medium text-land-ink">Après le rendez-vous · Valdor Emballages</span>}
      />
      <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)] sm:px-5">
        <section className="rounded-2xl border border-land-line px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <Label tone="accent">Email de suivi</Label>
            <span className="rounded-full bg-land-accent-soft px-2 py-0.5 text-[11.5px] font-semibold text-land-accent">Prêt à relire</span>
          </div>
          <dl className="mt-2.5 space-y-1 border-b border-land-line pb-2.5 text-[12.5px]">
            <div className="flex gap-2">
              <dt className="text-land-faint">À{NB}:</dt>
              <dd className="text-land-ink">Claire Mercier</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-land-faint">Objet{NB}:</dt>
              <dd className="text-land-ink">Suite à notre échange, prochaines étapes</dd>
            </div>
          </dl>
          <div className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-land-ink">
            <p>Bonjour Claire,</p>
            <p>Merci pour notre échange d&apos;aujourd&apos;hui. Comme convenu{NB}:</p>
            <ul className="space-y-1.5">
              {FOLLOW_UP_LINES.map((t, i) => (
                <li key={t} className="land-step-row flex gap-2" style={d(i)}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-land-accent" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p>N&apos;hésitez pas si vous avez la moindre question.</p>
            <p className="text-land-muted">Bien cordialement, Thomas</p>
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="land-step-row rounded-2xl border border-land-line px-4 py-3.5" style={d(2)}>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-land-ink">
                <Image src="/landing/stack/hubspot.svg" alt="" width={18} height={18} unoptimized className="h-[18px] w-[18px]" />
                HubSpot
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">
                <Check className="h-3 w-3" aria-hidden /> Mis à jour
              </span>
            </div>
            <dl className="mt-2.5 space-y-1.5 text-[12.5px]">
              {CRM_ROWS.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-land-muted">{k}</dt>
                  <dd className="font-semibold tabular-nums text-land-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="land-step-row rounded-2xl border border-land-line px-4 py-3.5" style={d(3)}>
            <div className="text-[14px] font-semibold text-land-ink">Engagements</div>
            <ul className="mt-1.5 divide-y divide-land-line">
              {FOLLOW_UP_COMMITMENTS.map((c) => (
                <li key={c.text} className="flex items-start gap-2 py-2 text-[12.5px] leading-snug">
                  <span
                    className={`mt-px grid h-4 w-4 shrink-0 place-items-center rounded border-2 ${
                      c.done ? "border-land-accent bg-land-accent text-white" : "border-land-line"
                    }`}
                    aria-hidden
                  >
                    {c.done && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1 text-land-ink">
                    <span className="font-semibold">{c.who}</span> · {c.text}
                  </span>
                  <span className="shrink-0 tabular-nums text-land-faint">{c.when}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
      <div className="border-t border-land-line px-6 py-3 text-[12px] text-land-faint sm:px-7">
        Exemple. Email, deal et personnes fictifs.
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
