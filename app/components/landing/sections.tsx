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
import { PlaybookPreview } from "@/app/components/landing/PlaybookPreview";
import { PerformanceDashboard } from "@/app/components/landing/PerformanceDashboard";
import { UpcomingMeetings } from "@/app/components/landing/UpcomingMeetings";
import { SourcesObject, ObjectionObject, DigestObject } from "@/app/components/landing/objects";
import { PARCOURS, TOOL_WEEKS } from "@/app/components/landing/Accompaniment";
import { NB } from "@/app/components/landing/team-data";
import { TestimonialCarousel, CompanyMark } from "@/app/components/landing/TestimonialCarousel";
import { FEATURED, CARDS, visibleTestimonials } from "@/app/components/landing/testimonials-data";
import { ArrowRight, ArrowUpRight, Check, ShieldCheck, Globe2, Mic, Plus, Mail, UserRound, ListChecks, Compass, CalendarClock, Bot, Lock, Server, EyeOff, Trash2 } from "lucide-react";

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
                  préparé, chaque call noté, chaque commercial suivi sur ce qu&apos;il fait bien et ce qu&apos;il doit
                  travailler.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-6 text-[16px] font-semibold text-land-ink transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Essayer gratuitement <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#methode"
                    className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/35 px-6 text-[16px] font-medium text-white transition-[background-color,transform] hover:bg-white/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Voir les 3 moments <ArrowRight className="h-4 w-4 rotate-90" />
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
// Ce qui arrive (rendez-vous à venir, brief prêt, bot programmé) et ce qui
// s'est passé (calls analysés et notés) : les deux listes que le manager et
// ses commerciaux ouvrent chaque jour (demande de Jean, 12/10/2026).

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
          aussi déposé dans l&apos;événement d&apos;agenda ; un rendez-vous ajouté à la main se prépare en un clic.
        </p>
        <div className="mt-14 lg:mt-16">
          <UpcomingMeetings />
        </div>
      </div>
    </section>
  );
}

// ─── Votre équipe ────────────────────────────────────────────────────────────
// Remplace « Votre meilleur commercial close 2 à 3 fois plus » (demande de
// Jean, 12/10/2026) : la section montre la vue par commercial — ce que le
// directeur commercial achète vraiment, structurer son équipe sur des faits.

const TEAM_POINTS = [
  {
    icon: UserRound,
    title: "Une fiche par commercial",
    body: "Note moyenne, progression, points forts et point faible, temps de parole, objections qui lui résistent.",
  },
  {
    icon: ListChecks,
    title: "Les mêmes critères pour tous",
    body: "Toute l'équipe est notée sur votre playbook, avec les consignes de chaque étape R1, R2, R3. Plus de jugement à l'impression.",
  },
  {
    icon: Compass,
    title: "Le coaching qui s'impose",
    body: "Vous voyez qui accompagner et sur quoi, et quelle réponse d'un collègue montrer à toute l'équipe.",
  },
];


