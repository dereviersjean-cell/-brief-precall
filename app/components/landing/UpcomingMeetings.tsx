import { ArrowRight, Calendar, Plus, Sparkles } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { ValdorLogo, CartonnerieLogo } from "./brands";
import { NB } from "./team-data";

// La page Brief de l'app (« Vos prochains rendez-vous », BriefToolClient),
// reproduite au format réel du point de vue de Thomas, un jeudi à 13:10 :
// en-tête, tuiles « RDV à venir » et « Taux de préparation », rendez-vous
// groupés par jour (Aujourd'hui, Demain, date), et dans chaque carte l'heure,
// la durée, le logo, le titre, les participants, les badges « Dans 1 h »,
// « Brief généré », « Ajouté manuellement » et le bouton « Préparer le
// brief » ou « Revoir ». Colonne « Briefs récents » à droite.
// Vue fixe, sans interaction (choix de Jean, 12/10/2026) : elle montre la page
// telle qu'elle est, rien de plus. Données fictives.

type Meeting = {
  id: string;
  day: string;
  time: string;
  duration: number;
  title: string;
  company: string;
  color: string;
  attendees: string;
  next?: string;
  manual?: boolean;
  /** Brief déjà généré (la veille à 18:00, ou à la main). */
  brief: boolean;
};

const MEETINGS: Meeting[] = [
  {
    id: "valdor",
    day: "Aujourd'hui",
    time: "14:30",
    duration: 45,
    title: "Présentation Valdor Emballages",
    company: "Valdor Emballages",
    color: "#0B6B58",
    attendees: "Claire Mercier, Hugo Ravel",
    next: "Dans 1 h",
    brief: true,
  },
  {
    id: "arvel",
    day: "Aujourd'hui",
    time: "16:30",
    duration: 30,
    title: "Découverte Arvel Industrie",
    company: "Arvel Industrie",
    color: "#4B5BA8",
    attendees: "Paul Garnier",
    brief: true,
  },
  {
    id: "kalio",
    day: "Demain",
    time: "10:00",
    duration: 30,
    title: "Découverte Kalio Santé",
    company: "Kalio Santé",
    color: "#1E8C93",
    attendees: "Inès Haddad",
    brief: false,
  },
  {
    id: "sorel",
    day: "Demain",
    time: "12:30",
    duration: 60,
    title: "Déjeuner Groupe Sorel",
    company: "Groupe Sorel",
    color: "#9A6B2F",
    attendees: "Antoine Sorel",
    manual: true,
    brief: false,
  },
  {
    id: "novaterm",
    day: "Lundi 6 octobre",
    time: "10:00",
    duration: 45,
    title: "Closing Novaterm Industrie",
    company: "Novaterm Industrie",
    color: "#C2453A",
    attendees: "Élodie Marchetti, Jean-Luc Perret",
    brief: true,
  },
];

const RECENT = [
  { name: "Valdor Emballages", when: "1er octobre, 18:00", logo: "valdor" },
  { name: "Arvel Industrie", when: "1er octobre, 18:00", color: "#4B5BA8" },
  { name: "Novaterm Industrie", when: "30 septembre, 11:12", color: "#C2453A" },
  { name: "Cartonnerie du Val", when: "26 septembre, 18:00", logo: "cartonnerie" },
];


function Logo({ company, color, size = 28 }: { company: string; color?: string; size?: number }) {
  if (company.startsWith("Valdor")) return <ValdorLogo size={size} />;
  if (company.startsWith("Cartonnerie")) return <CartonnerieLogo size={size} />;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg font-bold text-white"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {company[0]}
    </span>
  );
}

