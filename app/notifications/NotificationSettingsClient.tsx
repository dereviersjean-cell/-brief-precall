"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import {
  AVAILABLE_CHANNELS,
  CHANNEL_META,
  CHANNEL_MODULE,
  type NotificationEventType,
  type NotificationChannel,
  type NotificationPreference,
} from "@/lib/notification-preferences";
import type { DigestPreference, DigestTiming } from "@/lib/db";
import FadeIn from "@/app/dashboard/FadeIn";
import { useModules } from "@/app/components/ModulesProvider";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";

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
  // Canaux CRM et Slack, digest : visibles seulement si leur module est ouvert.
  const { isEnabled: isModuleEnabled } = useModules();

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
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="mb-6">
          <PageHeader
            eyebrow="Distribution"
            title="Notifications et distribution"
            subtitle={
              <>
                Choisissez où recevoir vos briefs pré-call et vos analyses post-call.
                {activeChannelsCount > 0 && (
                  <> · {activeChannelsCount} {activeChannelsCount === 1 ? "canal actif" : "canaux actifs"}</>
                )}
              </>
            }
          />
        </div>
      </FadeIn>

      <div className="mb-8 flex items-start gap-2.5 rounded-2xl bg-[color:var(--lavender)] px-4 py-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--violet)]" />
        <p className="text-[13px] leading-relaxed text-slate-600">
          Vous pouvez activer plusieurs canaux à la fois. Si aucun canal n&apos;est activé, aucune notification ne
          sera envoyée.
        </p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section, index) => (
          <FadeIn key={section.eventType} delay={0.05 + index * 0.05}>
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">{section.title}</h2>
              <p className="mb-3 mt-1 text-[12.5px] text-slate-500">{section.description}</p>

              <Card padded={false} className="divide-y divide-border">
                {AVAILABLE_CHANNELS[section.eventType]
                  .filter((channel) => {
                    const required = CHANNEL_MODULE[channel];
                    return !required || isModuleEnabled(required);
                  })
                  .map((channel) => {
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
                    <div key={channel} className="px-4 py-3.5 sm:px-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13.5px] font-medium text-slate-900">{meta.label}</p>
                            {disabled && (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-500">
                                Bientôt disponible
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[12.5px] text-slate-500">{meta.description}</p>
                        </div>
                        <button
                          onClick={() => handleToggle(section.eventType, channel)}
                          disabled={disabled}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                            enabled ? "bg-[color:var(--primary)]" : "bg-slate-200"
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
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[color:var(--warning-soft)] p-3 text-[13px] leading-relaxed text-amber-800">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          <div className="flex-1 min-w-0">
                            <p>Ce canal nécessite une reconnexion à Google Calendar avec l&apos;autorisation d&apos;écriture.</p>
                            <Link
                              href="/settings/connexions"
                              className="mt-2 inline-flex h-8 items-center rounded-lg bg-white px-3 text-[12px] font-semibold text-amber-800 transition-colors hover:bg-white/70"
                            >
                              Reconnecter Google Calendar
                            </Link>
                          </div>
                        </div>
                      )}
                      {showHubspotWarning && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[color:var(--warning-soft)] p-3 text-[13px] leading-relaxed text-amber-800">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          <div className="flex-1 min-w-0">
                            <p>Ce canal nécessite une reconnexion à HubSpot avec l&apos;autorisation d&apos;écriture (notes, meetings).</p>
                            <a
                              href="/api/crm/hubspot/start"
                              className="mt-2 inline-flex h-8 items-center rounded-lg bg-white px-3 text-[12px] font-semibold text-amber-800 transition-colors hover:bg-white/70"
                            >
                              Reconnecter HubSpot
                            </a>
                          </div>
                        </div>
                      )}
                      {showPipedriveWarning && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[color:var(--warning-soft)] p-3 text-[13px] leading-relaxed text-amber-800">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          <div className="flex-1 min-w-0">
                            <p>Ce canal nécessite une reconnexion à Pipedrive avec l&apos;autorisation d&apos;écriture (deals, contacts, activités).</p>
                            <a
                              href="/api/crm/pipedrive/start"
                              className="mt-2 inline-flex h-8 items-center rounded-lg bg-white px-3 text-[12px] font-semibold text-amber-800 transition-colors hover:bg-white/70"
                            >
                              Reconnecter Pipedrive
                            </a>
                          </div>
                        </div>
                      )}
                      {showSlackWarning && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[color:var(--warning-soft)] p-3 text-[13px] leading-relaxed text-amber-800">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          <div className="flex-1 min-w-0">
                            <p>Ce canal nécessite de connecter votre compte Slack.</p>
                            <Link
                              href="/settings/connexions"
                              className="mt-2 inline-flex h-8 items-center rounded-lg bg-white px-3 text-[12px] font-semibold text-amber-800 transition-colors hover:bg-white/70"
                            >
                              Connecter Slack
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>
          </FadeIn>
        ))}
      </div>

      {isModuleEnabled("weekly_digest") && (
      <FadeIn delay={0.15}>
        <div className="mt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Digest hebdomadaire</h2>
          <p className="mb-3 mt-1 text-[12.5px] text-slate-500">
            Un récap par email de votre semaine (ou, pour les managers, de celle de votre équipe).
          </p>
          <Card padded={false} className="px-4 py-3.5 sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-slate-900">Recevoir le digest</p>
                <p className="mt-0.5 text-[12.5px] text-slate-500">Envoyé automatiquement par email chaque semaine.</p>
              </div>
              <button
                onClick={() => saveDigestPreference(!digestEnabled, digestTiming)}
                disabled={digestSaving}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                  digestEnabled ? "bg-[color:var(--primary)]" : "bg-slate-200"
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(Object.keys(DIGEST_TIMING_LABELS) as DigestTiming[]).map((timing) => (
                  <button
                    key={timing}
                    onClick={() => saveDigestPreference(digestEnabled, timing)}
                    disabled={digestSaving}
                    className={`inline-flex h-8 items-center rounded-full border px-3 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      digestTiming === timing
                        ? "border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] text-[color:var(--violet)]"
                        : "border-border bg-white text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {DIGEST_TIMING_LABELS[timing]}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {(Object.keys(DIGEST_TIMING_LABELS) as DigestTiming[]).map((timing) => (
                <button
                  key={timing}
                  onClick={() => sendDigestPreview(timing)}
                  disabled={digestPreviewSending !== null}
                  className="inline-flex h-8 items-center rounded-lg border border-border bg-white px-3 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {digestPreviewSending === timing ? "Envoi…" : `Aperçu "${DIGEST_TIMING_LABELS[timing]}"`}
                </button>
              ))}
            </div>
            {digestPreviewResult && (
              <p className={`mt-2 text-[12.5px] ${digestPreviewResult.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                {digestPreviewResult.message}
              </p>
            )}
          </Card>
        </div>
      </FadeIn>
      )}
    </div>
  );
}
