"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  AVAILABLE_CHANNELS,
  CHANNEL_META,
  type NotificationEventType,
  type NotificationChannel,
  type NotificationPreference,
} from "@/lib/notification-preferences";
import type { DigestPreference, DigestTiming } from "@/lib/db";

const DIGEST_TIMING_LABELS: Record<DigestTiming, string> = {
  friday_evening: "Vendredi soir",
  monday_morning: "Lundi matin",
};

const SECTIONS: { eventType: NotificationEventType; title: string; description: string }[] = [
  { eventType: "brief_precall", title: "Briefs pré-call", description: "Envoyé avant chaque rendez-vous planifié." },
  { eventType: "analyse_postcall", title: "Analyses post-call", description: "Envoyée après l'analyse automatique de chaque call." },
];

function prefKey(eventType: NotificationEventType, channel: NotificationChannel): string {
  return `${eventType}:${channel}`;
}

export default function NotificationSettingsClient({
  initialPreferences,
  initialDigestPreference,
}: {
  initialPreferences: NotificationPreference[];
  initialDigestPreference: DigestPreference;
}) {
  const [preferences, setPreferences] = useState<Map<string, boolean>>(
    () => new Map(initialPreferences.map((p) => [prefKey(p.event_type, p.channel), p.enabled]))
  );

  const [digestEnabled, setDigestEnabled] = useState(initialDigestPreference.enabled);
  const [digestTiming, setDigestTiming] = useState<DigestTiming>(initialDigestPreference.timing);
  const [digestSaving, setDigestSaving] = useState(false);

  async function saveDigestPreference(nextEnabled: boolean, nextTiming: DigestTiming) {
    const previousEnabled = digestEnabled;
    const previousTiming = digestTiming;
    setDigestEnabled(nextEnabled);
    setDigestTiming(nextTiming);
    setDigestSaving(true);
    try {
      const res = await fetch("/api/digest-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled, timing: nextTiming }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setDigestEnabled(previousEnabled);
      setDigestTiming(previousTiming);
    } finally {
      setDigestSaving(false);
    }
  }

  // null while loading — deliberately not shown as "needs reconnection"
  // until we actually know, to avoid a flash of the warning for users who
  // already have write access.
  const [hasCalendarWriteAccess, setHasCalendarWriteAccess] = useState<boolean | null>(null);
  const [hasHubspotWriteAccess, setHasHubspotWriteAccess] = useState<boolean | null>(null);
  const [hasPipedriveWriteAccess, setHasPipedriveWriteAccess] = useState<boolean | null>(null);
  const [hasSlackConnection, setHasSlackConnection] = useState<boolean | null>(null);

  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const slack = searchParams.get("slack");
    if (slack === "connected") {
      setHasSlackConnection(true);
      setToast({ type: "success", message: "Slack connecté avec succès." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
    if (slack === "error") {
      setToast({ type: "error", message: "La connexion à Slack a échoué, réessayez." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

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

    fetch("/api/notification-preferences/pipedrive-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hasWriteAccess?: boolean } | null) => {
        setHasPipedriveWriteAccess(data?.hasWriteAccess ?? false);
      })
      .catch(() => setHasPipedriveWriteAccess(false));

    fetch("/api/notification-preferences/slack-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { connected?: boolean } | null) => {
        setHasSlackConnection(data?.connected ?? false);
      })
      .catch(() => setHasSlackConnection(false));
  }, []);

  const [slackDisconnecting, setSlackDisconnecting] = useState(false);

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

      {toast && (
        <div className={`mb-6 rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        }`}>
          <p className={`text-sm font-medium ${toast.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
            {toast.message}
          </p>
          <button
            onClick={() => setToast(null)}
            className={`shrink-0 text-lg leading-none ${toast.type === "success" ? "text-emerald-400 hover:text-emerald-600" : "text-red-400 hover:text-red-600"}`}
          >
            ×
          </button>
        </div>
      )}

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

      {hasSlackConnection === true && (
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-emerald-700">Compte Slack connecté</span>
          </div>
          <button
            disabled={slackDisconnecting}
            onClick={async () => {
              if (!window.confirm("Déconnecter Slack ? Le canal Slack sera désactivé.")) return;
              setSlackDisconnecting(true);
              try {
                await fetch("/api/slack/disconnect", { method: "POST" });
                setHasSlackConnection(false);
              } finally {
                setSlackDisconnecting(false);
              }
            }}
            className="text-sm text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {slackDisconnecting ? "Déconnexion…" : "Déconnecter Slack"}
          </button>
        </div>
      )}

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
                const showPipedriveWarning =
                  channel === "pipedrive" && hasPipedriveWriteAccess === false && (!disabled || enabled);
                const showSlackWarning =
                  channel === "slack" && hasSlackConnection === false && (!disabled || enabled);
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
                    {showPipedriveWarning && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm p-3 mt-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p>Ce canal nécessite une reconnexion à Pipedrive avec l&apos;autorisation d&apos;écriture (deals, contacts, activités).</p>
                          <a
                            href="/api/crm/pipedrive/start"
                            className="inline-block mt-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-2.5 py-1 rounded-md"
                          >
                            Reconnecter Pipedrive
                          </a>
                        </div>
                      </div>
                    )}
                    {showSlackWarning && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm p-3 mt-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p>Ce canal nécessite de connecter votre compte Slack.</p>
                          <a
                            href="/api/slack/start"
                            className="inline-block mt-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-2.5 py-1 rounded-md"
                          >
                            Connecter Slack
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

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Digest hebdomadaire</h2>
        <p className="text-xs text-slate-400 mt-0.5 mb-3">
          Un récap par email de votre semaine (ou, pour les managers, de celle de votre équipe).
        </p>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-slate-900 text-sm">Recevoir le digest</p>
              <p className="text-xs text-slate-500 mt-0.5">Envoyé automatiquement par email chaque semaine.</p>
            </div>
            <button
              onClick={() => saveDigestPreference(!digestEnabled, digestTiming)}
              disabled={digestSaving}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                digestEnabled ? "bg-indigo-600" : "bg-slate-200"
              }`}
              aria-label={digestEnabled ? "Désactiver" : "Activer"}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  digestEnabled ? "translate-x-[18px]" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {digestEnabled && (
            <div className="flex items-center gap-2 mt-3">
              {(Object.keys(DIGEST_TIMING_LABELS) as DigestTiming[]).map((timing) => (
                <button
                  key={timing}
                  onClick={() => saveDigestPreference(digestEnabled, timing)}
                  disabled={digestSaving}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    digestTiming === timing
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {DIGEST_TIMING_LABELS[timing]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