export function UpcomingMeetings() {
  const prepared = MEETINGS.filter((m) => m.brief).length;
  const rate = Math.round((100 * prepared) / MEETINGS.length);
  const days = [...new Set(MEETINGS.map((m) => m.day))];

  return (
    <div className="overflow-hidden rounded-[22px] border border-land-line bg-land-bg shadow-[var(--land-shadow-lg)]">
      <div className="flex">
        <AppSidebar active="brief" note="3 briefs prêts pour demain, préparés hier soir." />
        <div className="min-w-0 flex-1 p-3 sm:p-5">
          {/* En-tête de la page Brief */}
          <div className="relative overflow-hidden rounded-[20px] border border-land-line bg-land-surface p-5 sm:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-land-accent-soft blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-land-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-land-accent">
                  <Sparkles className="h-3 w-3" aria-hidden /> Préparation IA
                </span>
                <div className="text-[21px] font-bold tracking-tight text-land-ink">Vos prochains rendez-vous</div>
                <div className="mt-0.5 text-[13px] text-land-muted">{MEETINGS.length} RDV à venir · Google Agenda</div>
              </div>
              <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-land-line bg-land-surface px-3.5 text-[13px] font-medium text-land-muted">
                <Plus className="h-4 w-4" aria-hidden /> Ajouter un RDV
              </span>
            </div>
          </div>

          {/* Tuiles */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-land-line bg-land-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-land-faint">RDV à venir</span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-land-accent-soft text-land-accent">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <div className="mt-2 text-[26px] font-semibold leading-none tabular-nums text-land-ink">{MEETINGS.length}</div>
            </div>
            <div className="rounded-2xl border border-land-line bg-land-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-land-faint">Taux de préparation</span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <div className="mt-2 text-[26px] font-semibold leading-none tabular-nums text-land-ink">
                {rate}
                <span className="ml-0.5 text-[14px] font-medium text-land-faint">%</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_250px]">
            {/* Rendez-vous par jour */}
            <div className="space-y-6">
              {days.map((day) => (
                <div key={day}>
                  <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-land-faint">{day}</div>
                  <div className="space-y-2">
                    {MEETINGS.filter((m) => m.day === day).map((m) => {
                      const isReady = m.brief;
                      return (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-land-line bg-land-surface"
                        >
                          <div className="flex items-center gap-3 px-3.5 py-3 sm:gap-5 sm:px-4">
                            <div className="w-12 shrink-0 text-center sm:w-14">
                              <div className="text-[16px] font-bold tabular-nums text-land-ink sm:text-[17px]">{m.time}</div>
                              <div className="text-[11.5px] text-land-faint">
                                {m.duration}
                                {NB}min
                              </div>
                            </div>
                            <span className="h-10 w-px shrink-0 bg-land-line" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Logo company={m.company} color={m.color} />
                                <span className="text-[14px] font-semibold leading-snug text-land-ink sm:truncate">{m.title}</span>
                                {m.manual && (
                                  <span className="rounded-full bg-land-sunken px-2 py-0.5 text-[11.5px] font-medium text-land-muted">
                                    Ajouté manuellement
                                  </span>
                                )}
                                {m.next && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-land-accent-soft px-2 py-0.5 text-[11.5px] font-medium text-land-accent">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-land-accent opacity-75" />
                                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-land-accent" />
                                    </span>
                                    {m.next}
                                  </span>
                                )}
                                {isReady && (
                                  <span className="rounded-full bg-land-accent-soft px-2 py-0.5 text-[11.5px] font-medium text-land-accent">
                                    Brief généré
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 truncate text-[12.5px] text-land-muted">{m.attendees}</div>
                            </div>
                            <div className="shrink-0">
                              {isReady ? (
                                <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-land-line bg-land-surface px-3 text-[13px] font-medium text-land-ink">
                                  Revoir <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                                </span>
                              ) : (
                                <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-land-accent px-3 text-[13px] font-medium text-white shadow-sm">
                                  <span className="hidden sm:inline">Préparer le brief</span>
                                  <span className="sm:hidden">Préparer</span>
                                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Briefs récents */}
            <div className="rounded-2xl border border-land-line bg-land-surface p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-land-faint">Briefs récents</div>
              <ul className="space-y-0.5">
                {RECENT.map((b) => (
                  <li key={b.name} className="-mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-2">
                    {b.logo === "valdor" ? (
                      <ValdorLogo size={30} />
                    ) : b.logo === "cartonnerie" ? (
                      <CartonnerieLogo size={30} />
                    ) : (
                      <Logo company={b.name} color={b.color} size={30} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-land-ink">{b.name}</span>
                      <span className="block text-[11.5px] text-land-faint">{b.when}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-land-faint" aria-hidden />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-land-line bg-land-surface px-5 py-2.5 text-[11.5px] text-land-faint">
        Exemple au format réel de la page Brief. Entreprises et personnes fictives.
      </div>
    </div>
  );
}
