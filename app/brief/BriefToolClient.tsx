"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Plus, ArrowRight, Sparkles, Users, X } from "lucide-react";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";
import CompanyLogo from "@/app/components/CompanyLogo";
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
function getContactAttendee(event: CalendarEvent): { email: string } | null {
  return event.attendees[0] ?? null;
}

// Pour l'entreprise, en revanche, le filtre reste indispensable : « gmail.com »
// ne donnerait « Gmail » comme nom de société.
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isTomorrow(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  );
}

function dayLabel(iso: string) {
  if (isToday(iso)) return "Aujourd'hui";
  if (isTomorrow(iso)) return "Demain";
  return formatDate(iso);
}

function groupByDay<T>(items: T[], getDate: (item: T) => string): [string, T[]][] {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = new Date(getDate(item)).toDateString();
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

function DayDivider({ label }: { label: string }) {
  return (
    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
      {label}
    </h2>
  );
}

function NextBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--violet)] bg-[color:var(--lavender)] px-2 py-0.5 rounded-full shrink-0">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--violet)] opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--violet)]" />
      </span>
      {label}
    </span>
  );
}

function CalendarEventCard({
  event,
  onPrepare,
  onDelete,
  existingBrief,
  nextLabel,
  index,
}: {
  event: CalendarEvent;
  onPrepare: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  existingBrief?: StoredBrief;
  nextLabel: string | null;
  index: number;
}) {
  const start = eventStartDate(event);
  const duration = eventDuration(event);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px -10px rgba(15, 23, 42, 0.15)" }}
      className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] py-3.5 px-4 flex items-center gap-5"
    >
      <div className="text-center w-16 shrink-0">
        <p className="text-lg font-bold text-slate-900 tabular-nums">{formatTime(start)}</p>
        <p className="text-xs text-slate-400">{duration > 0 ? `${duration} min` : "—"}</p>
      </div>
      <div className="w-px h-10 bg-slate-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {/* Le logo de l'entreprise du participant externe. Déduit de son
              domaine (favicon), et non résolu via l'annuaire : sur une liste,
              ce serait un appel et un crédit par ligne à chaque affichage. */}
          <CompanyLogo
            domain={companyDomainFromEmail(getCompanyAttendee(event)?.email)}
            alt={event.summary}
            className="w-7 h-7 rounded-lg object-contain shrink-0 bg-white border border-border p-0.5"
            fallback={
              <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center shrink-0 shadow-[var(--shadow-glow)]">
                <span className="text-xs font-bold text-white">
                  {event.summary.charAt(0).toUpperCase()}
                </span>
              </div>
            }
          />
          <h3 className="font-semibold text-slate-900 truncate">{event.summary}</h3>
          {event.manual && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium shrink-0">
              Ajouté manuellement
            </span>
          )}
          {nextLabel && <NextBadge label={nextLabel} />}
          {existingBrief && (
            <span className="text-xs bg-[color:var(--lavender)] text-[color:var(--violet)] px-2 py-0.5 rounded-full font-medium shrink-0">
              Brief généré
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 truncate">
          {event.attendees.length > 0
            ? event.attendees.map((a) => a.name ?? a.email).join(", ")
            : "Aucun participant externe"}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {existingBrief ? (
          <Link
            href={`/brief/${existingBrief.calendar_event_id ?? existingBrief.id}?company=${encodeURIComponent(existingBrief.company_name ?? "")}&cached=true&contactEmail=${encodeURIComponent(existingBrief.contact_email ?? "")}&title=${encodeURIComponent(existingBrief.meeting_title ?? "")}`}
            className="flex items-center gap-1.5 h-8 text-sm font-medium text-slate-700 border border-border bg-white px-3 rounded-lg hover:bg-slate-50 transition-colors duration-200"
          >
            Revoir
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button
            onClick={() => onPrepare(event)}
            className="flex items-center gap-1.5 h-8 brand-gradient text-white text-sm font-medium px-3 rounded-lg shadow-[var(--shadow-sm)] hover:brightness-110 hover:shadow-[var(--shadow-md)] transition-all duration-200"
          >
            Préparer le brief
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        {event.manual && onDelete && (
          <button
            onClick={() => onDelete(event.id)}
            aria-label="Supprimer ce rendez-vous"
            className="flex items-center justify-center h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
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
        className="bg-white rounded-2xl border border-border shadow-xl p-6 w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="font-semibold text-slate-900 mb-1">Nom de l&apos;entreprise ?</h2>
        <p className="text-sm text-slate-500 mb-4">
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
            className="flex-1 text-sm text-slate-600 border border-border px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={() => value.trim() && onConfirm(event.id, value.trim())}
            disabled={!value.trim()}
            className="flex-1 text-sm font-semibold brand-gradient text-white px-4 py-2 rounded-lg hover:brightness-110 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
        className="bg-white rounded-2xl border border-border shadow-xl p-6 w-full max-w-sm relative max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="font-semibold text-slate-900 mb-1">Ajouter un rendez-vous</h2>
        <p className="text-sm text-slate-500 mb-4">
          Pour un RDV absent de votre agenda synchronisé. Il ne sera pas enregistré automatiquement — seul un brief pourra être préparé.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nom du rendez-vous</label>
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
            <label className="block text-xs font-medium text-slate-500 mb-1">Entreprise</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="ex. Salesforce, HubSpot…"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Email du contact (optionnel)</label>
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Heure</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-slate-600 border border-border px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 text-sm font-semibold brand-gradient text-white px-4 py-2 rounded-lg hover:brightness-110 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] py-3.5 px-4 flex items-center gap-5">
          <div className="w-16 shrink-0 space-y-1.5">
            <div className="h-6 bg-slate-100 rounded w-12 mx-auto" />
            <div className="h-3 bg-slate-100 rounded w-10 mx-auto" />
          </div>
          <div className="w-px h-10 bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="h-8 w-28 bg-slate-100 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
      <div className="w-12 h-12 bg-[color:var(--lavender)] rounded-xl flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-6 h-6 text-[color:var(--violet)]" strokeWidth={1.5} />
      </div>
      <p className="text-slate-700 font-medium">{title}</p>
      <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

function RecentBriefsCard({ briefs }: { briefs: StoredBrief[] }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Briefs récents
      </h2>
      <div className="space-y-1">
        {briefs.map((brief) => (
          <Link
            key={brief.id}
            href={`/brief/${brief.calendar_event_id ?? brief.id}?company=${encodeURIComponent(brief.company_name ?? "")}&cached=true&contactEmail=${encodeURIComponent(brief.contact_email ?? "")}&title=${encodeURIComponent(brief.meeting_title ?? "")}`}
            className="flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <CompanyLogo
              domain={companyDomainFromEmail(brief.contact_email)}
              alt={formatCompanyName(brief.company_name)}
              className="w-8 h-8 rounded-lg object-contain shrink-0 bg-white border border-border p-0.5"
              fallback={
                <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {formatCompanyName(brief.company_name).charAt(0).toUpperCase()}
                  </span>
                </div>
              }
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate group-hover:text-[color:var(--violet)] transition-colors">
                {formatCompanyName(brief.company_name)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(brief.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[color:var(--violet)] transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BriefToolClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const provider = session?.provider ?? "google";
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[] | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalDefaultCompany, setModalDefaultCompany] = useState("");
  const [recentBriefs, setRecentBriefs] = useState<StoredBrief[]>([]);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);

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
    const contactEmail = getContactAttendee(event)?.email ?? null;
    const emailParam = contactEmail ? `&contactEmail=${encodeURIComponent(contactEmail)}` : "";
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
      router.push(`/brief/${event.id}?company=${encodeURIComponent(company)}${emailParam}${titleParam}${startsAtParam}`);
    } else {
      setModalDefaultCompany("");
      setModalEvent(event);
    }
  }

  function handleModalConfirm(eventId: string, company: string) {
    const contactEmail = modalEvent ? getContactAttendee(modalEvent)?.email ?? null : null;
    const emailParam = contactEmail ? `&contactEmail=${encodeURIComponent(contactEmail)}` : "";
    // Le titre du RDV vient de l'événement, pas de la saisie : c'est justement
    // parce que le nom d'entreprise était indevinable qu'on passe par ce modal.
    const titleParam = modalEvent?.summary ? `&title=${encodeURIComponent(modalEvent.summary)}` : "";
    const startsAt = modalEvent ? eventStartDate(modalEvent) : "";
    const startsAtParam = startsAt ? `&startsAt=${encodeURIComponent(startsAt)}` : "";
    setModalEvent(null);
    router.push(`/brief/${eventId}?company=${encodeURIComponent(company)}${emailParam}${titleParam}${startsAtParam}`);
  }

  useEffect(() => {
    fetch("/api/briefs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecentBriefs(data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  // Extrait pour être rejouable après l'ajout ou la suppression d'un RDV
  // manuel, sans dupliquer la logique de chargement/erreur.
  function loadCalendarEvents() {
    setCalendarLoading(true);
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
      .catch(() => setCalendarError("Impossible de charger les événements Google Calendar."))
      .finally(() => setCalendarLoading(false));
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    loadCalendarEvents();
  }, [status]);

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
  const showCalendar = isAuthenticated && calendarEvents !== null && !calendarError;

  const calendarGroups = showCalendar ? groupByDay(calendarEvents, eventStartDate) : [];
  const upcomingCount = calendarEvents?.length ?? 0;

  const preparedCount = calendarEvents
    ? calendarEvents.filter((e) => recentBriefs.some((b) => b.calendar_event_id === e.id)).length
    : 0;
  const prepRate = showCalendar && upcomingCount > 0 ? Math.round((preparedCount / upcomingCount) * 100) : null;

  // The single nearest upcoming meeting gets a live "Dans X min" badge —
  // only within the next 24h (see timeUntil), so it reads as a genuine
  // heads-up rather than noise on a distant event.
  const nextEvent = showCalendar
    ? [...calendarEvents].sort((a, b) => new Date(eventStartDate(a)).getTime() - new Date(eventStartDate(b)).getTime())[0]
    : null;
  const nextEventLabel = nextEvent ? timeUntil(eventStartDate(nextEvent)) : null;

  const feedContent = (
    <>
      {/* Connect Google Calendar banner */}
      {!isAuthenticated && status !== "loading" && (
        <div className="bg-[color:var(--lavender)] border border-[color:var(--lavender-strong)] rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Calendar className="w-4 h-4 text-[color:var(--violet)]" />
            </span>
            <p className="text-sm text-slate-700">
              Connectez Google Calendar pour charger vos vrais rendez-vous.
            </p>
          </div>
          <button
            onClick={() => signIn("google", { callbackUrl: "/brief" })}
            className="flex items-center gap-2 h-9 brand-gradient text-white text-sm font-medium px-4 rounded-lg hover:brightness-110 transition-colors duration-200 shrink-0"
          >
            Connecter Google
          </button>
        </div>
      )}

      {/* Calendar error */}
      {calendarError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-red-700">{calendarError}</p>
          <button
            onClick={() => signIn(provider === "azure-ad" ? "azure-ad" : "google", { callbackUrl: "/brief" })}
            className="text-sm font-medium text-red-700 border border-red-200 bg-white px-3 h-8 rounded-lg hover:bg-red-100 transition-colors duration-200 shrink-0"
          >
            Reconnecter
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {calendarLoading && (
        <div className="space-y-8">
          <div>
            <div className="mb-3 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-24" />
            </div>
            <EventsSkeleton />
          </div>
        </div>
      )}

      {/* Calendar events */}
      {showCalendar && !calendarLoading && (
        <div className="space-y-8">
          {calendarGroups.length === 0 ? (
            <EmptyState
              title="Aucun rendez-vous à venir pour l'instant."
              subtitle="Aucun événement Google Calendar avec des participants extérieurs dans les 7 prochains jours."
            />
          ) : (
            calendarGroups.map(([dayKey, events]) => (
              <div key={dayKey}>
                <DayDivider label={dayLabel(eventStartDate(events[0]))} />
                <div className="space-y-2">
                  {events.map((e, i) => (
                    <CalendarEventCard
                      key={e.id}
                      event={e}
                      index={i}
                      onPrepare={handlePrepare}
                      onDelete={handleDeleteManualMeeting}
                      existingBrief={recentBriefs.find((b) => b.calendar_event_id === e.id)}
                      nextLabel={e.id === nextEvent?.id ? nextEventLabel : null}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Empty state — not authenticated */}
      {!isAuthenticated && !calendarLoading && status !== "loading" && (
        <EmptyState
          title="Aucun rendez-vous à venir pour l'instant."
          subtitle="Brief se synchronise avec Google Calendar ou Microsoft pour afficher vos prochains rendez-vous et préparer vos briefs automatiquement."
        />
      )}
    </>
  );

  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-10">
      {/* Hero header */}
      <FadeIn>
        <div data-tour="brief-content" className="relative overflow-hidden rounded-3xl border border-border bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-[color:var(--lavender-strong)]/60 via-[color:var(--lavender)]/40 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-100/40 to-transparent blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--violet)] bg-[color:var(--lavender)] px-2.5 py-1 rounded-full mb-3">
                <Sparkles className="w-3 h-3" />
                Préparation IA
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Vos prochains rendez-vous</h1>
              <p className="text-slate-500 text-sm mt-1">
                {upcomingCount} RDV à venir
                {showCalendar && ` · ${provider === "azure-ad" ? "Microsoft Calendar" : "Google Calendar"}`}
              </p>
            </div>
            <button
              data-tour="brief-add"
              onClick={() =>
                isAuthenticated
                  ? setShowAddMeetingModal(true)
                  : signIn(provider === "azure-ad" ? "azure-ad" : "google", { callbackUrl: "/brief" })
              }
              className="flex items-center gap-2 h-9 text-sm font-medium text-slate-600 border border-border bg-white px-3.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Ajouter un RDV
            </button>
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      <div className={`grid grid-cols-1 gap-4 mb-6 ${showCalendar ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <StatTile index={0} accent="indigo" label="RDV à venir" value={upcomingCount} icon={<Calendar className="w-3.5 h-3.5" />} />
        {/* « Avec participants externes » retirée le 21/08/2026 : lib/calendar.ts
            ne remonte QUE les événements ayant au moins un participant externe,
            donc cette tuile comptait le même ensemble que « RDV à venir ». Elle
            additionnait en plus des PARTICIPANTS et non des rendez-vous — deux
            unités différentes qui coïncidaient tant que chaque RDV n'avait
            qu'un invité. En mode « briefs enregistrés » la tuile garde du sens
            et reste affichée. */}
        {!showCalendar && (
          <StatTile
            index={1}
            accent="violet"
            label="Briefs enregistrés"
            value={recentBriefs.length}
            icon={<Users className="w-3.5 h-3.5" />}
          />
        )}
        <StatTile
          index={2}
          accent="emerald"
          label="Taux de préparation"
          value={prepRate}
          suffix={prepRate !== null ? "%" : undefined}
          icon={<Sparkles className="w-3.5 h-3.5" />}
        />
      </div>

      {recentBriefs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="min-w-0">{feedContent}</div>
          <div className="lg:sticky lg:top-6">
            <RecentBriefsCard briefs={recentBriefs} />
          </div>
        </div>
      ) : (
        feedContent
      )}

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
  );
}
