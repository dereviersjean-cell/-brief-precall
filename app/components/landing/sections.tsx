// Sections de la landing, partagées par l'accueil et les pages Produit,
// Accompagnement et Intégrations (site découpé en pages le 12/10/2026, à la
// manière de lemlist, PayFit ou uptoo). Chaque page n'assemble que ce dont
// elle a besoin ; l'habillage commun (barre, pied de page, police) est dans
// SiteChrome.tsx.
import Link from "next/link";
import Image from "next/image";
import { SALES_CONTACT, BRIEFS_ACCESS_DAILY_LIMIT } from "@/lib/sales-contact";
import { Journey, type JourneyStep } from "@/app/components/landing/Journey";
import { AnalysisObject } from "@/app/components/landing/AnalysisObject";
import { ClientLogos, HERO_INK } from "@/app/components/landing/ClientLogos";
import { MethodPreview } from "@/app/components/landing/MethodPreview";
import { DealsBoard } from "@/app/components/landing/DealsBoard";
import { UpcomingMeetings } from "@/app/components/landing/UpcomingMeetings";
import { SourcesObject, DealObject, MethodObject, DigestObject } from "@/app/components/landing/objects";
import { PARCOURS, TOOL_WEEKS } from "@/app/components/landing/Accompaniment";
import { NB } from "@/app/components/landing/team-data";
import { TestimonialCarousel, CompanyMark } from "@/app/components/landing/TestimonialCarousel";
import { FEATURED, CARDS, visibleTestimonials } from "@/app/components/landing/testimonials-data";
import { ArrowRight, ArrowUpRight, Check, ShieldCheck, Globe2, Mic, Plus, Mail, ListChecks, Hourglass, TrendingUp, CalendarClock, Bot, Lock, Server, EyeOff, Trash2 } from "lucide-react";

// Titres de section en deux tons : l'affirmation en encre, la suite en gris.
// C'est la seule hiérarchie dont ils ont besoin — pas de surtitre.
export const H2 = "text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] md:text-[52px] lg:text-[60px]";

// ─── Haut de page ────────────────────────────────────────────────────────────

// Haut de page illustré, sur le modèle de lemlist et Clay (demande de Jean du
// 12/10/2026, après une photo d'équipe jugée trop banale) : une scène en 3D
// qui raconte le produit — un chemin qui relie les trois moments (le dossier,
// le micro de la visio, le podium) — et qui se fond en bas dans un aplat
// d'encre bleue où se posent le titre (à gauche) et l'accroche avec les
// boutons (à droite). Juste en dessous, la séquence animée des trois moments
// (MethodSection), celle de la page Produit : c'est l'animation que Jean veut
// sur l'accueil (12/10/2026), pas le brief qui s'écrit.

export function Hero() {
  return (
    <section aria-label="Présentation">
        <div className="px-2 pt-2 sm:px-3 sm:pt-3">
          <div
            className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[24px] text-white sm:rounded-[32px]"
            style={{ backgroundColor: HERO_INK }}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/8] lg:aspect-auto lg:h-[min(38vh,380px)]">
              <Image
                src="/landing/hero-scene.jpg"
                alt=""
                fill
                priority
                sizes="(min-width: 1400px) 1400px, 100vw"
                className="land-hero-art object-cover object-[50%_35%]"
              />
              {/* L'illustration se fond dans l'aplat : pas de couture. */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-2/5"
                style={{ backgroundImage: `linear-gradient(180deg, transparent, ${HERO_INK})` }}
              />
            </div>
            <div className="relative -mt-10 grid grid-cols-1 gap-6 px-5 sm:px-10 md:-mt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:px-16">
              <h1
                className="land-hero-text max-w-[15ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[56px] lg:text-[64px]"
                style={{ "--i": 0 } as React.CSSProperties}
              >
                {/* Sur le modèle de PayFit (« Paie, admin, RH : nos experts
                    assurent, vous décidez ») : ce qu'on prend en charge, puis
                    ce qui reste au commercial. Choix de Jean, 12/10/2026. */}
                Briefs, débriefs, coaching :{" "}
                <span className="text-white/70">on s&apos;en charge,</span>{" "}
                <span className="text-land-sun">vous closez.</span>
              </h1>
              <div className="land-hero-text lg:pb-2" style={{ "--i": 1 } as React.CSSProperties}>
                <p className="max-w-[34rem] text-[18px] leading-relaxed text-white/90 sm:text-[19px]">
                  La plateforme qui structure votre équipe commerciale autour de votre méthode : chaque rendez-vous
                  préparé, chaque call débriefé, chaque deal suivi jusqu&apos;à la signature.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href="/inscription"
                    className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-6 text-[16px] font-semibold text-land-ink transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Essayer gratuitement <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#methode"
                    className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/35 px-6 text-[16px] font-medium text-white transition-[background-color,transform] hover:bg-white/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Voir les 4 leviers <ArrowRight className="h-4 w-4 rotate-90" />
                  </a>
                </div>
              </div>
            </div>
            <ClientLogos className="px-5 pb-10 pt-10 sm:px-10 lg:px-16 lg:pb-12 lg:pt-10" />
          </div>
        </div>
    </section>
  );
}


// ─── La semaine de l'équipe ──────────────────────────────────────────────────
// Ce qui arrive (rendez-vous à venir, brief prêt, bot programmé) : la liste
// que le commercial ouvre chaque jour (demande de Jean, 12/10/2026).

export function WeekSection() {
  return (
    <section id="rendez-vous" className="scroll-mt-20 border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 className={`${H2} max-w-[19ch]`}>
          <span className="text-land-ink">Vos prochains rendez-vous, déjà préparés.</span>{" "}
          <span className="text-land-faint">Le brief est prêt la veille.</span>
        </h2>
        <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Brief lit votre agenda Google ou Outlook. Chaque rendez-vous avec un prospect a son brief prêt la veille à 18:00,
          aussi déposé dans l&apos;événement d&apos;agenda ; un rendez-vous ajouté à la main se prépare en un clic. Les
          réunions internes sont reconnues à leur titre : ni brief, ni enregistrement.
        </p>
        <div className="mt-14 lg:mt-16">
          <UpcomingMeetings />
        </div>
      </div>
    </section>
  );
}

