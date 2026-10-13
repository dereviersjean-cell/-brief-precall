import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarCheck,
  Check,
  ChevronRight,
  Layers,
  ListChecks,
  Mail,
  Mic,
  MousePointer2,
} from "lucide-react";
import { SALES_CONTACT } from "@/lib/sales-contact";
import { ValdorLogo } from "./brands";
import { NB } from "./team-data";

// « D'abord l'outil, ensuite on vous accompagne » (12/10/2026), sur le modèle
// de la section « 4 leviers » d'uptoo.fr : une grille 2 × 2, chaque levier
// illustré sur un aplat pastel, puis le parcours.
// L'outil (briefs, analyse et suivi des calls) est la porte d'entrée ; le
// reste se déploie avec un expert, un point par semaine — c'est le parcours
// réel de lib/parcours.ts (huit semaines, une brique ouverte par semaine).
// Les tâches n'y figurent pas : le module est masqué sur la landing.
// Aucun chiffre de résultat : Brief n'en a pas de mesuré à montrer.

export const PARCOURS = [
  { week: 0, title: "Mise en route" },
  { week: 1, title: "Briefs" },
  { week: 2, title: "Analyse des calls" },
  { week: 3, title: "Playbook" },
  { week: 4, title: "Emails de suivi" },
  { week: 5, title: "Objections" },
  { week: 6, title: "CRM" },
  { week: 7, title: "Entraînement" },
  { week: 8, title: "Vue manager et bilan" },
];
export const TOOL_WEEKS = 3; // semaines 0 à 2 : l'outil seul

const CONFIG_ROWS: { label: string; value: string; logos?: string[] }[] = [
  { label: "Grille de notation", value: "Votre méthode, vos poids, vos questions" },
  { label: "Étapes du cycle", value: "R1 · R2 · R3, reconnues à vos titres de rendez-vous" },
  { label: "Objections", value: "Vos catégories, vos réponses de référence" },
  { label: "Emails de suivi", value: "Dans le ton de l'équipe" },
  { label: "Où tout arrive", value: "CRM, Slack, email, agenda", logos: ["hubspot", "slack", "gmail"] },
];

function Lever({
  tone,
  tag,
  title,
  body,
  href,
  external,
  children,
}: {
  tone: string;
  tag: string;
  title: string;
  body: string;
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const link = (
    <>
      En savoir plus <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </>
  );
  return (
    <li>
      <div className={`relative h-[300px] overflow-hidden rounded-[24px] ${tone} sm:h-[340px]`}>{children}</div>
      <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <h3 className="text-[21px] font-semibold tracking-tight text-land-ink">{title}</h3>
        <span className="whitespace-nowrap rounded-full bg-land-sunken px-2.5 py-0.5 text-[12px] font-medium text-land-muted">{tag}</span>
      </div>
      <p className="mt-2 max-w-[54ch] text-[15.5px] leading-relaxed text-land-muted">{body}</p>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="group mt-3 inline-flex items-center gap-1 text-[15px] font-medium text-land-ink hover:text-land-accent">
          {link}
        </a>
      ) : (
        <a href={href} className="group mt-3 inline-flex items-center gap-1 text-[15px] font-medium text-land-ink hover:text-land-accent">
          {link}
        </a>
      )}
    </li>
  );
}

/** Petite carte d'interface posée sur l'aplat. */
function Chip({ icon, title, sub, className = "" }: { icon: React.ReactNode; title: string; sub: string; className?: string }) {
  return (
    <div className={`absolute flex items-center gap-3 rounded-2xl bg-land-surface px-3.5 py-3 shadow-[var(--land-shadow)] ${className}`}>
      {icon}
      <div className="min-w-0">
        <div className="whitespace-nowrap text-[13.5px] font-semibold text-land-ink">{title}</div>
        <div className="whitespace-nowrap text-[12px] text-land-muted">{sub}</div>
      </div>
    </div>
  );
}

/** Curseur nommé, comme sur une maquette partagée. */
function Cursor({ label, className = "", dark = true }: { label: string; className?: string; dark?: boolean }) {
  return (
    <div className={`absolute flex items-start gap-1 ${className}`} aria-hidden>
      <MousePointer2 className={`h-4 w-4 ${dark ? "fill-land-ink text-land-ink" : "fill-land-accent text-land-accent"}`} />
      <span className={`mt-3 whitespace-nowrap rounded-md px-2 py-1 text-[11.5px] font-medium text-white ${dark ? "bg-land-ink" : "bg-land-accent"}`}>
        {label}
      </span>
    </div>
  );
}

