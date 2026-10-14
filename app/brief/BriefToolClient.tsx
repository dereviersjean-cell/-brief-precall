"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Plus, ArrowRight, X, Check, CircleDashed, ChevronLeft, ChevronRight } from "lucide-react";
import CompanyLogo from "@/app/components/CompanyLogo";
import TalkToSales from "@/app/components/TalkToSales";
import { EventsSkeleton } from "./BriefSkeleton";
import { useModules } from "@/app/components/ModulesProvider";
import { BRIEFS_ACCESS_DAILY_LIMIT, SALES_CONTACT } from "@/lib/sales-contact";
import { GENERIC_EMAIL_DOMAINS, companyDomainFromEmail } from "@/lib/company-domain";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees: Array<{ name?: string; email: string }>;
  // Présents uniquement sur un RDV ajouté à la main (pas de bot Recall, pas
  // d'écriture dans un vrai agenda — voir migration 012). `company` est le
  // nom saisi explicitement à la création : contrairement à un événement de
  // calendrier réel, on ne le devine jamais depuis un domaine email.
  manual?: boolean;
  company?: string;
  // Le nom saisi à la création. Il ne peut pas voyager dans `attendees` :
  // un invité au sens agenda a forcément une adresse, or ici le nom seul
  // suffit à retrouver la personne dans l'annuaire (nom + entreprise).
  contactName?: string;
}

interface StoredBrief {
  id: string;
  company_name: string | null;
  // Null tant que la migration 010 n'est pas passée, ou pour un brief
  // enregistré avant elle : on retombe alors sur company_name à l'affichage.
  meeting_title?: string | null;
  contact_email: string | null;
  calendar_event_id: string | null;
  model_used: string | null;
  created_at: string;
}

function domainToCompany(domain: string): string {
  const name = domain.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const DISPLAY_TLDS = /\.(com|fr|ai|io|co|net|org|eu|be|app|tech|dev|uk|de|es|it|nl|ch|ca|au|me|biz|info|saas)$/i;

function formatCompanyName(name: string | null): string {
  if (!name) return "—";
  return name
    .replace(DISPLAY_TLDS, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// L'interlocuteur du rendez-vous. lib/calendar.ts ne renvoie DÉJÀ que les
// participants externes (domaine différent de celui de l'utilisateur), donc
// le premier de la liste est le bon — sans filtrer sur le domaine.
//
// C'est la correction du 21/08/2026 : une seule fonction servait deux besoins
// opposés. Elle excluait les domaines génériques, ce qui est juste pour
// DEVINER UNE ENTREPRISE (on ne déduit rien de « gmail.com ») mais faux pour
// IDENTIFIER UN CONTACT. Conséquence : tout prospect sur Gmail — la majorité
// des indépendants et petites structures en France — produisait un brief sans
// contact, et le panneau « Contacts » restait vide.
// Le NOM est rendu avec l'adresse : Google le fournit (displayName de
// l'invité) et un RDV manuel le porte désormais aussi, mais le type de retour
// ne rendait que l'email — l'information était disponible et jetée. C'est
// pourtant elle qui permet de retrouver la personne dans l'annuaire quand son
// adresse n'y figure pas.
function getContactAttendee(event: CalendarEvent): { email: string; name?: string } | null {
  return event.attendees[0] ?? null;
}

// Pour l'entreprise, en revanche, le filtre reste indispensable : « gmail.com »
// ne donnerait « Gmail » comme nom de société.
// Les paramètres d'identité du contact pour l'URL du brief. Le NOM part même
// sans adresse : c'est lui qui rend un poste et un parcours quand l'annuaire
// ne connaît pas l'adresse — ou quand il n'y en a pas. Pour un RDV manuel il
// vient de la saisie (`contactName`), pas d'`attendees`, qui exige un email.
function contactParams(event: CalendarEvent): string {
  const attendee = getContactAttendee(event);
  const email = attendee?.email ?? null;
  const name =
    attendee?.name && attendee.name !== attendee.email
      ? attendee.name
      : event.contactName ?? null;
  return (
    (email ? `&contactEmail=${encodeURIComponent(email)}` : "") +
    (name ? `&contactName=${encodeURIComponent(name)}` : "")
  );
}

function getCompanyAttendee(event: CalendarEvent): { email: string } | null {
  return event.attendees.find((a) => {
    const domain = a.email.split("@")[1] ?? "";
    return !GENERIC_EMAIL_DOMAINS.has(domain);
  }) ?? null;
}

function getCompanyFromDomain(event: CalendarEvent): string | null {
  const hit = getCompanyAttendee(event);
  if (!hit) return null;
  return domainToCompany(hit.email.split("@")[1] ?? "");
}

// Cache de page, en mémoire du navigateur : il survit aux navigations dans
// l'app (changer d'onglet puis revenir) mais pas à un rechargement ni à une
// déconnexion, qui repartent de zéro — aucun risque de montrer l'agenda d'un
// autre compte.
const pageCache: { events: CalendarEvent[] | null; briefs: StoredBrief[] | null } = { events: null, briefs: null };

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Toutes les dates de cette page en heure de Paris : elle est rendue par le
// serveur (UTC sur Vercel) puis reprise par le navigateur. Sans fuseau fixé,
// les heures (« 08:00 » contre « 10:00 ») et le découpage par jour
// différeraient entre les deux rendus.
const TZ = "Europe/Paris";
const PARIS_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

// « AAAA-MM-JJ » du jour, à Paris.
function parisDayKey(d: Date | string): string {
  return PARIS_KEY.format(typeof d === "string" ? new Date(d) : d);
}

// Le jour `n` jours après `key` (calcul sur la date seule, sans heure).
function shiftDayKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });
}

function formatTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function dayLabel(iso: string) {
  const key = parisDayKey(iso);
  const today = parisDayKey(new Date());
  if (key === today) return "Aujourd'hui";
  if (key === shiftDayKey(today, 1)) return "Demain";
  return formatDate(iso);
}

function groupByDay<T>(items: T[], getDate: (item: T) => string): [string, T[]][] {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = parisDayKey(getDate(item));
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return Object.entries(groups);
}

function eventStartDate(e: CalendarEvent) {
  return e.start.dateTime ?? e.start.date ?? "";
}

function eventDuration(e: CalendarEvent) {
  const s = new Date(e.start.dateTime ?? e.start.date ?? "");
  const end = new Date(e.end.dateTime ?? e.end.date ?? "");
  return Math.max(0, Math.round((end.getTime() - s.getTime()) / 60000));
}

// Only meaningful within the next 24h — beyond that a live countdown reads
// as noise rather than a useful "get ready" signal, so callers treat null
// as "don't badge this one".
function timeUntil(iso: string): string | null {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Dans un instant";
  if (diffMin < 60) return `Dans ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Dans ${diffH} h`;
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Dégradé pastel propre à chaque entreprise (maquette S2a, choisie par Jean
// le 14/10/2026, puis passée en dégradés sans rose le même jour) : on n'a pas
// la couleur de la marque, on en dérive une, stable, du nom — la même
// entreprise garde la même teinte d'un jour à l'autre. Teintes froides et
// ambre seulement : indigo, bleu, ciel, sarcelle, émeraude, violet, ambre.
const TINT_HUES = [265, 240, 215, 190, 160, 290, 75];
function tintFor(key: string): { bg: string; ring: string; ink: string } {
  let h = 0;
  for (const c of key.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = TINT_HUES[h % TINT_HUES.length];
  const next = hue + 28;
  return {
    bg: `linear-gradient(110deg, oklch(0.955 0.04 ${hue}) 0%, oklch(0.975 0.025 ${next}) 45%, oklch(0.995 0.006 ${next}) 100%)`,
    ring: `oklch(0.92 0.035 ${hue})`,
    ink: `oklch(0.5 0.14 ${hue})`,
  };
}

function initialsOf(label: string): string {
  if (label.includes("@")) return label.charAt(0).toUpperCase();
  return label
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CalendarEventCard({
  event,
  onPrepare,
  onDelete,
  existingBrief,
  nextLabel,
}: {
  event: CalendarEvent;
  onPrepare: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  existingBrief?: StoredBrief;
  nextLabel: string | null;
}) {
  const start = eventStartDate(event);
  const duration = eventDuration(event);
  const companyLabel = event.company || getCompanyFromDomain(event) || event.summary;
  const tint = tintFor(companyLabel);
  const contact = getContactAttendee(event);
  const contactLabel =
    event.attendees.length > 0
      ? event.attendees.map((a) => a.name ?? a.email).join(", ")
      : event.contactName ?? "Aucun participant externe";

  return (
    // Pas d'animation d'entrée : décalées ligne par ligne, elles retardaient
    // l'affichage d'une demi-seconde à chaque visite (retour de Jean, 14/10).
    <li
      className="relative rounded-[18px] transition-shadow hover:shadow-[0_14px_32px_-16px_rgba(15,23,42,0.3)]"
      style={{ background: tint.bg, boxShadow: `inset 0 0 0 1px ${tint.ring}` }}
    >
      {/* Sous `sm`, les actions passent sur une seconde ligne : sur 375 px,
          l'heure, le titre et le bouton ne tiennent pas côte à côte. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:flex-nowrap sm:px-5">
        <div className="w-12 shrink-0 sm:w-[64px]">
          <div className="text-[15px] font-semibold tabular-nums text-slate-900">{formatTime(start)}</div>
          <div className="text-[12px] tabular-nums text-slate-400">{duration > 0 ? `${duration} min` : "—"}</div>
        </div>
        {/* Le logo de l'entreprise rencontrée, en grand : c'est lui qu'on
            reconnaît d'un coup d'œil. Trouvé par le serveur à partir du domaine
            du participant et du nom de l'entreprise (app/api/company-logo, mis
            en cache) ; l'initiale, teintée comme la carte, sinon. */}
        <CompanyLogo
          domain={companyDomainFromEmail(getCompanyAttendee(event)?.email)}
          name={event.company || getCompanyFromDomain(event)}
          alt={companyLabel}
          className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-white"
          fallback={
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[17px] font-semibold shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
              style={{ color: tint.ink }}
            >
              {companyLabel.charAt(0).toUpperCase()}
            </span>
          }
        />
        <div className="min-w-0 flex-1 basis-[160px]">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 truncate text-[15.5px] font-semibold leading-snug text-slate-900">{event.summary}</h3>
            {nextLabel && (
              // Compte à rebours calculé au serveur puis au navigateur, à
              // quelques instants d'écart : une minute de différence au
              // passage d'un seuil n'est pas une erreur.
              <span suppressHydrationWarning className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)]">{nextLabel}</span>
            )}
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[13px] text-slate-500">
            {(contact || event.contactName) && (
              <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-white text-[9.5px] font-semibold text-slate-600">
                {initialsOf(contact?.name ?? event.contactName ?? contact?.email ?? "?")}
              </span>
            )}
            <span className="truncate">{contactLabel}</span>
            {event.manual && (
              <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[11.5px] font-semibold text-slate-500 max-sm:hidden">Ajouté manuellement</span>
            )}
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-3 whitespace-nowrap sm:w-auto">
          {existingBrief ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-700">
              <Check className="h-4 w-4" /> Brief prêt
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-400 max-[400px]:hidden">
              <CircleDashed className="h-4 w-4" /> À préparer
            </span>
          )}
          {existingBrief ? (
            <Link
              // Préchargé en entier : le brief existe déjà, l'ouvrir doit être
              // instantané plutôt que de passer par son écran de chargement.
              prefetch
              href={`/brief/${existingBrief.calendar_event_id ?? existingBrief.id}?company=${encodeURIComponent(existingBrief.company_name ?? "")}&cached=true&contactEmail=${encodeURIComponent(existingBrief.contact_email ?? "")}&title=${encodeURIComponent(existingBrief.meeting_title ?? "")}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-white/70 px-4 text-[13.5px] font-semibold text-slate-900 transition-colors hover:bg-white"
            >
              Revoir <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              onClick={() => onPrepare(event)}
              // Pas de bouton bleu plein par ligne : il noyait la page dans le
              // bleu (retour de Jean, 13/10/2026).
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-semibold text-[color:var(--violet)] shadow-[0_1px_2px_rgba(42,92,224,0.12)] ring-1 ring-[color:var(--lavender-strong)] transition-colors hover:bg-[color:var(--lavender)]"
            >
              Préparer le brief <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {event.manual && onDelete && (
            <button
              onClick={() => onDelete(event.id)}
              aria-label="Supprimer ce rendez-vous"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-[color:var(--danger-soft)] hover:text-rose-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// Préparation de la semaine : une barre plutôt qu'un grand anneau, pour que
// la colonne de gauche reste étroite (retour de Jean, 14/10/2026).
function PrepBar({ ready, total }: { ready: number; total: number }) {
  const pct = total > 0 ? Math.round((ready / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="font-semibold text-slate-900">Préparation</span>
        <span className="tabular-nums text-slate-500">
          {total === 0 ? "aucun RDV" : `${ready}/${total} brief${ready > 1 ? "s" : ""} prêt${ready > 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2A5CE0] to-[#7B5CFF] transition-[width] duration-500"
          style={{ width: `${Math.max(pct, total > 0 && ready > 0 ? 6 : 0)}%` }}
        />
      </div>
    </div>
  );
}

const PANEL =
  "rounded-[20px] bg-white/85 shadow-[0_1px_2px_rgba(42,92,224,0.06),0_8px_24px_-14px_rgba(42,92,224,0.2)] ring-1 ring-[color:var(--lavender-strong)] backdrop-blur";

// Mini-calendrier du mois (maquette S2a), compact : aujourd'hui en bleu, un
// point sous chaque jour qui a des rendez-vous — vert quand tous ont leur
// brief. Un clic descend au jour. Les mois se feuillettent, mais l'agenda ne
// remonte que les sept prochains jours : les autres mois restent sans point.
// La préparation vit en pied de la même carte.
function MonthCalendar({
  events,
  briefs,
  ready,
  total,
}: {
  events: CalendarEvent[];
  briefs: StoredBrief[];
  ready: number;
  total: number;
}) {
  const [offset, setOffset] = useState(0);
  // Calendrier construit sur les dates parisiennes (voir TZ) : mêmes cases
  // au serveur et au navigateur.
  const todayKey = parisDayKey(new Date());
  const [ty, tm] = todayKey.split("-").map(Number);
  const first = new Date(Date.UTC(ty, tm - 1 + offset, 1));
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const title = first.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className={`${PANEL} p-3`}>
      <div className="flex items-center justify-between pl-1.5">
        <span className="text-[13px] font-semibold text-slate-900 first-letter:uppercase">{title}</span>
        <span className="flex text-slate-400">
          <button type="button" aria-label="Mois précédent" onClick={() => setOffset((o) => o - 1)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-slate-100 hover:text-slate-700">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="Mois suivant" onClick={() => setOffset((o) => o + 1)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-slate-100 hover:text-slate-700">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-[10.5px] font-medium text-slate-400">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-7 text-center text-[12px]">
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const key = new Date(Date.UTC(year, month, i + 1)).toISOString().slice(0, 10);
          const isTodayCell = key === todayKey;
          const past = key < todayKey;
          const dayEvents = events.filter((e) => parisDayKey(eventStartDate(e)) === key);
          const allReady = dayEvents.length > 0 && dayEvents.every((e) => briefs.some((b) => b.calendar_event_id === e.id));
          return (
            <button
              key={key}
              type="button"
              disabled={dayEvents.length === 0}
              onClick={() => document.getElementById(dayAnchor(key))?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="relative grid h-7 place-items-center disabled:cursor-default"
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full tabular-nums transition-colors ${
                  isTodayCell
                    ? "bg-gradient-to-br from-[#2A5CE0] to-[#6A4BE8] font-semibold text-white shadow-[0_4px_10px_-3px_rgba(42,92,224,0.6)]"
                    : past
                      ? "text-slate-300"
                      : dayEvents.length > 0
                        ? "font-semibold text-slate-900 hover:bg-[color:var(--lavender)]"
                        : "text-slate-600"
                }`}
              >
                {i + 1}
              </span>
              {dayEvents.length > 0 && (
                <span className={`absolute bottom-0 h-1 w-1 rounded-full ${allReady ? "bg-emerald-500" : "bg-[color:var(--violet)]"}`} />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 border-t border-slate-100 px-1.5 pt-3">
        <PrepBar ready={ready} total={total} />
      </div>
    </div>
  );
}

function DayHeader({ dayKey, today, count }: { dayKey: string; today: boolean; count: number }) {
  return (
    // Collé sous la TopBar (h-14), z-index en dessous d'elle.
    <div className="sticky top-14 z-[5] -mx-2 flex items-center gap-3 px-2 py-2 backdrop-blur-md">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[18px] font-semibold tabular-nums ${
          today
            ? "bg-gradient-to-br from-[#2A5CE0] to-[#6A4BE8] text-white shadow-[0_6px_16px_-8px_rgba(76,63,214,0.8)]"
            : "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
        }`}
      >
        {Number(dayKey.slice(8))}
      </span>
      <div>
        {/* Midi à Paris pour ce jour : dayLabel reste sur le bon jour quel que
            soit le fuseau qui calcule. */}
        <h2 className="text-[16px] font-semibold text-slate-900 first-letter:uppercase">{dayLabel(`${dayKey}T10:00:00Z`)}</h2>
        <div className="text-[12.5px] text-slate-500">{count === 0 ? "Aucun rendez-vous" : `${count} RDV`}</div>
      </div>
    </div>
  );
}

function dayAnchor(dayKey: string) {
  return `jour-${dayKey.replace(/\s+/g, "-")}`;
}

function CompanyModal({
  event,
  defaultCompany,
  onConfirm,
  onClose,
}: {
  event: CalendarEvent;
  defaultCompany: string;
  onConfirm: (eventId: string, company: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(defaultCompany || event.summary);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="mb-1 text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Nom de l&apos;entreprise ?</h2>
        <p className="mb-4 text-[13.5px] leading-relaxed text-slate-500">
          Précisez le nom pour générer un brief précis.
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          placeholder="ex. Salesforce, HubSpot…"
          className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)] mb-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(event.id, value.trim());
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={() => value.trim() && onConfirm(event.id, value.trim())}
            disabled={!value.trim()}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white hover:brightness-110 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Générer le brief
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Formulaire pour un RDV absent de l'agenda synchronisé — sert uniquement à
// préparer un brief (voir le commentaire de CalendarEvent.manual). Le nom
// d'entreprise est demandé directement ici, jamais deviné après coup depuis
// un domaine email : contrairement à un événement de calendrier réel, un RDV
// manuel n'a pas toujours de contact renseigné.
function AddMeetingModal({
  onCreated,
  onClose,
}: {
  onCreated: (event: CalendarEvent) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  // Le nom du contact conditionne toute la fiche : l'annuaire retrouve
  // rarement quelqu'un sur sa seule adresse, alors qu'un nom accompagné de
  // l'entreprise suffit. Sans ce champ, un RDV créé ici n'avait aucune chance
  // d'obtenir un poste ni un parcours.
  const [contactName, setContactName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim() !== "" && company.trim() !== "" && date !== "" && time !== "";

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    const meetingTime = new Date(`${date}T${time}`);
    if (Number.isNaN(meetingTime.getTime())) {
      setError("Date ou heure invalide.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/manual-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          companyName: company.trim(),
          contactEmail: contactEmail.trim() || undefined,
          contactName: contactName.trim() || undefined,
          meetingTime: meetingTime.toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Erreur lors de la création du rendez-vous.");
        return;
      }
      onCreated((data as { event: CalendarEvent }).event);
    } catch {
      setError("Erreur lors de la création du rendez-vous.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="mb-1 text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Ajouter un rendez-vous</h2>
        <p className="mb-4 text-[13.5px] leading-relaxed text-slate-500">
          Pour un RDV absent de votre agenda synchronisé. Il ne sera pas enregistré automatiquement — seul un brief pourra être préparé.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Nom du rendez-vous</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="ex. Démo produit"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Entreprise</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="ex. Salesforce, HubSpot…"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Nom du contact (optionnel)
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="ex. Edmond Dantès"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Prénom + nom : c&apos;est ce qui permet de retrouver son poste et son parcours.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Email du contact (optionnel)</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="prenom@entreprise.com"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Heure</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
              />
            </div>
          </div>
        </div>

        {error && <p className="mb-3 text-[13px] text-rose-700">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white hover:brightness-110 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--lavender)]">
        <Calendar className="w-6 h-6 text-[color:var(--violet)]" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13.5px] leading-relaxed text-slate-500">{subtitle}</p>
    </div>
  );
}

function RecentBriefsCard({ briefs }: { briefs: StoredBrief[] }) {
  return (
    <section>
      <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        Briefs récents
      </h2>
      <div className="flex flex-wrap gap-2.5">
        {briefs.map((brief) => (
          <Link
            key={brief.id}
            prefetch
            href={`/brief/${brief.calendar_event_id ?? brief.id}?company=${encodeURIComponent(brief.company_name ?? "")}&cached=true&contactEmail=${encodeURIComponent(brief.contact_email ?? "")}&title=${encodeURIComponent(brief.meeting_title ?? "")}`}
            className="group inline-flex items-center gap-3 rounded-2xl border border-border bg-white py-2.5 pl-2.5 pr-4 transition-colors hover:border-slate-300"
          >
            <CompanyLogo
              domain={companyDomainFromEmail(brief.contact_email)}
              name={brief.company_name}
              alt={formatCompanyName(brief.company_name)}
              className="w-8 h-8 rounded-lg object-contain shrink-0 bg-white border border-border p-0.5"
              fallback={
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--lavender)]">
                  <span className="text-[12px] font-bold text-[color:var(--violet)]">
                    {formatCompanyName(brief.company_name).charAt(0).toUpperCase()}
                  </span>
                </div>
              }
            />
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold text-slate-900 group-hover:text-[color:var(--violet)] transition-colors">
                {formatCompanyName(brief.company_name)}
              </span>
              <span className="block text-[12px] tabular-nums text-slate-500">
                {new Date(brief.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: TZ,
                })}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// Lu côté serveur par app/brief/page.tsx : la page arrive déjà remplie.
export type BriefPageInitial = { events: CalendarEvent[] | null; error: string | null; briefs: StoredBrief[] };

export default function BriefToolClient({ initial = null }: { initial?: BriefPageInitial | null }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const provider = session?.provider ?? "google";
  const calendarLabel = provider === "azure-ad" ? "Microsoft Calendar" : "Google Calendar";
  // Repris du cache de la visite précédente : en revenant d'un autre onglet,
  // la page s'affiche aussitôt, puis se met à jour en arrière-plan.
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[] | null>(initial ? initial.events : pageCache.events);
  const [calendarError, setCalendarError] = useState<string | null>(initial?.error ?? null);

  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalDefaultCompany, setModalDefaultCompany] = useState("");
  const [recentBriefs, setRecentBriefs] = useState<StoredBrief[]>(initial ? initial.briefs.slice(0, 5) : pageCache.briefs ?? []);
  // Relu par le serveur (retour sur la page, RouterFreshness) : les nouvelles
  // données remplacent l'état — motif « ajuster l'état pendant le rendu ».
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (initial) {
      setCalendarEvents(initial.events);
      setCalendarError(initial.error);
      setRecentBriefs(initial.briefs.slice(0, 5));
    }
  }
  const serverLoaded = initial !== null;
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const { briefsOnly } = useModules();

  // Redirect to onboarding if authenticated but no profile yet
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (!data.hasProfile) router.push("/onboarding");
      })
      .catch(() => {});
  }, [status, router]);

  function handlePrepare(event: CalendarEvent) {
    const contactQuery = contactParams(event);
    const titleParam = event.summary ? `&title=${encodeURIComponent(event.summary)}` : "";
    // La date du rendez-vous n'est connue QUE d'ici : les événements d'agenda
    // vivent chez Google/Microsoft et le brief ne les relit jamais. Sans ce
    // paramètre, la page affichait l'heure de son propre chargement.
    const startsAt = eventStartDate(event);
    const startsAtParam = startsAt ? `&startsAt=${encodeURIComponent(startsAt)}` : "";
    // Un RDV manuel porte déjà son nom d'entreprise, saisi explicitement à la
    // création — jamais deviné depuis un domaine email comme pour un vrai
    // événement de calendrier (cf. le commentaire de getCompanyAttendee).
    const company = event.manual && event.company ? event.company : getCompanyFromDomain(event);
    if (company) {
      router.push(
        `/brief/${event.id}?company=${encodeURIComponent(company)}${contactQuery}${titleParam}${startsAtParam}`
      );
    } else {
      setModalDefaultCompany("");
      setModalEvent(event);
    }
  }

  function handleModalConfirm(eventId: string, company: string) {
    const contactQuery = modalEvent ? contactParams(modalEvent) : "";
    // Le titre du RDV vient de l'événement, pas de la saisie : c'est justement
    // parce que le nom d'entreprise était indevinable qu'on passe par ce modal.
    const titleParam = modalEvent?.summary ? `&title=${encodeURIComponent(modalEvent.summary)}` : "";
    const startsAt = modalEvent ? eventStartDate(modalEvent) : "";
    const startsAtParam = startsAt ? `&startsAt=${encodeURIComponent(startsAt)}` : "";
    setModalEvent(null);
    router.push(
      `/brief/${eventId}?company=${encodeURIComponent(company)}${contactQuery}${titleParam}${startsAtParam}`
    );
  }

  useEffect(() => {
    if (serverLoaded) return;
    fetch("/api/briefs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecentBriefs(data.slice(0, 5));
      })
      .catch(() => {});
  }, [serverLoaded]);

  // Extrait pour être rejouable après l'ajout ou la suppression d'un RDV
  // manuel, sans dupliquer la logique de chargement/erreur.
  function loadCalendarEvents() {
    fetch("/api/calendar/events")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCalendarEvents(data);
          setCalendarError(null);
        } else {
          setCalendarError((data as { error?: string }).error ?? "Erreur inconnue");
        }
      })
      .catch(() => setCalendarError(`Impossible de charger les événements ${calendarLabel}.`));
  }

  // Sans données serveur (pas de jeton d'agenda, erreur de lecture), lecture
  // depuis le navigateur, lancée dès l'affichage.
  useEffect(() => {
    if (serverLoaded) return;
    loadCalendarEvents();
  }, [serverLoaded]);

  useEffect(() => {
    pageCache.events = calendarEvents;
  }, [calendarEvents]);
  useEffect(() => {
    pageCache.briefs = recentBriefs;
  }, [recentBriefs]);

  function handleMeetingAdded(event: CalendarEvent) {
    setShowAddMeetingModal(false);
    setCalendarEvents((prev) =>
      [...(prev ?? []), event].sort(
        (a, b) => new Date(eventStartDate(a)).getTime() - new Date(eventStartDate(b)).getTime()
      )
    );
    setCalendarError(null);
  }

  function handleDeleteManualMeeting(eventId: string) {
    // Optimiste : la suppression est irréversible côté serveur mais sans
    // conséquence si elle échoue (un rechargement de page la ferait
    // réapparaître) — pas besoin d'attendre la réponse pour retirer la carte.
    setCalendarEvents((prev) => (prev ? prev.filter((e) => e.id !== eventId) : prev));
    fetch(`/api/calendar/manual-events/${eventId}`, { method: "DELETE" })
      .then((r) => {
        if (!r.ok) loadCalendarEvents();
      })
      .catch(() => loadCalendarEvents());
  }

  const isAuthenticated = status === "authenticated";

  const showCalendar = calendarEvents !== null && !calendarError;
  // Premier chargement : ni la session ni l'agenda ne sont encore connus. On
  // montre un squelette À LA FORME de la vue finale — avant, les tuiles de
  // chiffres (« 0 RDV à venir ») s'affichaient puis disparaissaient, et la
  // page changeait de mise en page sous les yeux. Un rechargement après
  // ajout ou suppression d'un RDV garde la liste affichée.
  const initialLoading = calendarEvents === null && !calendarError;

  const calendarGroups = showCalendar ? groupByDay(calendarEvents, eventStartDate) : [];
  const upcomingCount = calendarEvents?.length ?? 0;

  const preparedCount = calendarEvents
    ? calendarEvents.filter((e) => recentBriefs.some((b) => b.calendar_event_id === e.id)).length
    : 0;

  // The single nearest upcoming meeting gets a live "Dans X min" badge —
  // only within the next 24h (see timeUntil), so it reads as a genuine
  // heads-up rather than noise on a distant event.
  const nextEvent = showCalendar
    ? [...calendarEvents].sort((a, b) => new Date(eventStartDate(a)).getTime() - new Date(eventStartDate(b)).getTime())[0]
    : null;
  const nextEventLabel = nextEvent ? timeUntil(eventStartDate(nextEvent)) : null;

  const feedContent = (
    <>
      {/* Inscription libre (accès « briefs ») : ce qui existe au-delà, et à
          qui en parler. */}
      {briefsOnly && (
        <div className="mb-6">
          <TalkToSales
            variant="banner"
            description={`Votre accès comprend ${BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour. Enregistrement et analyse de vos rendez-vous, emails de suivi, coaching de l'équipe : ${SALES_CONTACT.firstName} vous montre le reste de Brief en 30 minutes.`}
          />
        </div>
      )}

      {/* Connect Google Calendar banner */}
      {!isAuthenticated && status !== "loading" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[color:var(--lavender)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white">
              <Calendar className="w-4 h-4 text-[color:var(--violet)]" />
            </span>
            <p className="text-[14px] text-slate-900">
              Connectez Google Calendar pour charger vos vrais rendez-vous.
            </p>
          </div>
          <button
            onClick={() => signIn("google", { callbackUrl: "/brief" })}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white hover:brightness-110 transition duration-200"
          >
            Connecter Google
          </button>
        </div>
      )}

      {/* Calendar error */}
      {calendarError && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[color:var(--danger-soft)] px-5 py-4">
          <p className="text-[13.5px] text-rose-700">{calendarError}</p>
          <button
            // prompt=consent pour Google : c'est le seul moyen d'obtenir une
            // nouvelle clé de renouvellement (refresh_token). Une connexion
            // simple rend un accès valable une heure, et l'erreur revenait
            // aussitôt après (constaté le 29/09/2026).
            onClick={() =>
              provider === "azure-ad"
                ? signIn("azure-ad", { callbackUrl: "/brief" })
                : signIn("google", { callbackUrl: "/brief" }, { prompt: "consent" })
            }
            className="inline-flex h-8 shrink-0 items-center rounded-lg border border-rose-200 bg-white px-3 text-[13px] font-medium text-rose-700 hover:bg-rose-50 transition-colors duration-200"
          >
            Reconnecter
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {initialLoading && <EventsSkeleton />}

      {/* Calendar events — journées en blocs d'agenda (maquette S2a). Aujourd'hui
          toujours en tête, même sans rendez-vous. */}
      {showCalendar && (
        <div className="space-y-9">
          {calendarGroups.length === 0 ? (
            <EmptyState
              title="Aucun rendez-vous à venir pour l'instant."
              subtitle={`Aucun événement ${calendarLabel} avec des participants extérieurs dans les 7 prochains jours.`}
            />
          ) : (
            <>
              {!calendarGroups.some(([key]) => key === parisDayKey(new Date())) && (
                <section>
                  <DayHeader dayKey={parisDayKey(new Date())} today count={0} />
                  {nextEvent && (
                    <div className="ml-[58px] mt-2 rounded-2xl border border-dashed border-[color:var(--lavender-strong)] px-5 py-4 text-[13.5px] text-slate-500">
                      Journée libre — le prochain rendez-vous est {dayLabel(eventStartDate(nextEvent)).toLowerCase()} à{" "}
                      {formatTime(eventStartDate(nextEvent))}.
                    </div>
                  )}
                </section>
              )}
              {calendarGroups.map(([dayKey, dayEvents]) => (
                <section key={dayKey} id={dayAnchor(dayKey)} className="scroll-mt-20">
                  <DayHeader dayKey={dayKey} today={dayKey === parisDayKey(new Date())} count={dayEvents.length} />
                  <ul className="ml-[22px] mt-2 space-y-3 border-l border-dashed border-slate-200 pl-4 sm:pl-[34px]">
                    {dayEvents.map((e) => (
                      <CalendarEventCard
                        key={e.id}
                        event={e}
                        onPrepare={handlePrepare}
                        onDelete={handleDeleteManualMeeting}
                        existingBrief={recentBriefs.find((b) => b.calendar_event_id === e.id)}
                        nextLabel={e.id === nextEvent?.id ? nextEventLabel : null}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>
      )}

      {/* Empty state — not authenticated */}
      {!isAuthenticated && status !== "loading" && (
        <EmptyState
          title="Aucun rendez-vous à venir pour l'instant."
          subtitle="Brief se synchronise avec Google Calendar ou Microsoft pour afficher vos prochains rendez-vous et préparer vos briefs automatiquement."
        />
      )}
    </>
  );

  return (
    // Haut de page légèrement lavande (maquette S2a).
    <div style={{ background: "linear-gradient(180deg, oklch(0.97 0.02 270) 0px, var(--background) 420px)" }}>
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[248px_minmax(0,1fr)] xl:gap-10">
        {/* Panneau gauche, volontairement étroit : titre, mois et préparation
            dans une seule carte, ajout. */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div>
            <div data-tour="brief-content">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">
                Vos prochains <span className="whitespace-nowrap">rendez-vous</span>
              </h1>
              {initialLoading ? (
                <div className="mt-2.5 h-3.5 w-48 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="mt-1 text-[13px] text-slate-500">
                  {upcomingCount} RDV à venir
                  {showCalendar && ` · ${calendarLabel}`}
                </p>
              )}
            </div>
          </div>
          {/* Le mois prend un écran entier sur téléphone : il reste réservé
              au grand écran, la liste suffit en dessous. */}
          {/* Pendant le chargement, des squelettes de même taille : le mois
              dépend de la date du navigateur (le serveur est en UTC) et la
              préparation dirait « aucun rendez-vous » avant d'avoir lu l'agenda. */}
          {initialLoading ? (
            <>
              <div className="hidden h-[290px] animate-pulse rounded-[20px] bg-white/70 ring-1 ring-[color:var(--lavender-strong)] lg:block" />
              <div className="h-[62px] animate-pulse rounded-[20px] bg-white/70 ring-1 ring-[color:var(--lavender-strong)] lg:hidden" />
            </>
          ) : (
            <>
              <div className="hidden lg:block">
                <MonthCalendar
                  events={showCalendar ? calendarEvents : []}
                  briefs={recentBriefs}
                  ready={showCalendar ? preparedCount : 0}
                  total={showCalendar ? upcomingCount : 0}
                />
              </div>
              {/* Sur téléphone, le mois est masqué : la préparation seule. */}
              <div className={`${PANEL} px-4 py-3 lg:hidden`}>
                <PrepBar ready={showCalendar ? preparedCount : 0} total={showCalendar ? upcomingCount : 0} />
              </div>
            </>
          )}
          <button
            data-tour="brief-add"
            onClick={() =>
              isAuthenticated
                ? setShowAddMeetingModal(true)
                : signIn(provider === "azure-ad" ? "azure-ad" : "google", { callbackUrl: "/brief" })
            }
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2A5CE0] to-[#6A4BE8] text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(76,63,214,0.8)] transition duration-200 hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Ajouter un RDV
          </button>
        </aside>

        <div className="min-w-0">
          {feedContent}

          {recentBriefs.length > 0 && !initialLoading && (
            <div className="mt-12">
              <RecentBriefsCard briefs={recentBriefs} />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalEvent && (
          <CompanyModal
            event={modalEvent}
            defaultCompany={modalDefaultCompany}
            onConfirm={handleModalConfirm}
            onClose={() => setModalEvent(null)}
          />
        )}
        {showAddMeetingModal && (
          <AddMeetingModal onCreated={handleMeetingAdded} onClose={() => setShowAddMeetingModal(false)} />
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
