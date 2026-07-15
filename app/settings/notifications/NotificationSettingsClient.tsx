"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  AVAILABLE_CHANNELS,
  CHANNEL_META,
  type NotificationEventType,
  type NotificationChannel,
  type NotificationPreference,
} from "@/lib/notification-preferences";

const SECTIONS: { eventType: NotificationEventType; title: string; description: string }[] = [
  { eventType: "brief_precall", title: "Briefs pré-call", description: "Envoyé avant chaque rendez-vous planifié." },
  { eventType: "analyse_postcall", title: "Analyses post-call", description: "Envoyée après l'analyse automatique de chaque call." },
];

function prefKey(eventType: NotificationEventType, channel: NotificationChannel): string {
  return `${eventType}:${channel}`;
}

export default function NotificationSettingsClient({
  initialPreferences,
}: {
  initialPreferences: NotificationPreference[];
}) {
  const [preferences, setPreferences] = useState<Map<string, boolean>>(
    () => new Map(initialPreferences.map((p) => [prefKey(p.event_type, p.channel), p.enabled]))
  );

  // null while loading — deliberately not shown as "needs reconnection"
  // until we actually know, to avoid a flash of the warning for users who
  // already have write access.
  const [hasCalendarWriteAccess, setHasCalendarWriteAccess] = useState<boolean | null>(null);
  const [hasHubspotWriteAccess, setHasHubspotWriteAccess] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/notification-preferences/calendar-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hasWriteAccess?: boolean } | null) => {
        setHasCalendarWriteAccess(data?.hasWriteAccess ?? false);
      })
      .catch(() => setHasCalendarWriteAccess(false));

    fetch("/api/notification-preferences/hubspot-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hasWriteAccess?: boolean } | null) => {
        setHasHubspotWriteAccess(data?.hasWriteAccess ?? false);
      })
      .catch(() => setHasHubspotWriteAccess(false));
  }, []);

  async function handleToggle(eventType: NotificationEventType, channel: NotificationChannel) {
    const k = prefKey(eventType, channel);
    const previous = preferences.get(k) ?? false;
    const next = !previous;

    setPreferences((prev) => new Map(prev).set(k, next));
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: eventType, channel, enabled: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPreferences((prev) => new Map(prev).set(k, previous));
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Notifications et distribution</h1>
        <p className="text-sm text-slate-500 mt-1">
          Choisissez où recevoir vos briefs pré-call et vos analyses post-call.
        </p>
      </div>

      <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 mb-8">
        <svg
          className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-indigo-700">
          Vous pouvez activer plusieurs canaux à la fois. Si aucun canal n&apos;est activé, aucune notification ne
          sera envoyée.
        </p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.eventType}>
            <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">{section.description}</p>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {AVAILABLE_CHANNELS[section.eventType].map((channel) => {
                const meta = CHANNEL_META[channel];
                const enabled = preferences.get(prefKey(section.eventType, channel)) ?? false;
                const disabled = !meta.implemented;
                const showCalendarWarning =
                  channel === "calendar" && hasCalendarWriteAccess === false && (!disabled || enabled);
                const showHubspotWarning =
                  channel === "hubspot" && hasHubspotWriteAccess === false && (!disabled || enabled);
                return (
                  <div key={channel} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-900 text-sm">{meta.label}</p>
                          {disabled && (
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                              Bientôt disponible
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                      </div>
                      <button
                        onClick={() => handleToggle(section.eventType, channel)}
                        disabled={disabled}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                          enabled ? "bg-indigo-600" : "bg-slate-200"
                        }`}
                        aria-label={enabled ? "Désactiver" : "Activer"}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            enabled ? "translate-x-[18px]" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    {showCalendarWarning && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm p-3 mt-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p>Ce canal nécessite une reconnexion à Google Calendar avec l&apos;autorisation d&apos;écriture.</p>
                          <Link
                            href="/settings/connexions"
                            className="inline-block mt-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-2.5 py-1 rounded-md"
                          >
                            Reconnecter Google Calendar
                          </Link>
                        </div>
                      </div>
                    )}
                    {showHubspotWarning && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm p-3 mt-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p>Ce canal nécessite une reconnexion à HubSpot avec l&apos;autorisation d&apos;écriture (notes, meetings).</p>
                          <a
                            href="/api/crm/hubspot/start"
                            className="inline-block mt-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-2.5 py-1 rounded-md"
                          >
                            Reconnecter HubSpot
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
