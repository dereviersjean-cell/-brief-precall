"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, Info } from "lucide-react";
import {
  AVAILABLE_CHANNELS,
  CHANNEL_META,
  type NotificationEventType,
  type NotificationChannel,
  type NotificationPreference,
} from "@/lib/notification-preferences";
import type { DigestPreference, DigestTiming } from "@/lib/db";
import FadeIn from "@/app/dashboard/FadeIn";

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

  const activeChannelsCount = useMemo(
    () => Array.from(preferences.values()).filter(Boolean).length,
    [preferences]
  );

  const [digestEnabled, setDigestEnabled] = useState(initialDigestPreference.enabled);
  const [digestTiming, setDigestTiming] = useState<DigestTiming>(initialDigestPreference.timing);
  const [digestSaving, setDigestSaving] = useState(false);
  const [digestPreviewSending, setDigestPreviewSending] = useState<DigestTiming | null>(null);
  const [digestPreviewResult, setDigestPreviewResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function sendDigestPreview(timing: DigestTiming) {
    setDigestPreviewSending(timing);
    setDigestPreviewResult(null);
    try {
      const res = await fetch("/api/digest-preferences/send-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timing }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Échec de l'envoi.");
      setDigestPreviewResult({ type: "success", message: "Aperçu envoyé — vérifiez votre boîte mail." });
    } catch (err) {
      setDigestPreviewResult({ type: "error", message: err instanceof Error ? err.message : "Échec de l'envoi." });
    } finally {
      setDigestPreviewSending(null);
    }
  }

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
    <div className="max-w-3xl mx-auto w-full px-6 py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-100/40 to-transparent blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-3">
              <Bell className="w-3 h-3" />
              Distribution
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Notifications et distribution</h1>
            <p className="text-sm text-slate-500 mt-1">
              Choisissez où recevoir vos briefs pré-call et vos analyses post-call.
              {activeChannelsCount > 0 && (
                <> · {activeChannelsCount} {activeChannelsCount === 1 ? "canal actif" : "canaux actifs"}</>
              )}
            </p>
          </div>
        </div>
      </FadeIn>

      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3.5 mb-8">
        <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
          <Info className="w-4 h-4 text-indigo-500" />
        </span>
        <p className="text-sm text-indigo-700 mt-0.5">
          Vous pouvez activer plusieurs canaux à la fois. Si aucun canal n&apos;est activé, aucune notification ne
          sera envoyée.
        </p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section, index) => (
          <FadeIn key={section.eventType} delay={0.05 + index * 0.05}>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">{section.description}</p>

              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
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
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm p-3 mt-3">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p>Ce canal nécessite une reconnexion à Google Calendar avec l&apos;autorisation d&apos;écriture.</p>
                            <Link
                              href="/settings/connexions"
                              className="inline-block mt-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-2.5 py-1 rounded-lg"
                            >
                              Reconnecter Google Calendar
                            </Link>
                          </div>
                        </div>
                      )}
                      {showHubspotWarning && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm p-3 mt-3">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p>Ce canal nécessite une reconnexion à HubSpot avec l&apos;autorisation d&apos;écriture (notes, meetings).</p>
                            <a
                              href="/api/crm/hubspot/start"
                              className="inline-block mt-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-2.5 py-1 rounded-lg"
                            >
                              Reconnecter HubSpot
                            </a>
                          </div>
                        </div>
                      )}
                      {showPipedriveWarning && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm p-3 mt-3">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p>Ce canal nécessite une reconnexion à Pipedrive avec l&apos;autorisation d&apos;écriture (deals, contacts, activités).</p>
                            <a
                              href="/api/crm/pipedrive/start"
                              className="inline-block mt-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-2.5 py-1 rounded-lg"
                            >
                              Reconnecter Pipedrive
                            </a>
                          </div>
                        </div>
                      )}
                      {showSlackWarning && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm p-3 mt-3">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p>Ce canal nécessite de connecter votre compte Slack.</p>
                            <Link
                              href="/settings/connexions"
                              className="inline-block mt-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-2.5 py-1 rounded-lg"
                            >
                              Connecter Slack
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.15}>
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">Digest hebdomadaire</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">
            Un récap par email de votre semaine (ou, pour les managers, de celle de votre équipe).
          </p>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5">
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
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              {(Object.keys(DIGEST_TIMING_LABELS) as DigestTiming[]).map((timing) => (
                <button
                  key={timing}
                  onClick={() => sendDigestPreview(timing)}
                  disabled={digestPreviewSending !== null}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {digestPreviewSending === timing ? "Envoi…" : `Aperçu "${DIGEST_TIMING_LABELS[timing]}"`}
                </button>
              ))}
            </div>
            {digestPreviewResult && (
              <p className={`text-xs mt-2 ${digestPreviewResult.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                {digestPreviewResult.message}
              </p>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
