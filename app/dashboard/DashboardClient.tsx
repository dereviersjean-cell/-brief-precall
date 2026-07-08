"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Plus, ArrowRight } from "lucide-react";
import { Meeting } from "@/lib/types";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees: Array<{ name?: string; email: string }>;
}

interface StoredBrief {
  id: string;
  company_name: string | null;
  contact_email: string | null;
  calendar_event_id: string | null;
  model_used: string | null;
  created_at: string;
}


const GENERIC_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr",
  "outlook.com", "outlook.fr", "live.com", "live.fr",
  "icloud.com", "me.com", "msn.com",
  "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net",
]);

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

function getExternalAttendee(event: CalendarEvent): { email: string } | null {
  return event.attendees.find((a) => {
    const domain = a.email.split("@")[1] ?? "";
    return !GENERIC_DOMAINS.has(domain);
  }) ?? null;
}

function getCompanyFromDomain(event: CalendarEvent): string | null {
  const hit = getExternalAttendee(event);
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function CalendarEventCard({
  event,
  onPrepare,
  provider = "google",
  existingBrief,
}: {
  event: CalendarEvent;
  onPrepare: (event: CalendarEvent) => void;
  provider?: string;
  existingBrief?: StoredBrief;
}) {
  const start = eventStartDate(event);
  const duration = eventDuration(event);

  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="text-center w-16 shrink-0">
        <p className="text-lg font-bold text-ink">{formatTime(start)}</p>
        <p className="text-xs text-muted-foreground">{duration > 0 ? `${duration} min` : "—"}</p>
      </div>
      <div className="w-px h-10 bg-border shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-lavender flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {event.summary.charAt(0).toUpperCase()}
            </span>
          </div>
          <h3 className="font-semibold text-ink truncate">{event.summary}</h3>
          <span className="text-xs px-2 py-0.5 bg-lavender text-muted-foreground rounded-full font-medium shrink-0">
            {provider === "azure-ad" ? "Microsoft Calendar" : "Google Calendar"}
          </span>
          {existingBrief && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
              Brief généré
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {event.attendees.length > 0
            ? event.attendees.map((a) => a.name ?? a.email).join(", ")
            : "Aucun participant externe"}
        </p>
      </div>
      <div className="shrink-0">
        {existingBrief ? (
          <Link
            href={`/brief/${existingBrief.calendar_event_id ?? existingBrief.id}?company=${encodeURIComponent(existingBrief.company_name ?? "")}&cached=true&contactEmail=${encodeURIComponent(existingBrief.contact_email ?? "")}`}
            className="flex items-center gap-2 text-sm font-medium text-ink border border-border bg-white px-4 py-2 rounded-full hover:bg-lavender transition-colors duration-200"
          >
            Revoir
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button
            onClick={() => onPrepare(event)}
            className="flex items-center gap-2 bg-ink text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary transition-colors duration-200"
          >
            Préparer le brief
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
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
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-ink mb-1">Nom de l&apos;entreprise ?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Précisez le nom pour générer un brief précis.
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          placeholder="ex. Salesforce, HubSpot…"
          className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-ink focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary mb-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(event.id, value.trim());
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-ink border border-border px-4 py-2.5 rounded-full hover:bg-lavender transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={() => value.trim() && onConfirm(event.id, value.trim())}
            disabled={!value.trim()}
            className="flex-1 text-sm font-semibold bg-ink text-white px-4 py-2.5 rounded-full hover:bg-primary transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Générer le brief
          </button>
        </div>
      </div>
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-5 flex items-center gap-5 shadow-sm">
          <div className="w-16 shrink-0 space-y-1.5">
            <div className="h-6 bg-lavender rounded w-12 mx-auto" />
            <div className="h-3 bg-lavender rounded w-10 mx-auto" />
          </div>
          <div className="w-px h-10 bg-border shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-lavender rounded w-1/3" />
            <div className="h-3 bg-lavender rounded w-1/2" />
          </div>
          <div className="h-9 w-28 bg-lavender rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const provider = session?.provider ?? "google";
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[] | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalDefaultCompany, setModalDefaultCompany] = useState("");
  const [recentBriefs, setRecentBriefs] = useState<StoredBrief[]>([]);

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
    const company = getCompanyFromDomain(event);
    const contactEmail = getExternalAttendee(event)?.email ?? null;
    const emailParam = contactEmail ? `&contactEmail=${encodeURIComponent(contactEmail)}` : "";
    if (company) {
      router.push(`/brief/${event.id}?company=${encodeURIComponent(company)}${emailParam}`);
    } else {
      setModalDefaultCompany("");
      setModalEvent(event);
    }
  }

  function handleModalConfirm(eventId: string, company: string) {
    const contactEmail = modalEvent ? getExternalAttendee(modalEvent)?.email ?? null : null;
    const emailParam = contactEmail ? `&contactEmail=${encodeURIComponent(contactEmail)}` : "";
    console.log('[handleModalConfirm] contactEmail extrait:', emailParam);
    setModalEvent(null);
    router.push(`/brief/${eventId}?company=${encodeURIComponent(company)}${emailParam}`);
  }

  useEffect(() => {
    fetch("/api/briefs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecentBriefs(data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    setCalendarLoading(true);
    fetch("/api/calendar/events")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCalendarEvents(data);
        } else {
          setCalendarError((data as { error?: string }).error ?? "Erreur inconnue");
        }
      })
      .catch(() => setCalendarError("Impossible de charger les événements Google Calendar."))
      .finally(() => setCalendarLoading(false));
  }, [status]);

  const isAuthenticated = status === "authenticated";
  const showCalendar = isAuthenticated && calendarEvents !== null && !calendarError;

  const calendarGroups = showCalendar ? groupByDay(calendarEvents, eventStartDate) : [];
  const upcomingCount = calendarEvents?.length ?? 0;

  return (
    <div className="brief-ui min-h-screen bg-background">
      <main className="max-w-3xl mx-auto w-full px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ink">
              Vos prochains <span className="italic-serif text-primary">rendez-vous</span>.
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {upcomingCount} RDV à venir
              {showCalendar && ` · ${provider === "azure-ad" ? "Microsoft Calendar" : "Google Calendar"}`}
            </p>
          </div>
          <button className="flex items-center gap-2 text-sm font-medium text-ink border border-border bg-white px-4 py-2 rounded-full hover:bg-lavender transition-colors duration-200">
            <Plus className="w-4 h-4" />
            Ajouter un RDV
          </button>
        </div>

        {/* Connect Google Calendar banner */}
        {!isAuthenticated && status !== "loading" && (
          <div className="bg-lavender border border-border rounded-2xl p-4 mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-ink">
                Connectez Google Calendar pour charger vos vrais rendez-vous.
              </p>
            </div>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex items-center gap-2 bg-ink text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary transition-colors duration-200 shrink-0"
            >
              Connecter Google
            </button>
          </div>
        )}

        {/* Calendar error */}
        {calendarError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-red-700">{calendarError}</p>
            <button
              onClick={() => signIn(provider === "azure-ad" ? "azure-ad" : "google", { callbackUrl: "/dashboard" })}
              className="text-sm font-medium text-red-700 border border-red-300 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors duration-200 shrink-0"
            >
              Reconnecter
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "RDV à venir", value: String(upcomingCount) },
            {
              label: showCalendar ? "Avec participants externes" : "Briefs enregistrés",
              value: showCalendar
                ? String(calendarEvents?.reduce((n, e) => n + e.attendees.length, 0) ?? 0)
                : String(recentBriefs.length),
            },
            { label: "Taux de préparation", value: "—" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow-sm p-5">
              <p className="text-2xl font-bold text-ink">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Loading skeleton */}
        {calendarLoading && (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-3 animate-pulse">
                <div className="h-3 bg-lavender rounded w-24" />
                <div className="flex-1 h-px bg-border" />
              </div>
              <EventsSkeleton />
            </div>
          </div>
        )}

        {/* Calendar events */}
        {showCalendar && !calendarLoading && (
          <div className="space-y-8">
            {calendarGroups.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-lavender rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-ink font-semibold mb-1">Aucun rendez-vous à venir pour l&apos;instant.</p>
                <p className="text-muted-foreground text-sm">Aucun événement Google Calendar avec des participants extérieurs dans les 7 prochains jours.</p>
              </div>
            ) : (
              calendarGroups.map(([dayKey, events]) => (
                <div key={dayKey}>
                  <DayDivider label={dayLabel(eventStartDate(events[0]))} />
                  <div className="space-y-3">
                    {events.map((e) => (
                      <CalendarEventCard key={e.id} event={e} onPrepare={handlePrepare} provider={provider} existingBrief={recentBriefs.find((b) => b.calendar_event_id === e.id)} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Empty state — not authenticated */}
        {!isAuthenticated && !calendarLoading && status !== "loading" && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-lavender rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-ink font-semibold mb-1">Aucun rendez-vous à venir pour l&apos;instant.</p>
            <p className="text-muted-foreground text-sm">Brief se synchronise avec Google Calendar ou Microsoft pour afficher vos prochains rendez-vous et préparer vos briefs automatiquement.</p>
          </div>
        )}
        {/* Briefs récents */}
        {recentBriefs.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Briefs récents
              </h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-2">
              {recentBriefs.map((brief) => (
                <div
                  key={brief.id}
                  className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-lavender flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {formatCompanyName(brief.company_name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate text-sm">
                      {formatCompanyName(brief.company_name)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(brief.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                    Brief IA
                  </span>
                  <Link
                    href={`/brief/${brief.calendar_event_id ?? brief.id}?company=${encodeURIComponent(brief.company_name ?? "")}&cached=true&contactEmail=${encodeURIComponent(brief.contact_email ?? "")}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-ink shrink-0 transition-colors duration-200"
                  >
                    Revoir
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {modalEvent && (
        <CompanyModal
          event={modalEvent}
          defaultCompany={modalDefaultCompany}
          onConfirm={handleModalConfirm}
          onClose={() => setModalEvent(null)}
        />
      )}
    </div>
  );
}
