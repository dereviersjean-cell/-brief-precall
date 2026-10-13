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
import TalkToSales from "@/app/components/TalkToSales";
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
    <h2 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {label}
    </h2>
  );
}

function NextBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)]">
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
      // Sous `sm`, les actions passent sur une seconde ligne (`w-full`) : sur
      // 375 px, l'heure, le titre, les pastilles et « Préparer le brief » ne
      // tiennent pas côte à côte sans écraser le titre.
      className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-2xl border border-border bg-white px-3.5 py-3 sm:flex-nowrap sm:gap-5 sm:px-4"
    >
      <div className="w-12 shrink-0 text-center sm:w-14">
        <p className="text-[16px] font-semibold tabular-nums text-slate-900 sm:text-[17px]">{formatTime(start)}</p>
        <p className="text-[11.5px] tabular-nums text-slate-500">{duration > 0 ? `${duration} min` : "—"}</p>
      </div>
      <div className="h-10 w-px shrink-0 bg-border" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Le logo de l'entreprise du participant externe, trouvé par le
              serveur à partir de son domaine et du nom de l'entreprise
              (app/api/company-logo, mis en cache). */}
          <CompanyLogo
            domain={companyDomainFromEmail(getCompanyAttendee(event)?.email)}
            name={event.company}
            alt={event.summary}
            className="w-7 h-7 rounded-lg object-contain shrink-0 bg-white border border-border p-0.5"
            fallback={
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[color:var(--primary)]">
                <span className="text-[12px] font-bold text-white">
                  {event.summary.charAt(0).toUpperCase()}
                </span>
              </div>
            }
          />
          <h3 className="min-w-0 truncate text-[14px] font-semibold leading-snug text-slate-900">{event.summary}</h3>
          {event.manual && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600">
              Ajouté manuellement
            </span>
          )}
          {nextLabel && <NextBadge label={nextLabel} />}
          {existingBrief && (
            <span className="shrink-0 rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)]">
              Brief généré
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-[12.5px] text-slate-500">
          {event.attendees.length > 0
            ? event.attendees.map((a) => a.name ?? a.email).join(", ")
            : "Aucun participant externe"}
        </p>
      </div>
      <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
        {existingBrief ? (
          <Link
            href={`/brief/${existingBrief.calendar_event_id ?? existingBrief.id}?company=${encodeURIComponent(existingBrief.company_name ?? "")}&cached=true&contactEmail=${encodeURIComponent(existingBrief.contact_email ?? "")}&title=${encodeURIComponent(existingBrief.meeting_title ?? "")}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-slate-900 hover:bg-slate-50 transition-colors duration-200"
          >
            Revoir
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button
            onClick={() => onPrepare(event)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3 text-[13px] font-medium text-white hover:brightness-110 transition duration-200"
          >
            Préparer le brief
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        {event.manual && onDelete && (
          <button
            onClick={() => onDelete(event.id)}
            aria-label="Supprimer ce rendez-vous"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-[color:var(--danger-soft)] hover:text-rose-700 transition-colors duration-200"
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

function EventsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3.5 py-3 sm:gap-5 sm:px-4">
          <div className="w-12 shrink-0 space-y-1.5 sm:w-14">
            <div className="h-5 bg-slate-100 rounded w-11 mx-auto" />
            <div className="h-3 bg-slate-100 rounded w-9 mx-auto" />
          </div>
          <div className="h-10 w-px shrink-0 bg-border" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="hidden h-8 w-28 shrink-0 rounded-lg bg-slate-100 sm:block" />
        </div>
      ))}
    </div>
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
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
        Briefs récents
      </h2>
      <div className="space-y-0.5">
        {briefs.map((brief) => (
          <Link
            key={brief.id}
            href={`/brief/${brief.calendar_event_id ?? brief.id}?company=${encodeURIComponent(brief.company_name ?? "")}&cached=true&contactEmail=${encodeURIComponent(brief.contact_email ?? "")}&title=${encodeURIComponent(brief.meeting_title ?? "")}`}
            className="-mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-2 hover:bg-slate-50 transition-colors group"
          >
            <CompanyLogo
              domain={companyDomainFromEmail(brief.contact_email)}
              name={brief.company_name}
              alt={formatCompanyName(brief.company_name)}
              className="w-8 h-8 rounded-lg object-contain shrink-0 bg-white border border-border p-0.5"
              fallback={
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--primary)]">
                  <span className="text-[12px] font-bold text-white">
                    {formatCompanyName(brief.company_name).charAt(0).toUpperCase()}
                  </span>
                </div>
              }
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-medium text-slate-900 group-hover:text-[color:var(--violet)] transition-colors">
                {formatCompanyName(brief.company_name)}
              </p>
              <p className="text-[11.5px] tabular-nums text-slate-500">
                {new Date(brief.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[color:var(--violet)] transition-colors shrink-0" />
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
  const calendarLabel = provider === "azure-ad" ? "Microsoft Calendar" : "Google Calendar";
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[] | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalDefaultCompany, setModalDefaultCompany] = useState("");
  const [recentBriefs, setRecentBriefs] = useState<StoredBrief[]>([]);
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
      .catch(() => setCalendarError(`Impossible de charger les événements ${calendarLabel}.`))
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
      {calendarLoading && (
        <div className="space-y-8">
          <div>
            <div className="mb-2.5 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-24" />
            </div>
            <EventsSkeleton />
          </div>
        </div>
      )}

      {/* Calendar events */}
      {showCalendar && !calendarLoading && (
        <div className="space-y-7">
          {calendarGroups.length === 0 ? (
            <EmptyState
              title="Aucun rendez-vous à venir pour l'instant."
              subtitle={`Aucun événement ${calendarLabel} avec des participants extérieurs dans les 7 prochains jours.`}
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
    <div className="max-w-6xl mx-auto w-full px-4 py-6 sm:px-6 sm:py-10">
      {/* Hero header */}
      <FadeIn>
        <div data-tour="brief-content" className="mb-4 rounded-[20px] border border-border bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--lavender)] px-2.5 py-1 text-[11.5px] font-semibold text-[color:var(--violet)]">
                <Sparkles className="w-3 h-3" />
                Préparation IA
              </span>
              <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[26px]">Vos prochains rendez-vous</h1>
              <p className="mt-1 text-[13.5px] text-slate-500">
                {upcomingCount} RDV à venir
                {showCalendar && ` · ${calendarLabel}`}
              </p>
            </div>
            <button
              data-tour="brief-add"
              onClick={() =>
                isAuthenticated
                  ? setShowAddMeetingModal(true)
                  : signIn(provider === "azure-ad" ? "azure-ad" : "google", { callbackUrl: "/brief" })
              }
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              Ajouter un RDV
            </button>
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      <div className={`grid grid-cols-1 gap-3 mb-6 sm:gap-4 ${showCalendar ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <StatTile compact index={0} accent="indigo" label="RDV à venir" value={upcomingCount} icon={<Calendar className="w-3.5 h-3.5" />} />
        {/* « Avec participants externes » retirée le 21/08/2026 : lib/calendar.ts
            ne remonte QUE les événements ayant au moins un participant externe,
            donc cette tuile comptait le même ensemble que « RDV à venir ». Elle
            additionnait en plus des PARTICIPANTS et non des rendez-vous — deux
            unités différentes qui coïncidaient tant que chaque RDV n'avait
            qu'un invité. En mode « briefs enregistrés » la tuile garde du sens
            et reste affichée. */}
        {!showCalendar && (
          <StatTile
            compact
            index={1}
            accent="violet"
            label="Briefs enregistrés"
            value={recentBriefs.length}
            icon={<Users className="w-3.5 h-3.5" />}
          />
        )}
        <StatTile
          compact
          index={2}
          accent="emerald"
          label="Taux de préparation"
          value={prepRate}
          suffix={prepRate !== null ? "%" : undefined}
          icon={<Sparkles className="w-3.5 h-3.5" />}
        />
      </div>

      {recentBriefs.length > 0 ? (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
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