export function TeamSection() {
  return (
    <section id="equipe" className="scroll-mt-20 border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 className={`${H2} max-w-[19ch]`}>
          <span className="text-land-ink">Voyez ce que fait chacun de vos commerciaux.</span>{" "}
          <span className="text-land-faint">Ce qu&apos;il fait bien, ce qu&apos;il doit travailler.</span>
        </h2>
        <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Chaque call est noté sur la même grille, la vôtre. Brief en tire une fiche par commercial : ses points forts,
          ce qui le freine, sa progression semaine après semaine. Vous savez qui accompagner, sur quoi, et qui peut
          montrer l&apos;exemple.
        </p>

        {/* Le tableau de bord Performance, interactif, avec sa démonstration
            automatique (curseur qui clique tant qu'on n'a pas pris la main).
            Placé juste après les trois moments (choix de Jean, 12/10/2026). */}
        <div className="relative mt-16 lg:mt-20">
          <div aria-hidden className="land-aurora absolute -inset-x-2 -bottom-6 top-24 rounded-[36px] sm:-inset-x-6 lg:-inset-x-10">
            <i />
            <i />
            <i />
          </div>
          <div className="relative">
            <PerformanceDashboard demo />
          </div>
        </div>

        <ul className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:mt-20">
          {TEAM_POINTS.map((p) => (
            <li key={p.title}>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-land-accent-soft text-land-accent">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="mt-4 text-[18px] font-semibold tracking-tight text-land-ink">{p.title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-land-muted">{p.body}</p>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}

// ─── La méthode : un deal, trois moments ─────────────────────────────────────

const STEPS: JourneyStep[] = [
  {
    verb: "Préparer",
    when: "Mercredi 18:00",
    moment: "La veille du rendez-vous",
    title: "Arrivez en connaissant votre prospect.",
    body: "La veille, Brief compile un dossier prêt à lire en 3 minutes. Finies les 20 minutes éparpillées entre LinkedIn, Pappers et le site du prospect.",
    points: [
      { title: "Fiche entreprise sourcée", body: "Effectifs, CA, dirigeants, financement : depuis les registres officiels, les annuaires professionnels et le web." },
      { title: "Signaux récents", body: "Levées de fonds, recrutements clés, mentions presse des 90 derniers jours." },
      { title: "La bonne référence client", body: "Brief pioche dans vos cas clients celui qui ressemble le plus au prospect." },
    ],
    object: <SourcesObject />,
  },
  {
    verb: "Débriefer",
    when: "Jeudi 15:20",
    moment: "Juste après le call",
    title: "Chaque call noté selon votre méthode et son étape.",
    body: "Le bot rejoint la visio, transcrit en français, puis l'IA note le call sur le playbook de votre équipe. Brief reconnaît l'étape depuis le titre du rendez-vous : essayez de noter ce même call comme un R1 ou un R3.",
    points: [
      { title: "Scoring sur votre playbook", body: "Vos dimensions, vos critères, votre pondération, importés depuis Notion ou un document." },
      { title: "Analyse par étape R1, R2, R3", body: "Découverte, présentation, closing : des consignes dédiées à chaque étape du cycle." },
      { title: "Objections et signaux", body: "Objections, concurrents cités, temps de parole : détectés automatiquement." },
    ],
    object: <AnalysisObject />,
  },
  {
    verb: "Progresser",
    when: "Lundi 08:00",
    moment: "Chaque semaine, en équipe",
    title: "Ce qui fait gagner un deal profite à toute l'équipe.",
    body: "Chaque objection traitée nourrit une bibliothèque commune. Le commercial junior répond comme s'il avait dix ans de maison, et vous voyez enfin sur quelles objections l'équipe lâche.",
    points: [
      { title: "Bibliothèque d'objections vivante", body: "Face à une objection, Brief retrouve les cas similaires déjà traités par l'équipe, et ce qui a marché." },
      { title: "Ce qui marche, chiffré", body: "Pour chaque objection : combien de fois elle revient, et à quel point l'équipe la traite bien." },
      { title: "Scores comparés dans le temps", body: "Les dimensions du playbook où chacun progresse, et celles qui restent à travailler." },
    ],
    object: <ObjectionObject />,
  },
];

// Les trois moments, tels que l'introduction de « La méthode » les annonce.
// Mêmes couleurs que la séquence (Journey) : bleu, corail, soleil.
export const MOMENTS = [
  { verb: "Préparer", when: "la veille", anchor: "preparer", soft: "bg-land-accent-soft", solid: "bg-land-accent" },
  { verb: "Débriefer", when: "après le call", anchor: "debriefer", soft: "bg-land-coral-soft", solid: "bg-land-coral" },
  { verb: "Progresser", when: "chaque semaine", anchor: "progresser", soft: "bg-land-sun-soft", solid: "bg-land-sun-ink" },
];

// Introduction de « La méthode ». Rendue deux fois, une seule visible : dans
// la section (téléphone, tablette, mouvement réduit) ou, en mode épinglé, à
// gauche du brief replié en fin de haut de page (cf. HeroStage).
export function MethodIntro() {
  return (
    <>
      <h2 className={`${H2} max-w-[16ch]`}>
        <span className="text-land-ink">Trois moments.</span>{" "}
        <span className="text-land-faint">Un seul objectif : le closing.</span>
      </h2>
      <p className="mt-6 max-w-[54ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
        Suivez un rendez-vous, de la veille au point d&apos;équipe. Brief s&apos;organise exactement comme le
        travail d&apos;un commercial, rien d&apos;autre.
      </p>
      {/* Les trois moments annoncés d'emblée, numérotés, dans leur couleur et
          reliés par un trait : la structure se lit avant même d'entrer dans
          la séquence. Verticale, elle tient aussi dans la colonne étroite du
          haut de page épinglé. */}
      <ol className="relative mt-8 space-y-3" aria-label="Les trois moments">
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
      <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:pt-32">
        <MethodIntro />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <Journey steps={STEPS} />
      </div>
    </section>
  );
}

// ─── Managers ────────────────────────────────────────────────────────────────

// Section manager (refaite le 12/10/2026). Le graphique des scores par
// dimension est retiré : le tableau de bord Performance, plus haut, le montre
// déjà. Ici, ce qui distingue Brief — la méthode du manager, appliquée à
// chaque call — montrée sur la vraie page Playbook, puis le bilan du vendredi.
export function ManagerSection() {
  return (
    <section id="manager" className="scroll-mt-20 border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 className={`${H2} max-w-[17ch]`}>
          <span className="text-land-ink">Vous fixez la méthode.</span>{" "}
          <span className="text-land-faint">Brief l&apos;applique à chaque call.</span>
        </h2>
        <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Vos dimensions, leur poids, les questions qui comptent, une consigne par étape du cycle. Importée depuis
          Notion ou un document, modifiable à tout moment : c&apos;est sur cette grille, la vôtre, que chaque call est
          noté.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <PlaybookPreview />
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
                "Une grille par équipe, des consignes par étape R1, R2, R3.",
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

// Développés le 12/10/2026 à la demande de Jean : un carrousel de grands
// témoignages (portrait + citation) puis trois cartes à chiffre clé, sur le
// modèle de lemlist et PayFit. Seul celui de Camille Duval est réel ; les
// autres sont INVENTÉS pour la maquette interne et retirés du build de
// production (cf. testimonials-data.ts). Tant qu'il en reste à l'écran, un
// bandeau le dit, pour que personne ne les prenne pour de vrais clients.
export function Testimonials() {
  const featured = visibleTestimonials(FEATURED);
  const cards = visibleTestimonials(CARDS);
  const mock = [...featured, ...cards].some((t) => t.fictional);
  return (
    <section className="border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        {mock && (
          <p className="mb-8 inline-flex items-center gap-2 rounded-full bg-land-sun-soft px-3 py-1.5 text-[12.5px] font-medium text-land-sun-ink">
            Maquette interne{NB}: témoignages fictifs, sauf Camille Duval. À remplacer avant la mise en ligne.
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
                  <CompanyMark name={t.company} color={t.color} size={24} />
                  {t.company}
                </div>
                {t.metric && (
                  <div className="mt-6 border-b border-land-line pb-5">
                    <div className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-land-accent">{t.metric.value}</div>
                    <div className="mt-2 text-[14px] leading-snug text-land-muted">{t.metric.label}</div>
                  </div>
                )}
                <blockquote className="mt-5 flex-1 text-[16.5px] leading-relaxed text-land-ink">
                  « {t.quote[0]} <span className="text-land-muted">{t.quote[1]} »</span>
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
  notion: "Notion",
  "microsoft-word": "Word",
};

// Ce que Brief fait de chaque outil — vérifié dans le code le 12/10/2026 :
// lecture d'agenda et dépôt du brief dans l'événement Google
// (lib/google-calendar.ts), bot « Brief Notetaker » et son message d'annonce
// (lib/recall.ts), brief et analyse vers HubSpot, Pipedrive, Slack et email
// (lib/notifications-dispatcher.ts), envoi seul sur Gmail et Outlook
// (scopes gmail.send et Mail.Send), import du playbook Notion / Word / PDF.
const STACK_CARDS: { title: string; logos: string[]; points: string[] }[] = [
  { title: "Agenda", logos: ["google-calendar", "microsoft-outlook"], points: [`Brief lit vos rendez-vous à venir et repère ceux avec des prospects.`, `Sur Google Agenda, le brief est déposé dans l'événement.`] },
  { title: "Visio", logos: ["google-meet", "microsoft-teams", "zoom"], points: [`Le bot « Brief Notetaker » rejoint la visio, enregistre et transcrit.`, `Il annonce l'enregistrement dans le chat, dès son arrivée.`] },
  { title: "CRM", logos: ["hubspot", "pipedrive"], points: [`Le brief et le compte rendu du call arrivent dans la fiche.`, `L'historique du CRM nourrit le brief du rendez-vous suivant.`] },
  { title: "Email", logos: ["gmail", "microsoft-outlook"], points: [`L'email de suivi part de votre adresse, après relecture.`, `Brief n'a aucun accès en lecture à votre messagerie.`] },
  { title: "Slack", logos: ["slack"], points: [`Brief et analyse du call en message privé.`, `Pour lire l'essentiel sans ouvrir Brief.`] },
  { title: "Playbook", logos: ["notion", "microsoft-word"], points: [`Importez votre méthode depuis Notion, Word ou PDF.`, `Dimensions, poids et questions, prêts à noter les calls.`] },
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
  const inner = ["google-calendar", "microsoft-outlook", "gmail", "slack", "notion"];
  const outer = ["google-meet", "microsoft-teams", "zoom", "hubspot", "pipedrive", "microsoft-word"];
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
                  {["Vos rendez-vous à venir", "Les visios, enregistrées et transcrites", "L'historique de votre CRM", "Votre playbook"].map((t) => (
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
                  {["Le brief, la veille au soir", "Le compte rendu noté du call", "L'email de suivi, prêt à partir", "Le bilan du vendredi"].map((t) => (
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
// Développée le 12/10/2026 (13 questions en trois thèmes). Chaque réponse est
// vérifiable dans le code : bot « Brief Notetaker » et son message d'annonce
// (lib/recall.ts), canaux de diffusion du brief (lib/notifications-dispatcher.ts),
// scope Gmail limité à l'envoi (lib/auth.ts), régions Paris / Francfort,
// grille par défaut à quatre dimensions, vue commerciale limitée à sa ligne.
const FAQ_GROUPS = [
    {
      title: "Le produit",
      items: [
        { q: `Comment Brief augmente concrètement le taux de closing ?`, a: `En travaillant trois leviers : arriver préparé, savoir ce qui a marché ou pas (un débrief noté, adapté à l'étape R1, R2 ou R3), et capitaliser en équipe grâce à la bibliothèque d'objections.` },
        { q: `Comment Brief rejoint mes rendez-vous ?`, a: `Vous connectez votre agenda Google ou Outlook. Brief détecte les visios (Meet, Teams, Zoom) et y envoie son bot, « Brief Notetaker », qui enregistre et transcrit. Vous pouvez exclure des rendez-vous manuellement.` },
        { q: `Comment fonctionne l'analyse par étape R1, R2, R3 ?`, a: `Le manager configure une fois les motifs de titre de rendez-vous (« Rencontre X » pour la découverte, « Présentation X » pour la démo…) et les consignes propres à chaque étape. Brief évalue ensuite chaque call selon les critères de son étape, entièrement modifiables : un R1 n'est pas jugé comme un R3.` },
        { q: `Mon playbook est dans Notion ou dans un document : comment l'importer ?`, a: `Connectez Notion, ou importez un PDF ou un fichier Word, ou collez simplement le texte. Brief en extrait les dimensions, leur poids et les questions ; vous relisez et ajustez avant d'enregistrer. Sans playbook, une grille par défaut en quatre dimensions s'applique.` },
        { q: `Où mes commerciaux reçoivent-ils leurs briefs ?`, a: `Dans Brief, et là où ils travaillent déjà, selon les canaux activés : par email la veille, dans la description de l'événement Google Agenda, dans les notes HubSpot ou Pipedrive, ou en message Slack.` },
        { q: `Mes commerciaux voient-ils leurs notes ?`, a: `Oui : chacun voit ses calls, sa progression et la grille sur laquelle il est noté. Le classement nominatif de l'équipe reste une vue manager ; un commercial ne voit que sa propre ligne et la moyenne d'équipe.` },
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
        { q: `Puis-je tester Brief ?`, a: `Oui. Créez votre compte avec Google ou Microsoft et préparez jusqu'à ${BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour, sans carte bancaire. L'analyse des calls et le suivi d'équipe se mettent en place avec nous : prenez rendez-vous, on configure Brief pour votre équipe.` },
        { q: `Combien de temps pour démarrer ?`, a: `Deux minutes pour connecter l'agenda ; le premier brief arrive la veille du prochain rendez-vous. Pour l'analyse des calls et le suivi d'équipe, on accompagne la mise en place sur huit semaines, avec un point chaque semaine.` },
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
              href="/login"
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
            Pour l&apos;analyse des calls et le suivi d&apos;équipe, on met Brief en place avec vous.
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
                Un coach de l&apos;équipe Brief vous accompagne huit semaines, un point par semaine, une brique à la fois.
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
    body: "En arrivant dans la visio, le bot « Brief Notetaker » annonce dans le chat qu'il enregistre, et propose de quitter la réunion si quelqu'un le préfère.",
  },
  {
    icon: Mail,
    title: "Aucune lecture de vos emails",
    body: "Sur Gmail comme sur Outlook, Brief n'a que le droit d'envoyer un email en votre nom, jamais celui de lire votre messagerie.",
  },
  {
    icon: Lock,
    title: "Chacun voit ce qu'il doit voir",
    body: "Un commercial voit ses propres calls ; un manager, ceux de son équipe. Les sessions d'entraînement restent privées : le manager n'en voit que des compteurs.",
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

        <div className="mt-16 grid grid-cols-1 gap-10 rounded-[24px] bg-land-surface p-6 ring-1 ring-land-line sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-land-ink md:text-[36px]">
              Qui traite quoi
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-land-muted">
              Chaque prestataire n&apos;accède qu&apos;aux données nécessaires à sa tâche. La liste complète figure dans
              notre politique de confidentialité.
            </p>
            <Link
              href="/confidentialite"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-land-line px-5 text-[15px] font-medium text-land-ink transition-colors hover:bg-land-sunken"
            >
              Politique de confidentialité <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <dl className="divide-y divide-land-line">
            {[
              ["Base de données et application", "Supabase et Vercel, à Paris"],
              ["Enregistrement et transcription des visios", "Recall.ai, région Europe (Francfort)"],
              ["Briefs, analyses et brouillons d'email", "Anthropic (modèles Claude), dans le cadre de son offre professionnelle"],
              ["Emails envoyés par Brief", "Resend"],
              ["Vos outils, si vous les connectez", "Google, Microsoft, HubSpot, Pipedrive, Notion, Slack"],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-1 gap-1 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-6">
                <dt className="text-[14.5px] font-medium text-land-ink">{k}</dt>
                <dd className="text-[14.5px] text-land-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
