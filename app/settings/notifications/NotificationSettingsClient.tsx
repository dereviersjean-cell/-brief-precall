"use client";

import { useState } from "react";
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
    <div className="max-w-2xl mx-auto px-6 py-10">
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
                return (
                  <div key={channel} className="flex items-center justify-between gap-4 px-4 py-3.5">
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
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
