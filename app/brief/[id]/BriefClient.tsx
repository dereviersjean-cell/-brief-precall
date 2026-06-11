"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Meeting, Brief, TalkingPoint, NewsItem } from "@/lib/types";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function TalkingPointItem({ point, color }: { point: TalkingPoint; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full ${color} mt-1.5 shrink-0`} />
      <div>
        <p className="font-semibold text-slate-800 text-sm">{point.title}</p>
        <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">{point.detail}</p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function GeneratingProgress({ company }: { company: string }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timeouts = [
      setTimeout(() => setCurrentStep(1), 2000),
      setTimeout(() => setCurrentStep(2), 4000),
      setTimeout(() => setCurrentStep(3), 6000),
    ];
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const steps = [
    {
      label: "Recherche des informations sur l'entreprise...",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      label: "Analyse des actualités récentes...",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
      ),
    },
    {
      label: "Identification des pain points...",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
    },
    {
      label: "Rédaction de votre brief...",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
    },
  ];

  const progressWidth = currentStep >= 3 ? 90 : Math.round((currentStep / 4) * 100);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Génération de votre brief</h2>
          <p className="text-slate-500 text-sm mt-1">Analyse de {company} en cours...</p>
        </div>

        <div className="h-1 bg-slate-100 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="space-y-2">
          {steps.map((step, i) => {
            const isCompleted = i < currentStep;
            const isActive = i === currentStep;

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                  isActive
                    ? "bg-indigo-50 border border-indigo-100"
                    : "border border-transparent"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                    isCompleted
                      ? "bg-emerald-100 text-emerald-600"
                      : isActive
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-300"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>

                <span
                  className={`text-sm flex-1 transition-all duration-500 ${
                    isCompleted
                      ? "text-slate-400"
                      : isActive
                      ? "text-slate-900 font-medium"
                      : "text-slate-300"
                  }`}
                >
                  {step.label}
                </span>

                {isActive && (
                  <div className="shrink-0 text-indigo-500">
                    <Spinner />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const talkingPointColors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500"];
const painPointColors = ["bg-rose-500", "bg-orange-500", "bg-red-400", "bg-pink-500"];

interface ApiResponse {
  overview: string;
  accroche: string;
  pain_points: Array<{ title: string; detail: string }>;
  arguments: Array<{ title: string; detail: string }>;
  vocabulaire: string[];
  actualites?: NewsItem[];
  references?: Array<{ client_name: string; relevance: string; pitch: string }>;
}

function adaptApiBrief(api: ApiResponse): Brief {
  return {
    companyOverview: api.overview,
    suggestedOpeningLine: api.accroche,
    painPoints: api.pain_points,
    talkingPoints: api.arguments,
    recentNews: [],
    objectives: [],
    keywords: api.vocabulaire,
    actualites: api.actualites,
    references: api.references,
  };
}

function formatNewsDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function BriefClient({
  meeting,
  autoGenerate = false,
}: {
  meeting: Meeting;
  autoGenerate?: boolean;
}) {
  const [brief, setBrief] = useState<Brief | null>(meeting.brief ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [rateLimited, setRateLimited] = useState<{ message: string; retryAfterMs: number } | null>(null);

  const generateBrief = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setRateLimited(null);
    try {
      const res = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: meeting.company }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setRateLimited({ message: data.error ?? "Limite atteinte.", retryAfterMs: data.retryAfterMs ?? 0 });
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }
      setBrief(adaptApiBrief(data as ApiResponse));
      setIsAiGenerated(true);
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setIsGenerating(false);
    }
  }, [meeting.company]);

  useEffect(() => {
    if (autoGenerate && !meeting.brief) {
      generateBrief();
    }
  }, [autoGenerate, generateBrief, meeting.brief]);

  const badge = isGenerating
    ? { label: "Génération...", bg: "bg-indigo-50", fg: "text-indigo-700", dot: "bg-indigo-400 animate-pulse" }
    : isAiGenerated
    ? { label: "Brief IA", bg: "bg-violet-50", fg: "text-violet-700", dot: "bg-violet-500" }
    : brief
    ? { label: "Données mockées", bg: "bg-amber-50", fg: "text-amber-700", dot: "bg-amber-400" }
    : { label: "Aucun brief", bg: "bg-slate-100", fg: "text-slate-500", dot: "bg-slate-400" };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <span className="text-slate-200">/</span>
            <span className="text-sm font-medium text-slate-900">{meeting.company}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-sm text-slate-600 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Partager
            </button>
            <button className="flex items-center gap-2 text-sm text-slate-600 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter PDF
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto w-full px-6 py-8">
        {/* Meeting header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0">
                {meeting.company.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{meeting.company}</h1>
                <p className="text-slate-500 mt-0.5">
                  {formatDateTime(meeting.date)} · {meeting.duration} min · {meeting.industry}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2 ${badge.bg} ${badge.fg} text-sm font-medium px-3 py-1.5 rounded-full`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </div>
          </div>
        </div>

        {/* Rate limit banner */}
        {rateLimited && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-0.5">Limite de génération atteinte</p>
              <p className="text-sm text-amber-700">{rateLimited.message}</p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={generateBrief}
              disabled={isGenerating}
              className="text-sm font-medium text-red-700 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors shrink-0 disabled:opacity-50"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Mock data banner */}
        {!isAiGenerated && !error && brief && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-700">
                Ce brief utilise des données exemples. Générez une version personnalisée par l&apos;IA.
              </p>
            </div>
            <button
              onClick={generateBrief}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shrink-0 disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Spinner />
                  Génération...
                </>
              ) : (
                "Générer avec l'IA →"
              )}
            </button>
          </div>
        )}

        {/* Loading skeleton (no brief yet) */}
        {isGenerating && !brief && <GeneratingProgress company={meeting.company} />}

        {/* Brief content */}
        {brief && (
          <div className={`transition-opacity duration-200 ${isGenerating ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            {/* Suggested opening line */}
            {brief.suggestedOpeningLine && (
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💬</span>
                  <div>
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                      Accroche suggérée
                    </p>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      &ldquo;{brief.suggestedOpeningLine}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-6">
              {/* Main column */}
              <div className="col-span-2 space-y-6">
                <Section title="Vue d'ensemble">
                  <p className="text-slate-700 leading-relaxed text-sm">{brief.companyOverview}</p>
                  {(brief.revenue || brief.employees || meeting.website) && (
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                      {brief.revenue && (
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Revenus</p>
                          <p className="text-sm font-semibold text-slate-800">{brief.revenue}</p>
                        </div>
                      )}
                      {brief.employees && (
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Effectif</p>
                          <p className="text-sm font-semibold text-slate-800">{brief.employees}</p>
                        </div>
                      )}
                      {meeting.website && (
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Site web</p>
                          <p className="text-sm font-semibold text-indigo-600">{meeting.website}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Section>

                {brief.actualites && brief.actualites.length > 0 && (
                  <Section title="Actualités récentes">
                    <div className="space-y-3">
                      {brief.actualites.map((article, i) => (
                        <a
                          key={i}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 group rounded-xl p-3 -mx-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-800 text-sm font-medium leading-snug group-hover:text-indigo-600 transition-colors">
                              {article.titre}
                            </p>
                            {article.description && (
                              <p className="text-slate-500 text-xs mt-0.5 leading-relaxed line-clamp-2">
                                {article.description}
                              </p>
                            )}
                            <p className="text-slate-400 text-xs mt-1">
                              {article.source}
                              {(() => { const d = formatNewsDate(article.date); return d ? ` · ${d}` : ""; })()}
                            </p>
                          </div>
                          <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </Section>
                )}

                {brief.recentNews.length > 0 && (
                  <Section title="Actualités (texte)">
                    <div className="space-y-3">
                      {brief.recentNews.map((news, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed">{news}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {brief.talkingPoints.length > 0 && (
                  <Section title="Arguments commerciaux">
                    <div className="space-y-4">
                      {brief.talkingPoints.map((p, i) => (
                        <TalkingPointItem key={i} point={p} color={talkingPointColors[i % talkingPointColors.length]} />
                      ))}
                    </div>
                  </Section>
                )}

                {brief.references && brief.references.length > 0 && (
                  <Section title="Références clients">
                    <div className="space-y-4">
                      {brief.references.map((ref, i) => (
                        <div key={i} className={i > 0 ? "pt-4 border-t border-slate-100" : ""}>
                          <p className="font-semibold text-slate-800 text-sm mb-1">{ref.client_name}</p>
                          <p className="text-slate-500 text-xs mb-3 leading-relaxed">{ref.relevance}</p>
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1.5">
                              À dire en call
                            </p>
                            <p className="text-indigo-900 text-sm leading-relaxed">{ref.pitch}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {brief.painPoints.length > 0 && (
                  <Section title="Pain points identifiés">
                    <div className="space-y-4">
                      {brief.painPoints.map((p, i) => (
                        <TalkingPointItem key={i} point={p} color={painPointColors[i % painPointColors.length]} />
                      ))}
                    </div>
                  </Section>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Section title="Contacts">
                  <div className="space-y-4">
                    {meeting.contacts.map((c, i) => (
                      <div key={i} className={i > 0 ? "pt-4 border-t border-slate-100" : ""}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                            {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm leading-none">{c.name}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{c.title}</p>
                          </div>
                        </div>
                        {c.email && <p className="text-xs text-slate-500 mb-1.5">✉ {c.email}</p>}
                        {c.notes && (
                          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                            {c.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>

                {brief.objectives.length > 0 && (
                  <Section title="Objectifs du call">
                    <div className="space-y-2.5">
                      {brief.objectives.map((obj, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded border-2 border-slate-300 shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-700 leading-relaxed">{obj}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {brief.competitorsUsed && brief.competitorsUsed.length > 0 && (
                  <Section title="Outils utilisés actuellement">
                    <div className="flex flex-wrap gap-2">
                      {brief.competitorsUsed.map((c) => (
                        <span key={c} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {brief.keywords && brief.keywords.length > 0 && (
                  <Section title="Vocabulaire métier">
                    <div className="flex flex-wrap gap-2">
                      {brief.keywords.map((kw) => (
                        <span key={kw} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Regenerate button */}
                <button
                  onClick={generateBrief}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl py-3 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Spinner />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Régénérer le brief
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state (no brief, not generating) */}
        {!brief && !isGenerating && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <h2 className="text-slate-700 font-semibold mb-1">Aucun brief pour ce rendez-vous</h2>
            <p className="text-slate-500 text-sm mb-6">
              Générez un brief IA personnalisé pour {meeting.company}.
            </p>
            <button
              onClick={generateBrief}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Générer avec l&apos;IA
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