export function Accompaniment() {
  return (
    <section id="accompagnement" className="scroll-mt-20 border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 className="max-w-[22ch] text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] md:text-[52px] lg:text-[60px]">
          <span className="text-land-ink">D&apos;abord l&apos;outil.</span>{" "}
          <span className="text-land-faint">Ensuite, on structure votre équipe et on configure Brief pour elle.</span>
        </h2>
        <p className="mt-6 max-w-[60ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Vos commerciaux commencent par ce qui sert dès la première semaine : les briefs, l&apos;analyse et le suivi
          des calls. Ensuite, un expert de l&apos;équipe Brief vous accompagne, un point chaque semaine : il structure avec
          vous votre organisation commerciale et configure Brief autour de vos besoins, de votre méthode de vente aux
          outils de l&apos;équipe. Une brique à la fois, au rythme de l&apos;équipe.
        </p>

        <ul className="mt-14 grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:mt-16">
          {/* 1. Le produit d'appel */}
          <Lever
            tone="bg-land-accent-soft"
            tag="Dès la semaine 1"
            title="Équipez vos commerciaux"
            body="Un brief prêt la veille de chaque rendez-vous, chaque visio enregistrée et notée sur votre grille, l'historique de chaque prospect. Gratuit pour commencer, sans carte bancaire."
            href="/produit#methode"
          >
            <Chip
              className="left-[8%] top-[14%]"
              icon={<ValdorLogo size={34} />}
              title="Brief prêt · Valdor Emballages"
              sub={`Jeu. 2${NB}oct. · 14:30`}
            />
            <Chip
              className="right-[7%] top-[42%]"
              icon={
                <span className="grid h-9 w-9 place-items-center rounded-full bg-land-coral text-white">
                  <Mic className="h-4 w-4" aria-hidden />
                </span>
              }
              title={`Call noté 3,4${NB}/${NB}5`}
              sub="R2 Présentation · votre grille"
            />
            <Chip
              className="bottom-[12%] left-[14%]"
              icon={
                <span className="grid h-9 w-9 place-items-center rounded-full bg-land-accent text-white">
                  <Bot className="h-4 w-4" aria-hidden />
                </span>
              }
              title="Bot programmé"
              sub="Prochaine visio · Google Meet"
            />
          </Lever>

          {/* 2. Le coaching */}
          <Lever
            tone="bg-land-coral-soft"
            tag="Avec votre expert"
            title="Coachez vos équipes"
            body="Chaque semaine, votre expert prépare le point à partir des vrais calls de l'équipe : le call exemplaire à réécouter, les objections qui résistent, puis l'entraînement de vos commerciaux sur ces objections-là."
            href={SALES_CONTACT.bookingUrl}
            external
          >
            <div className="absolute inset-y-6 left-6 right-[22%] overflow-hidden rounded-[18px] sm:inset-y-8 sm:left-8">
              <Image src="/landing/people/coaching.jpg" alt="" fill sizes="(min-width: 768px) 30vw, 80vw" className="object-cover" />
            </div>
            <div className="absolute bottom-8 right-5 w-[220px] rounded-2xl bg-land-surface p-4 shadow-[var(--land-shadow)] sm:right-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-land-coral-ink">Point de la semaine</div>
              <div className="mt-1 text-[14px] font-semibold text-land-ink">Semaine 5 · Objections</div>
              <ul className="mt-2.5 space-y-1.5 text-[12.5px] text-land-muted">
                {["Call exemplaire à réécouter", "3 objections qui résistent", "Réponses écrites ensemble"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-land-coral-ink" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </Lever>

          {/* 3. La méthode */}
          <Lever
            tone="bg-land-sun-soft"
            tag="Avec votre expert"
            title="Structurez votre méthode"
            body="Votre expert construit avec vous la grille de l'équipe et les consignes de chaque étape R1, R2, R3, puis installe les rituels : le point hebdomadaire, le bilan du vendredi, les réponses de référence aux objections."
            href="/produit#manager"
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex flex-col items-center gap-3">
                <span className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-land-ink/15" aria-hidden />
                {[
                  { icon: ListChecks, label: "Grille de l'équipe" },
                  { icon: Layers, label: "Étapes R1 · R2 · R3" },
                  { icon: CalendarCheck, label: "Point hebdomadaire" },
                  { icon: Mail, label: "Bilan du vendredi" },
                ].map((st) => (
                  <div key={st.label} className="relative flex items-center gap-3 rounded-xl bg-land-surface py-2 pl-2 pr-4 shadow-[var(--land-shadow)]">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-land-sun-soft text-land-sun-ink">
                      <st.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="whitespace-nowrap text-[13px] font-medium text-land-ink">{st.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <Cursor label="Votre expert" className="left-[10%] top-[18%] sm:left-[14%]" />
            <Cursor label="Directeur commercial" dark={false} className="bottom-[5%] right-[5%] sm:right-[8%]" />
          </Lever>

          {/* 4. La configuration : Brief adapté à l'équipe. « Configuré pour votre
              équipe », jamais « développé pour vous » (règle du parcours). Tout ce
              qui est listé est réellement réglable par client : grille et étapes
              (Playbook), catégories d'objections, style des emails de suivi,
              canaux d'envoi (préférences de notification), modules ouverts. */}
          <Lever
            tone="bg-land-lilac-soft"
            tag="Avec votre expert"
            title="Configurez Brief pour votre équipe"
            body="Votre expert règle Brief avec vous, à partir de vos besoins : votre grille et vos étapes, vos catégories d'objections, le ton de vos emails de suivi, les outils où tout doit arriver. Au bout de huit semaines, on fait le bilan et on décide ensemble du rythme de suivi."
            href={SALES_CONTACT.bookingUrl}
            external
          >
            <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-2xl bg-land-surface p-4 shadow-[var(--land-shadow)] sm:inset-x-10">
              <div className="flex items-center justify-between border-b border-land-line pb-2">
                <span className="text-[13px] font-semibold text-land-ink">Brief, configuré pour votre équipe</span>
                <span className="text-[11.5px] text-land-faint">Réglages</span>
              </div>
              <ul className="mt-1 divide-y divide-land-line">
                {CONFIG_ROWS.map((r) => (
                  <li key={r.label} className="flex items-center gap-3 py-1.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-land-ink">{r.label}</span>
                      <span className="hidden truncate text-[11.5px] text-land-muted sm:block">{r.value}</span>
                    </span>
                    {r.logos ? (
                      <span className="flex shrink-0 gap-1">
                        {r.logos.map((f) => (
                          <span key={f} className="grid h-7 w-7 place-items-center rounded-md border border-land-line">
                            <Image src={`/landing/stack/${f}.svg`} alt="" width={15} height={15} unoptimized className="h-[15px] w-[15px]" />
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="relative h-5 w-9 shrink-0 rounded-full bg-land-accent" aria-hidden>
                        <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Lever>
        </ul>

        {/* Le parcours, semaine par semaine */}
        <div className="mt-20 rounded-[24px] border border-land-line bg-land-surface p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[20px] font-semibold tracking-tight text-land-ink">Le parcours, semaine après semaine</div>
              <div className="mt-1 text-[14.5px] text-land-muted">Une brique ouverte par semaine, au rythme de votre équipe.</div>
            </div>
            <div className="flex flex-wrap gap-4 text-[12.5px] text-land-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-land-accent" /> L&apos;outil
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-land-coral" /> Avec votre expert
              </span>
            </div>
          </div>
          <div className="mt-7 overflow-x-auto pb-2">
            <ol className="relative grid min-w-[760px] grid-cols-9 gap-2">
              <span className="absolute left-[5.5%] right-[5.5%] top-[15px] h-0.5 bg-land-line" aria-hidden />
              {PARCOURS.map((p) => {
                const tool = p.week < TOOL_WEEKS;
                return (
                  <li key={p.week} className="relative flex flex-col items-center text-center">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold text-white ring-4 ring-land-surface ${
                        tool ? "bg-land-accent" : "bg-land-coral"
                      }`}
                    >
                      S{p.week}
                    </span>
                    <span className="mt-2.5 text-[12.5px] font-medium leading-snug text-land-ink">{p.title}</span>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="mt-7 flex flex-wrap gap-3 border-t border-land-line pt-6">
            <a
              href={SALES_CONTACT.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-land-accent px-5 text-[15px] font-medium text-white transition-[filter] hover:brightness-110"
            >
              Parler à un expert <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-land-line px-5 text-[15px] font-medium text-land-ink transition-colors hover:bg-land-sunken"
            >
              Commencer par l&apos;outil <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
