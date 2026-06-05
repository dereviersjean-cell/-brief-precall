"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Meeting } from "@/lib/types";
import { getUpcomingMeetings, mockMeetings } from "@/lib/mock-data";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees: Array<{ name?: string; email: string }>;
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

function getCompanyFromDomain(event: CalendarEvent): string | null {
  const hit = event.attendees.find((a) => {
    const domain = a.email.split("@")[1] ?? "";
    return !GENERIC_DOMAINS.has(domain);
  });
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
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </h2>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const hasBrief = !!meeting.brief;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-5 hover:border-indigo-200 hover:shadow-sm transition-all">
      <div className="text-center w-16 shrink-0">
        <p className="text-lg font-bold text-slate-900">{formatTime(meeting.date)}</p>
        <p className="text-xs text-slate-400">{meeting.duration} min</p>
      </div>
      <div className="w-px h-10 bg-slate-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-slate-500">
              {meeting.company.charAt(0)}
            </span>
          </div>
          <h3 className="font-semibold text-slate-900 truncate">{meeting.company}</h3>
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium shrink-0">
            {meeting.industry}
          </span>
        </div>
        <p className="text-sm text-slate-500 truncate">
          {meeting.contacts.map((c) => `${c.name} (${c.title})`).join(", ")}
        </p>
      </div>
      <div className="shrink-0">
        {hasBrief ? (
          <Link
            href={`/brief/${meeting.id}`}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Voir le brief
            <span className="text-indigo-300">→</span>
          </Link>
        ) : (
          <span className="text-sm font-medium px-4 py-2 rounded-lg bg-slate-100 text-slate-400">
            À générer
          </span>
        )}
      </div>
    </div>
  );
}