// ─── Votre équipe ────────────────────────────────────────────────────────────
// La section du directeur commercial. Depuis le 18/11/2026 elle montre
// « Suivi des deals » (les deals de ses commerciaux qui demandent son
// intervention) à la place du tableau de bord Performance et de la fiche par
// commercial notée sur 5, retirés de l'app le 05/11/2026.

const TEAM_POINTS = [
  {
    icon: ListChecks,
    title: "Ce qui remonte, dans l'ordre",
    body: "Un deal qui se dégrade, un engagement non tenu, un blocage : une carte par deal, le plus urgent en premier.",
  },
  {
    icon: Hourglass,
    title: "Les deals endormis, à part",
    body: "14 jours sans échange, 7 quand le deal est en proposition : à relancer ou à clôturer, sans encombrer le reste.",
  },
  {
    icon: TrendingUp,
    title: "Une prévision fondée sur les calls",
    body: "Ce que HubSpot compte d'après l'étape, ce que les calls confirment, et l'écart, commercial par commercial.",
  },
];


export function TeamSection() {
  return (
    <section id="equipe" className="scroll-mt-20 border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 className={`${H2} max-w-[19ch]`}>
          <span className="text-land-ink">Voyez quels deals demandent votre intervention.</span>{" "}
          <span className="text-land-faint">Le problème, l&apos;action, la question à poser.</span>
        </h2>
        <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Brief suit les deals de vos commerciaux à partir de leurs calls. Il fait remonter ceux qui se dégradent, ceux
          où un engagement n&apos;a pas été tenu et ceux qui restent bloqués, avec l&apos;action recommandée et la question
          à poser au commercial. Vous savez où intervenir, et sur quoi.
        </p>

        {/* « Suivi des deals », interactif, avec sa démonstration automatique
            (curseur qui clique tant qu'on n'a pas pris la main). Placé juste
            après les quatre leviers (choix de Jean, 12/10/2026). */}
        <div className="relative mt-16 lg:mt-20">
          <div aria-hidden className="land-aurora absolute -inset-x-2 -bottom-6 top-24 rounded-[36px] sm:-inset-x-6 lg:-inset-x-10">
            <i />
            <i />
            <i />
          </div>
          <div className="relative">
            <DealsBoard demo />
          </div>
        </div>

        <ul className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:mt-20">
          {TEAM_POINTS.map((p) => (
            <li key={p.title}>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-land-accent-soft text-land-accent">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="mt-4 text-[18px] font-semibold tracking-tight text-land-ink">{p.title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-land-muted">{p.body.replace(/ :/g, `${NB}:`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── La méthode : quatre leviers ─────────────────────────────────────────────

const STEPS: JourneyStep[] = [
  {
    verb: "Préparer",
    when: "Mercredi 18:00",
    moment: "La veille du rendez-vous",
    title: "Arrivez en connaissant votre prospect.",
    body: "La veille, Brief compile un dossier prêt à lire en 3 minutes. Finies les 20 minutes éparpillées entre LinkedIn, Pappers et le site du prospect.",
    points: [
      { title: "Entreprise, contact et contexte sourcés", body: "Activité, clients, chiffres clés, actualité : depuis les registres officiels, les annuaires professionnels et le web. L'origine du rendez-vous est lue dans HubSpot." },
      { title: "Une accroche et les enjeux à explorer", body: "Une question d'ouverture prête à dire, et trois enjeux au plus, chacun avec son hypothèse et la question à poser." },
      {
        title: "Les références de toute l'équipe",
        body: "Brief compare le prospect aux cas clients de l'équipe, importés d'un fichier, saisis à la main ou repris de vos deals gagnés. Il en retient deux, classées preuve de ROI, cas d'usage ou référence simple, avec la phrase à dire.",
      },
      {
        title: "À partir du R2, le brief repart du deal",
        body: "Les priorités du rendez-vous, les freins déjà exprimés et ce qui y répond, les engagements pris de chaque côté.",
      },
    ],
    object: <SourcesObject />,
  },
  {
    verb: "Débriefer",
    when: "Jeudi 15:20",
    moment: "Juste après le call",
    title: "Chaque call débriefé en trois questions.",
    body: "Le bot rejoint la visio et transcrit en français. Brief répond ensuite aux trois questions d'un commercial qui raccroche : ce que ce rendez-vous a changé dans le deal, ce qu'il faut faire maintenant, ce qui aurait pu être mieux exécuté. Essayez les trois onglets.",
    points: [
      { title: "L'impact sur le deal", body: "Ce qui est nouveau, ce qui recule, un concurrent cité, un point de vigilance, et l'état du deal avant et après le rendez-vous." },
      { title: "Les engagements des deux côtés", body: "Ce que vous devez faire, ce que le prospect a promis, pour quand, et ce qu'il faut obtenir au rendez-vous suivant." },
      { title: "Un coaching, pas une note", body: "Deux points bien exécutés, deux à travailler au plus, chacun avec la phrase à dire la prochaine fois." },
      { title: "L'email de suivi et le CRM", body: "L'email de suivi est rédigé, prêt à relire. Le compte rendu part dans HubSpot ou Pipedrive, et les propriétés du deal HubSpot se mettent à jour." },
    ],
    object: <AnalysisObject />,
  },
  {
    verb: "Progresser",
    when: "Lundi 08:00",
    moment: "Entre deux rendez-vous, sur chaque deal",
    title: "Chaque deal a sa priorité, chaque commercial sait quoi faire.",
    body: "Chaque rendez-vous enregistré crée ou complète le deal de son prospect. Le commercial ouvre ses deals et voit lesquels avancent, lesquels sont à relancer, et l'action à mener sur chacun. Ce que le deal sait déjà tient en huit lignes.",
    points: [
      { title: "Cinq états, calculés depuis les calls", body: "En progrès, à qualifier, à relancer, à l'arrêt, en recul : personne ne les saisit à la main." },
      { title: "Une priorité par deal", body: "Ce qu'il faut faire, pourquoi maintenant, comment. Un engagement en retard passe devant tout le reste." },
      { title: "Gagné, perdu, abandonné", body: "Vous clôturez le deal dans Brief, l'étape change dans HubSpot, et un deal gagné rejoint les références de l'équipe." },
      { title: "Entraînement sur ses vraies objections", body: "Un prospect joué par l'IA, à la voix, reprend les objections restées sans réponse dans ses calls. À la fin : ses points forts, et la meilleure réponse à réutiliser." },
    ],
    object: <DealObject />,
  },
  {
    verb: "Structurer",
    when: "Dès le départ",
    moment: "Une méthode pour toute l'équipe",
    title: "Toute l'équipe vend avec la même méthode, la vôtre.",
    body: "Votre méthode de qualification, ce qu'il faut obtenir à chaque étape, vos réponses aux objections, vos références : réglés une fois, sur une seule page. Chaque nouveau commercial arrive dans une équipe qui a déjà sa méthode.",
    points: [
      { title: "Des objectifs par étape commerciale", body: "Sur les étapes de votre pipeline HubSpot : ce qu'il faut avoir obtenu avant de passer à la suivante. MEDDIC, BANT, MEDDPICC ou le socle Brief." },
      { title: "Vos objections, vos réponses", body: "Vous fixez les catégories et la façon de traiter chacune. Brief y range chaque objection entendue en call, et vous suggère les nouvelles catégories qui reviennent." },
      { title: "Des références classées", body: "Preuve de ROI, cas d'usage ou référence simple : Brief dit lesquelles citer telles quelles, et lesquelles sont à compléter." },
      { title: "Mis en place avec votre expert", body: "Un expert de l'équipe Brief installe tout avec vous, une brique par semaine pendant huit semaines." },
    ],
    object: <MethodObject />,
  },
];

// Les quatre leviers, tels que l'introduction de « La méthode » les annonce.
// Mêmes couleurs que la séquence (Journey) : bleu, corail, soleil, lilas.
// Titre « Quatre leviers. Un seul objectif : le ROI. » (Jean, 13/10/2026),
// à la place de « Trois moments. Un seul objectif : le closing. »
export const MOMENTS = [
  { verb: "Préparer", when: "la veille", anchor: "preparer", soft: "bg-land-accent-soft", solid: "bg-land-accent" },
  { verb: "Débriefer", when: "après le call", anchor: "debriefer", soft: "bg-land-coral-soft", solid: "bg-land-coral" },
  { verb: "Progresser", when: "entre deux rendez-vous", anchor: "progresser", soft: "bg-land-sun-soft", solid: "bg-land-sun-ink" },
  { verb: "Structurer", when: "dès le départ", anchor: "structurer", soft: "bg-land-lilac-soft", solid: "bg-land-lilac-ink" },
];

// Introduction de « La méthode ». Rendue deux fois, une seule visible : dans
// la section (téléphone, tablette, mouvement réduit) ou, en mode épinglé, à
// gauche du brief replié en fin de haut de page (cf. HeroStage).
export function MethodIntro() {
  return (
    <>
      <h2 className={`${H2} max-w-[16ch]`}>
        <span className="text-land-ink">Quatre leviers.</span>{" "}
        <span className="text-land-faint">Un seul objectif : le ROI.</span>
      </h2>
      <p className="mt-6 max-w-[54ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
        Préparer chaque rendez-vous, débriefer chaque call, faire progresser chaque deal, structurer toute
        l&apos;équipe autour de votre méthode. Brief actionne les quatre, pour que chaque rendez-vous rapporte
        davantage.
      </p>
      {/* Les leviers annoncés d'emblée, numérotés, dans leur couleur et
          reliés par un trait : la structure se lit avant même d'entrer dans
          la séquence. Verticale, elle tient aussi dans la colonne étroite du
          haut de page épinglé. */}
      <ol className="relative mt-8 space-y-3" aria-label="Les quatre leviers">
        <span aria-hidden className="absolute bottom-5 left-[19px] top-5 w-0.5 rounded-full bg-land-line" />
        {MOMENTS.map((m, i) => (
          <li key={m.verb} className="relative">
            <a
              href={`#${m.anchor}`}
              className={`inline-flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-5 transition-transform hover:translate-x-1 ${m.soft}`}
            >
              <span className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-semibold text-white ring-4 ring-land-bg ${m.solid}`}>
                {i + 1}
              </span>
              <span className="text-[15px] leading-tight">
                <span className="font-semibold text-land-ink">{m.verb}</span>{" "}
                <span className="text-land-muted">· {m.when}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}

export function MethodSection() {
  return (
    <section id="methode" className="land-method scroll-mt-20 border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:pb-16 lg:pt-32">
        <MethodIntro />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <Journey steps={STEPS} />
      </div>
    </section>
  );
}

// ─── Managers ────────────────────────────────────────────────────────────────

// Section manager (refaite le 12/10/2026, reprise le 18/11/2026). Ce qui
// distingue Brief — la méthode du manager, appliquée à chaque call et à
// chaque deal — montrée sur la vraie page Méthode (qui a remplacé la page
// Playbook et sa grille de notation le 05/11/2026), puis le bilan du vendredi.
export function ManagerSection() {
  return (
    <section id="manager" className="scroll-mt-20 border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 className={`${H2} max-w-[17ch]`}>
          <span className="text-land-ink">Vous fixez la méthode.</span>{" "}
          <span className="text-land-faint">Brief l&apos;applique à chaque call.</span>
        </h2>
        <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Votre méthode de qualification, ce qu&apos;il faut obtenir à chaque étape du pipeline, vos réponses aux
          objections, les clients à citer. Réglée une fois, modifiable à tout moment : c&apos;est d&apos;après elle que
          Brief lit chaque call et dit ce qui manque sur chaque deal.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <MethodPreview />
          {/* Le lecteur visé, en image : le directeur commercial. Photo
              générée par IA (Higgsfield, 12/10/2026), sans mention à l'écran
              (choix de Jean, 12/10/2026). */}
          <figure className="lg:sticky lg:top-24">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-land-sunken">
              <Image
                src="/landing/people/directrice.jpg"
                alt=""
                fill
                sizes="(min-width: 1024px) 34vw, 100vw"
                className="object-cover"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-2xl bg-land-surface/90 px-3.5 py-3 shadow-[var(--land-shadow)] backdrop-blur-md backdrop-saturate-150 sm:bottom-4 sm:left-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-land-accent text-white">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold text-land-ink">Bilan de la semaine</div>
                  <div className="text-[12.5px] text-land-muted">
                    Vendredi <span className="tabular-nums">18:00</span>, par email
                  </div>
                </div>
              </div>
            </div>
            <ul className="mt-6 space-y-3 text-[15px] text-land-ink">
              {[
                "Des objectifs par étape commerciale, calés sur votre pipeline HubSpot.",
                "Les objections rangées dans vos catégories, avec votre réponse de référence.",
                "Un bilan chaque vendredi : ce qui a marché, points d'attention, à ne pas oublier.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-land-accent" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </figure>
        </div>

        {/* Le bilan part chaque vendredi par email, avec les rubriques réelles
            du bilan manager. */}
        <div className="mt-16 lg:mt-24">
          <DigestObject />
        </div>
      </div>
    </section>
  );
}

// ─── Preuve ──────────────────────────────────────────────────────────────────

// ─── Témoignages ─────────────────────────────────────────────────────────────

// Un carrousel de grands témoignages (portrait + citation) puis six cartes,
// sur le modèle de lemlist et PayFit. Tous réels (cf. testimonials-data.ts) ;
// un témoignage de maquette porterait `fictional` et serait retiré du build
// de production. Tant qu'il en reste à l'écran, un bandeau le dit.
export function Testimonials() {
  const featured = visibleTestimonials(FEATURED);
  const cards = visibleTestimonials(CARDS);
  const mock = [...featured, ...cards].some((t) => t.fictional);
  return (
    <section className="border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        {mock && (
          <p className="mb-8 inline-flex items-center gap-2 rounded-full bg-land-sun-soft px-3 py-1.5 text-[12.5px] font-medium text-land-sun-ink">
            Maquette interne{NB}: certains témoignages sont fictifs et n&apos;apparaissent pas en production.
          </p>
        )}
        {featured.length + cards.length > 1 && (
          <h2 className={`${H2} mb-14 max-w-[18ch] lg:mb-20`}>
            <span className="text-land-ink">Ils structurent leur équipe avec Brief.</span>{" "}
            <span className="text-land-faint">Ce qui a changé pour eux.</span>
          </h2>
        )}
        <TestimonialCarousel items={featured} />
        {cards.length > 0 && (
          <ul className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3 lg:mt-20">
            {cards.map((t) => (
              <li key={t.name} className="land-lift flex flex-col rounded-[24px] border border-land-line bg-land-surface p-6">
                {/* Entreprise en tête de carte, à la place d'un logo client. */}
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-land-ink">
                  <CompanyMark color={t.color} size={24} />
                  {t.company[0].toUpperCase() + t.company.slice(1)}
                </div>
                <blockquote className="mt-5 flex-1 text-[16.5px] leading-relaxed text-land-ink">
                  «{"\u00a0"}{t.quote[0]} <span className="text-land-muted">{t.quote[1]}{"\u00a0"}»</span>
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-land-sunken">
                    <Image src={t.photo} alt="" fill sizes="44px" className="object-cover object-top" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-land-ink">{t.name}</span>
                    <span className="block text-[13px] text-land-muted">{t.role}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 text-[13px] text-land-faint">Portraits d&apos;illustration, avec l&apos;accord de chaque personne citée.</p>
      </div>
    </section>
  );
}

// Logos en couleur, servis depuis public/landing/stack : svgl.app pour la
// plupart, Simple Icons pour HubSpot (teinté à sa couleur de marque), et une
// icône d'app redessinée pour Pipedrive, absente des deux bibliothèques.
const STACK_LOGOS: Record<string, string> = {
  "google-calendar": "Google Agenda",
  "microsoft-outlook": "Outlook",
  "google-meet": "Google Meet",
  "microsoft-teams": "Microsoft Teams",
  zoom: "Zoom",
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  gmail: "Gmail",
  slack: "Slack",
};

// Ce que Brief fait de chaque outil — vérifié dans le code le 18/11/2026 :
// lecture d'agenda et dépôt du brief dans l'événement Google
// (lib/google-calendar.ts), bot « Brief Notetaker » et son message d'annonce
// (lib/recall.ts), réunions internes écartées (lib/meeting-kind.ts), brief et
// analyse vers HubSpot, Pipedrive, Slack et email
// (lib/notifications-dispatcher.ts), propriétés HubSpot mises à jour après
// chaque call (lib/hubspot-autofill-run.ts), étape gagnée ou perdue
// (lib/crm/hubspot-deals.ts), envoi seul sur Gmail et Outlook (scopes
// gmail.send et Mail.Send), alertes sur un deal (lib/reception.ts).
// L'import du playbook depuis Notion, Word ou PDF n'a plus d'écran depuis le
// 05/11/2026 : la carte et les deux logos sont retirés.
const STACK_CARDS: { title: string; logos: string[]; points: string[] }[] = [
  { title: "Agenda", logos: ["google-calendar", "microsoft-outlook"], points: [`Brief lit vos rendez-vous à venir et repère ceux avec des prospects.`, `Sur Google Agenda, le brief est déposé dans l'événement.`] },
  { title: "Visio", logos: ["google-meet", "microsoft-teams", "zoom"], points: [`Le bot « Brief Notetaker » rejoint la visio, enregistre et transcrit.`, `Il annonce l'enregistrement dans le chat, et ne rejoint pas vos réunions internes.`] },
  { title: "CRM", logos: ["hubspot", "pipedrive"], points: [`Le brief et le compte rendu du call arrivent dans la fiche.`, `L'historique, l'étape et le montant du deal nourrissent le brief suivant.`] },
  { title: "Deals HubSpot", logos: ["hubspot"], points: [`Après chaque call, les propriétés que vous avez choisies se mettent à jour.`, `Gagné ou perdu dans Brief : l'étape change dans HubSpot.`] },
  { title: "Email", logos: ["gmail", "microsoft-outlook"], points: [`L'email de suivi part de votre adresse, après relecture.`, `Brief n'a aucun accès en lecture à votre messagerie.`] },
  { title: "Slack", logos: ["slack"], points: [`Brief et analyse du call en message privé.`, `Une alerte au manager quand un call met un deal à risque.`] },
];

function StackLogo({ file, size = 24 }: { file: string; size?: number }) {
  return (
    <Image
      src={`/landing/stack/${file}.svg`}
      alt={STACK_LOGOS[file] ?? ""}
      width={size}
      height={size}
      unoptimized
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}

// Schéma en orbite : Brief au centre, les outils sur deux anneaux qui
// tournent lentement (les logos restent droits). Décoratif ; immobile en
// mouvement réduit.
function StackOrbit() {
  const inner = ["google-calendar", "microsoft-outlook", "gmail", "slack"];
  const outer = ["google-meet", "microsoft-teams", "zoom", "hubspot", "pipedrive"];
  const ring = (files: string[], r: number, reverse = false) => (
    <div className={`land-orbit absolute inset-0 ${reverse ? "land-orbit-reverse" : ""}`} aria-hidden>
      {files.map((f, i) => {
        const angle = (360 / files.length) * i;
        return (
          <div
            key={f}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${angle}deg) translate(${r}px) rotate(${-angle}deg)` }}
          >
            <div className="land-orbit-counter -ml-7 -mt-7 grid h-14 w-14 place-items-center rounded-2xl border border-land-line bg-land-surface shadow-[var(--land-shadow)]">
              <StackLogo file={f} size={28} />
            </div>
          </div>
        );
      })}
    </div>
  );
  // Boîte de 440 px aux rayons fixes, réduite d'un quart sur téléphone.
  return (
    <div className="relative mx-auto h-[330px] w-full max-w-[440px] sm:h-[440px]">
      <div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 scale-[0.74] sm:scale-100">
        <span className="absolute inset-[85px] rounded-full border border-dashed border-land-line" aria-hidden />
        <span className="absolute inset-[15px] rounded-full border border-dashed border-land-line" aria-hidden />
        {ring(inner, 135)}
        {ring(outer, 205, true)}
        <div className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[28px] bg-land-accent text-[34px] font-semibold text-white shadow-[0_20px_50px_-12px_oklch(0.52_0.2_265/0.55)]">
          B
        </div>
      </div>
    </div>
  );
}

export function Integrations({ showTitle = true }: { showTitle?: boolean }) {
  return (
    // `overflow-x-clip` : en tournant, les anneaux de l'orbite (des carrés
    // invisibles) dépassent de l'écran sur téléphone à certains angles et
    // faisaient défiler la page de côté par intermittence. `clip` et non
    // `hidden` : pas de conteneur de défilement créé.
    <section id="integrations" className="scroll-mt-20 overflow-x-clip border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        {showTitle && (
          <h2 className={`${H2} max-w-[16ch]`}>
            <span className="text-land-ink">Se branche sur votre stack.</span>{" "}
            <span className="text-land-faint">Rien de plus à ouvrir le matin.</span>
          </h2>
        )}

        <div className={`${showTitle ? "mt-14 lg:mt-16" : ""} grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16`}>
          <div className="order-2 lg:order-1">
            <p className="max-w-[46ch] text-[18px] leading-relaxed text-land-muted">
              Brief se branche en quelques clics sur les outils de l&apos;équipe, avec le compte Google ou Microsoft de chacun.
              Il y prend ce dont il a besoin, et y dépose ce qu&apos;il produit : personne n&apos;a d&apos;outil de plus à ouvrir.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-land-bg p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.07em] text-land-accent">Ce que Brief lit</div>
                <ul className="mt-3 space-y-2 text-[14.5px] text-land-ink">
                  {["Vos rendez-vous à venir", "Les visios, enregistrées et transcrites", "L'historique de votre CRM", "L'étape et le montant de vos deals"].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-land-accent" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-land-bg p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.07em] text-land-coral-ink">Ce que Brief dépose</div>
                <ul className="mt-3 space-y-2 text-[14.5px] text-land-ink">
                  {["Le brief, la veille au soir", "Le compte rendu du call", "Les propriétés du deal, à jour", "L'email de suivi, prêt à partir"].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-land-coral" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <StackOrbit />
          </div>
        </div>

        <ul className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {STACK_CARDS.map((c) => (
            <li key={c.title} className="rounded-[20px] border border-land-line bg-land-bg p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[16px] font-semibold text-land-ink">{c.title}</span>
                <span className="flex items-center gap-1.5">
                  {c.logos.map((f) => (
                    <span key={f} className="grid h-9 w-9 place-items-center rounded-xl border border-land-line bg-land-surface" title={STACK_LOGOS[f]}>
                      <StackLogo file={f} size={20} />
                    </span>
                  ))}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-land-muted">
                {c.points.map((pt) => (
                  <li key={pt} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-land-accent" aria-hidden />
                    {pt}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-[14px] text-land-muted">
          <li className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-land-accent" aria-hidden /> Conforme au RGPD
          </li>
          <li className="inline-flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-land-accent" aria-hidden /> Données hébergées en Europe (Paris, Francfort)
          </li>
          <li className="inline-flex items-center gap-2">
            <Mic className="h-4 w-4 text-land-accent" aria-hidden /> Participants informés de l&apos;enregistrement
          </li>
        </ul>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
// Développée le 12/10/2026, reprise le 18/11/2026 (14 questions en trois
// thèmes) après la fin de la note sur 5 et l'arrivée des deals. Chaque réponse
// est vérifiable dans le code : bot « Brief Notetaker » et son message
// d'annonce (lib/recall.ts), réunions internes écartées (lib/meeting-kind.ts),
// mémoire d'un deal (lib/deal-progress.ts, lib/deal-macro.ts), méthode et
// objectifs par étape (lib/deal-rules.ts), coaching sans note
// (lib/deal-advice-ai.ts), canaux de diffusion (lib/notifications-dispatcher.ts,
// lib/reception.ts), écritures HubSpot (lib/hubspot-autofill-run.ts,
// lib/crm/hubspot-deals.ts), scope Gmail limité à l'envoi (lib/auth.ts),
// régions Paris / Francfort.
const FAQ_GROUPS = [
    {
      title: "Le produit",
      items: [
        { q: `Comment Brief augmente concrètement le taux de closing ?`, a: `En travaillant quatre leviers : arriver préparé à chaque rendez-vous, savoir après chaque call ce qu'il a changé dans le deal et ce qu'il faut faire, faire avancer chaque deal avec une priorité claire, et structurer toute l'équipe autour d'une même méthode.` },
        { q: `Comment Brief rejoint mes rendez-vous ?`, a: `Vous connectez votre agenda Google ou Outlook. Brief détecte les visios (Meet, Teams, Zoom) et y envoie son bot, « Brief Notetaker », qui enregistre et transcrit. Les réunions internes (point hebdomadaire, entretien, déjeuner…) sont reconnues à leur titre et ne sont pas enregistrées ; vous pouvez toujours forcer l'analyse d'un rendez-vous, ou en exclure un.` },
        { q: `Comment Brief suit-il un deal d'un rendez-vous à l'autre ?`, a: `Chaque rendez-vous enregistré crée ou complète le deal de son prospect. Brief retient ce que le deal sait déjà (douleur, budget, décideur, échéance…), les engagements pris de chaque côté et le prochain rendez-vous. La page du deal affiche son état, une priorité et ce qu'il reste à obtenir ; le brief du rendez-vous suivant repart de là.` },
        { q: `Comment Brief apprend-il notre méthode de vente ?`, a: `Le manager choisit la méthode de qualification (MEDDIC, BANT, MEDDPICC ou le socle Brief) et ce qu'il faut obtenir à chaque étape commerciale, sur les étapes de votre pipeline HubSpot quand il est connecté. Il fixe aussi les objections de référence et la façon d'y répondre. Tout se règle sur une seule page, Méthode, modifiable à tout moment.` },
        { q: `Brief note-t-il mes commerciaux ?`, a: `Non. Brief ne met de note ni sur un call ni sur un commercial. Après chaque rendez-vous, le commercial lit ce qu'il a bien exécuté et, au plus, deux points à travailler, chacun avec la phrase à dire la prochaine fois. Le manager, lui, voit les deals de ses commerciaux qui demandent son intervention, et la question à leur poser.` },
        { q: `Où mes commerciaux reçoivent-ils leurs briefs ?`, a: `Dans Brief, et là où ils travaillent déjà, selon les canaux activés : par email la veille, dans la description de l'événement Google Agenda, dans les notes HubSpot ou Pipedrive, ou en message Slack. Le manager peut régler ces canaux pour toute l'équipe en une fois.` },
        { q: `Que fait Brief dans mon CRM ?`, a: `Il y lit l'historique, l'étape et le montant de chaque deal, et y dépose le brief et le compte rendu de chaque call. Sur HubSpot, il met aussi à jour après chaque call les propriétés que vous avez choisies, et passe le deal à l'étape gagnée ou perdue quand vous le clôturez dans Brief.` },
      ],
    },
    {
      title: "Données et sécurité",
      items: [
        { q: `Que deviennent les enregistrements ?`, a: `Hébergement européen, chiffrement au repos et en transit, suppression sur demande. Les liens vers les vidéos sont temporaires et ne sont jamais stockés.` },
        { q: `Les participants sont-ils prévenus ?`, a: `Oui. En arrivant, le bot écrit dans le chat de la visio qu'il enregistre et transcrit la réunion, et invite chacun à le dire s'il préfère qu'il quitte la réunion.` },
        { q: `Brief lit-il mes emails ?`, a: `Non. Brief demande seulement le droit d'envoyer un email en votre nom (un suivi, une relance), jamais celui de lire votre messagerie.` },
        { q: `Où sont hébergées les données ?`, a: `En Europe : la base et l'application à Paris, les enregistrements à Francfort. Conforme au RGPD.` },
      ],
    },
    {
      title: "Essai et mise en place",
      items: [
        { q: `Puis-je tester Brief ?`, a: `Oui. Créez votre compte avec Google ou Microsoft et préparez jusqu'à ${BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour, sans carte bancaire. L'analyse des calls et le suivi des deals se mettent en place avec nous : prenez rendez-vous, on configure Brief pour votre équipe.` },
        { q: `Combien de temps pour démarrer ?`, a: `Deux minutes pour connecter l'agenda ; le premier brief arrive la veille du prochain rendez-vous. Pour l'analyse des calls et le suivi des deals, on accompagne la mise en place sur huit semaines, avec un point chaque semaine.` },
        { q: `Comment est facturé Brief ?`, a: `Les briefs sont offerts jusqu'à ${BRIEFS_ACCESS_DAILY_LIMIT} par jour et par utilisateur. Pour l'équipe, l'abonnement se fait par commercial : on vous fait une proposition après un premier échange.` },
      ],
    },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-land-line">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)] lg:gap-20 lg:py-32">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] text-land-ink md:text-[48px]">
            Questions fréquentes
          </h2>
          <p className="mt-5 max-w-[36ch] text-[17px] leading-relaxed text-land-muted">
            Le produit, vos données, la mise en place. Une question qui n&apos;est pas là ?
          </p>
          {/* Contact : le rendez-vous et l'adresse de la landing. */}
          <div className="mt-8 rounded-[20px] border border-land-line bg-land-surface p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-land-accent-soft text-land-accent">
                <CalendarClock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <div className="text-[15px] font-semibold text-land-ink">Parlons de votre équipe</div>
                <div className="text-[13px] text-land-muted">20 minutes, en visio, sans engagement.</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={SALES_CONTACT.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-land-accent px-4 text-[14px] font-medium text-white transition-[filter] hover:brightness-110"
              >
                Prendre rendez-vous <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="mailto:contact@brief-ai.fr"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-land-line px-4 text-[14px] font-medium text-land-ink transition-colors hover:bg-land-sunken"
              >
                <Mail className="h-4 w-4" aria-hidden /> contact@brief-ai.fr
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {FAQ_GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-land-accent">{g.title}</h3>
              <div className="mt-3 divide-y divide-land-line border-y border-land-line">
                {g.items.map((qa) => (
                  <details key={qa.q} className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium text-land-ink transition-colors hover:text-land-accent [&::-webkit-details-marker]:hidden">
                      {qa.q}
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-land-sunken text-land-muted transition-[transform,background-color,color] duration-300 group-open:rotate-45 group-open:bg-land-accent group-open:text-white">
                        <Plus className="h-4 w-4" aria-hidden />
                      </span>
                    </summary>
                    <p className="max-w-[62ch] pb-6 text-[15.5px] leading-relaxed text-land-muted">{qa.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Dernier appel ───────────────────────────────────────────────────────────
// Même style que le haut de page (aplat d'encre, illustration en pâte à
// modeler, texte blanc), contenu propre : comment démarrer, en trois étapes.
// Bleu du fond de l'illustration du dernier appel : le texte s'y pose.
const CTA_INK = "#213F94";

const START_STEPS = [
  { title: "Connectez Google ou Microsoft", body: "Deux minutes, sans carte bancaire." },
  { title: "Brief lit votre agenda", body: "Il repère les rendez-vous avec vos prospects." },
  { title: "Le premier brief arrive la veille", body: "Prêt à lire en trois minutes avant le rendez-vous." },
];

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pb-28">
      <div
        className="relative grid grid-cols-1 overflow-hidden rounded-[32px] text-white lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
        style={{ backgroundColor: CTA_INK }}
      >
        <div className="relative order-2 px-6 pb-12 pt-6 sm:px-12 lg:order-1 lg:py-16">
          <h2 className="max-w-[14ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-[60px]">
            Prêt à <span className="text-land-sun">closer plus</span> ?
          </h2>
          <ol className="mt-9 space-y-4">
            {START_STEPS.map((st, i) => (
              <li key={st.title} className="flex items-start gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/12 text-[15px] font-semibold ring-1 ring-white/20">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-[17px] font-semibold">{st.title}</span>
                  <span className="block text-[14.5px] text-white/70">{st.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/inscription"
              className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-white px-6 text-[16px] font-semibold text-land-ink transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Essayer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={SALES_CONTACT.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-white/35 px-6 text-[16px] font-medium transition-[background-color,transform] hover:bg-white/10 active:scale-[0.98]"
            >
              Équiper toute l&apos;équipe <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-4 text-[13px] text-white/55">
            Pour l&apos;analyse des calls et le suivi des deals, on met Brief en place avec vous.
          </p>
        </div>
        <div className="relative order-1 aspect-[16/10] lg:order-2 lg:-ml-0.5 lg:aspect-auto">
          <Image src="/landing/cta-scene.jpg" alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          <div
            aria-hidden
            className="absolute inset-y-0 -left-1 right-0 hidden lg:block"
            style={{ backgroundImage: `linear-gradient(90deg, ${CTA_INK} 0%, ${CTA_INK}d9 18%, ${CTA_INK}66 38%, transparent 62%)` }}
          />
          <div
            aria-hidden
            className="absolute inset-0 lg:hidden"
            style={{ backgroundImage: `linear-gradient(180deg, transparent 55%, ${CTA_INK})` }}
          />
        </div>
      </div>
    </section>
  );
}


// ─── Accueil : les 3 moments en bref ─────────────────────────────────────────
// Version courte de la séquence de la page Produit : trois cartes numérotées,
// chacune avec un fait produit, qui renvoient au détail.
// ─── Accueil : l'accompagnement en bref ──────────────────────────────────────
export function AccompanimentTeaser() {
  return (
    <section className="border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="rounded-[28px] bg-land-surface p-6 shadow-[var(--land-shadow)] ring-1 ring-land-line sm:p-10">
          <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[minmax(0,1.3fr)_auto]">
            <div>
              <h2 className="max-w-[22ch] text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[44px]">
                <span className="text-land-ink">D&apos;abord l&apos;outil.</span>{" "}
                <span className="text-land-faint">Ensuite, on structure votre équipe et on configure Brief pour elle.</span>
              </h2>
              <p className="mt-4 max-w-[58ch] text-[17px] leading-relaxed text-land-muted">
                Un expert de l&apos;équipe Brief vous accompagne huit semaines, un point par semaine, une brique à la fois.
              </p>
            </div>
            <Link
              href="/accompagnement"
              className="inline-flex h-12 items-center gap-2 justify-self-start rounded-full bg-land-accent px-6 text-[15.5px] font-medium text-white transition-[filter] hover:brightness-110 lg:justify-self-end"
            >
              Découvrir l&apos;accompagnement <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-9 overflow-x-auto pb-1">
            <ol className="relative grid min-w-[720px] grid-cols-9 gap-2">
              <span className="absolute left-[5.5%] right-[5.5%] top-[15px] h-0.5 bg-land-line" aria-hidden />
              {PARCOURS.map((p) => (
                <li key={p.week} className="relative flex flex-col items-center text-center">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold text-white ring-4 ring-land-surface ${
                      p.week < TOOL_WEEKS ? "bg-land-accent" : "bg-land-coral"
                    }`}
                  >
                    S{p.week}
                  </span>
                  <span className="mt-2 text-[12px] font-medium leading-snug text-land-ink">{p.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── En-tête des pages intérieures ───────────────────────────────────────────
// Même grammaire que le haut de page de l'accueil (aplat d'encre, texte blanc,
// accent jaune), en plus compact et sans illustration.
export function PageHero({
  label,
  title,
  accent,
  lead,
  art,
  ink = HERO_INK,
}: {
  label: string;
  title: string;
  accent?: string;
  lead: string;
  /** Illustration en pâte à modeler, propre à la page (public/landing/art-*). */
  art?: string;
  /** Couleur de l'aplat : celle du fond de l'illustration, pour un fondu sans couture. */
  ink?: string;
}) {
  return (
    <section className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div
        className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[24px] text-white sm:rounded-[32px]"
        style={{ backgroundColor: ink }}
      >
        {art && (
          <div className="absolute inset-y-0 right-0 hidden w-[56%] lg:block" aria-hidden>
            <Image src={art} alt="" fill priority sizes="56vw" className="land-hero-art object-cover object-[70%_50%]" />
            <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(90deg, ${ink} 0%, ${ink}cc 14%, transparent 45%)` }} />
          </div>
        )}
        {/* Même gouttière que le contenu des sections : le texte s'aligne. */}
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 md:pb-20 md:pt-20 lg:min-h-[440px]">
          <span className="land-hero-text inline-flex rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium text-white/85 ring-1 ring-white/15">
            {label}
          </span>
          <h1
            className={`land-hero-text mt-5 text-[40px] font-semibold leading-[1.03] tracking-[-0.04em] sm:text-[56px] lg:text-[64px] ${art ? "max-w-[15ch]" : "max-w-[18ch]"}`}
            style={{ "--i": 1 } as React.CSSProperties}
          >
            {title} {accent && <span className="text-land-sun">{accent}</span>}
          </h1>
          <p
            className={`land-hero-text mt-6 text-[18px] leading-relaxed text-white/85 sm:text-[19px] ${art ? "max-w-[44ch]" : "max-w-[58ch]"}`}
            style={{ "--i": 2 } as React.CSSProperties}
          >
            {lead}
          </p>
          {art && (
            <div className="relative mt-10 aspect-[16/10] overflow-hidden rounded-2xl lg:hidden" aria-hidden>
              <Image src={art} alt="" fill loading="eager" sizes="(min-width: 1024px) 16px, 100vw" className="object-cover object-[70%_50%]" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Page Sécurité ───────────────────────────────────────────────────────────
// Tout ce qui suit est aligné sur la politique de confidentialité et sur le
// code (12/10/2026) : base Supabase et application Vercel à Paris, Recall en
// région Europe (Francfort), vidéo jamais conservée par Brief, scope Gmail
// limité à l'envoi (Mail.Send côté Microsoft), message d'annonce du bot,
// cloisonnement par rôle. L'IA (Anthropic) n'est PAS hébergée en Europe :
// on le dit, plutôt que d'écrire « tout est en Europe ».
const SECURITY_POINTS = [
  {
    icon: Server,
    title: "Hébergé en Europe",
    body: "La base de données et l'application sont hébergées à Paris, les enregistrements des visios sont traités à Francfort.",
  },
  {
    icon: EyeOff,
    title: "La vidéo n'est pas conservée",
    body: "Brief garde la transcription et l'analyse d'un call, jamais la vidéo elle-même. Les liens de lecture sont temporaires.",
  },
  {
    icon: Bot,
    title: "Des participants informés",
    body: "En arrivant dans la visio, le bot « Brief Notetaker » annonce dans le chat qu'il enregistre, et propose de quitter la réunion si quelqu'un le préfère. Il ne rejoint pas vos réunions internes, reconnues à leur titre.",
  },
  {
    icon: Mail,
    title: "Aucune lecture de vos emails",
    body: "Sur Gmail comme sur Outlook, Brief n'a que le droit d'envoyer un email en votre nom, jamais celui de lire votre messagerie.",
  },
  {
    icon: Lock,
    title: "Chacun voit ce qu'il doit voir",
    body: "Un commercial voit ses calls et ses deals ; un manager, ceux des commerciaux qui lui sont rattachés. Les sessions d'entraînement restent privées : le manager n'en voit que des compteurs.",
  },
  {
    icon: Trash2,
    title: "Vos données vous appartiennent",
    body: "Pas de revente, suppression sur demande, chiffrement au repos et en transit. Conforme au RGPD.",
  },
];

export function SecurityContent() {
  return (
    <section className="border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_POINTS.map((p) => (
            <li key={p.title} className="rounded-[22px] border border-land-line bg-land-surface p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-land-accent-soft text-land-accent">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="mt-5 text-[18px] font-semibold tracking-tight text-land-ink">{p.title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-land-muted">{p.body.replace(/« /g, `«${NB}`).replace(/ »/g, `${NB}»`)}</p>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}