function CalendarEventCard({
  event,
  onPrepare,
}: {
  event: CalendarEvent;
  onPrepare: (event: CalendarEvent) => void;
}) {
  const start = eventStartDate(event);
  const duration = eventDuration(event);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-5 hover:border-indigo-200 hover:shadow-sm transition-all group">
      <div className="text-center w-16 shrink-0">
        <p className="text-lg font-bold text-slate-900">{formatTime(start)}</p>
        <p className="text-xs text-slate-400">{duration > 0 ? `${duration} min` : "—"}</p>
      </div>
      <div className="w-px h-10 bg-slate-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-blue-500">
              {event.summary.charAt(0).toUpperCase()}
            </span>
          </div>
          <h3 className="font-semibold text-slate-900 truncate">{event.summary}</h3>
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium shrink-0">
            Google Calendar
          </span>
        </div>
        <p className="text-sm text-slate-500 truncate">
          {event.attendees.length > 0
            ? event.attendees.map((a) => a.name ?? a.email).join(", ")
            : "Aucun participant externe"}
        </p>
      </div>
      <div className="shrink-0">
        <button
          onClick={() => onPrepare(event)}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Préparer le brief
          <span className="text-indigo-300">→</span>
        </button>
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
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(event.id, value.trim());
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-slate-600 border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => value.trim() && onConfirm(event.id, value.trim())}
            disabled={!value.trim()}
            className="flex-1 text-sm font-semibold bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-5">
          <div className="w-16 shrink-0 space-y-1.5">
            <div className="h-6 bg-slate-200 rounded w-12 mx-auto" />
            <div className="h-3 bg-slate-100 rounded w-10 mx-auto" />
          </div>
          <div className="w-px h-10 bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="h-9 w-28 bg-slate-100 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[] | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalDefaultCompany, setModalDefaultCompany] = useState("");

  function handlePrepare(event: CalendarEvent) {
    const company = getCompanyFromDomain(event);
    if (company) {
      router.push(`/brief/${event.id}?company=${encodeURIComponent(company)}`);
    } else {
      setModalDefaultCompany("");
      setModalEvent(event);
    }
  }

  function handleModalConfirm(eventId: string, company: string) {
    setModalEvent(null);
    router.push(`/brief/${eventId}?company=${encodeURIComponent(company)}`);
  }

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

  const mockUpcoming = getUpcomingMeetings();
  const mockCompleted = mockMeetings.filter((m) => m.status === "completed");

  const calendarGroups = showCalendar
    ? groupByDay(calendarEvents, eventStartDate)
    : [];
  const mockGroups = groupByDay(mockUpcoming, (m) => m.date);

  const upcomingCount = showCalendar ? calendarEvents.length : mockUpcoming.length;
  const briefsReady = showCalendar ? 0 : mockUpcoming.filter((m) => m.brief).length;
  const prepRate = showCalendar
    ? "—"
    : `${Math.round((briefsReady / Math.max(mockUpcoming.length, 1)) * 100)}%`;

  const userName = session?.user?.name ?? "Jean Dupont";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userRole = session?.user?.email ?? "Account Executive";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">B</span>
              </div>
              <span className="font-semibold text-slate-900 text-lg">Brief</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"
              >
                Dashboard
              </Link>
              <a
                href="#"
                className="text-sm font-medium text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors"
              >
                Paramètres
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-700 text-xs font-bold">{userInitials}</span>
            </div>
            <div className="text-sm">
              <p className="font-medium text-slate-900 leading-none">{userName}</p>
              <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[180px]">{userRole}</p>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vos rendez-vous</h1>
            <p className="text-slate-500 text-sm mt-1">
              {upcomingCount} RDV à venir
              {showCalendar ? " · Google Calendar" : ` · ${mockCompleted.length} complétés`}
            </p>
          </div>
          <button className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 bg-white px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un RDV
          </button>
        </div>

        {/* Connect Google Calendar banner */}
        {!isAuthenticated && status !== "loading" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM9 17.25H6.75V9H9v8.25zm-1.125-9.375a1.313 1.313 0 110-2.625 1.313 1.313 0 010 2.625zM18 17.25h-2.25v-4c0-.994-.816-1.75-1.875-1.75s-1.875.756-1.875 1.75v4H9.75V9H12v1.1C12.6 9.38 13.64 9 14.625 9 16.49 9 18 10.343 18 12.25v5z" />
              </svg>
              <p className="text-sm text-blue-700">
                Connectez Google Calendar pour charger vos vrais rendez-vous.
              </p>
            </div>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
            >
              Connecter Google
            </button>
          </div>
        )}

        {/* Calendar error */}
        {calendarError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-red-700">{calendarError}</p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="text-sm font-medium text-red-700 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors shrink-0"
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
              label: showCalendar ? "Avec participants externes" : "Briefs générés",
              value: showCalendar
                ? String(calendarEvents?.reduce((n, e) => n + e.attendees.length, 0) ?? 0)
                : String(briefsReady),
            },
            { label: "Taux de préparation", value: prepRate },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Loading skeleton */}
        {calendarLoading && (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-3 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="flex-1 h-px bg-slate-200" />
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
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <p className="text-slate-700 font-semibold mb-1">Aucun RDV avec participants externes</p>
                <p className="text-slate-500 text-sm">Aucun événement Google Calendar avec des participants extérieurs dans les 7 prochains jours.</p>
              </div>
            ) : (
              calendarGroups.map(([dayKey, events]) => (
                <div key={dayKey}>
                  <DayDivider label={dayLabel(eventStartDate(events[0]))} />
                  <div className="space-y-3">
                    {events.map((e) => (
                      <CalendarEventCard key={e.id} event={e} onPrepare={handlePrepare} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Mock data (not authenticated or calendar error) */}
        {!showCalendar && !calendarLoading && (
          <>
            <div className="space-y-8">
              {mockGroups.map(([dayKey, meetings]) => (
                <div key={dayKey}>
                  <DayDivider label={dayLabel(meetings[0].date)} />
                  <div className="space-y-3">
                    {meetings.map((m) => (
                      <MeetingCard key={m.id} meeting={m} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {mockCompleted.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Complétés
                  </h2>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="space-y-3">
                  {mockCompleted.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-5 opacity-60"
                    >
                      <div className="text-center w-16 shrink-0">
                        <p className="text-base font-bold text-slate-700">{formatTime(m.date)}</p>
                        <p className="text-xs text-slate-400">{formatDate(m.date)}</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-slate-400">
                              {m.company.charAt(0)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-slate-700 truncate">{m.company}</h3>
                          <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">
                            Complété
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 truncate">
                          {m.contacts.map((c) => c.name).join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
