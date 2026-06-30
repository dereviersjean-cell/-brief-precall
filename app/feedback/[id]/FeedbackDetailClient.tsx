"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { CallWithAnalysis, AnalysisScores } from "@/lib/db";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ScoreBar({ score, label, description }: { score: number; label: string; description?: string }) {
  const pct = Math.round((score / 5) * 100);
  const color =
    score >= 4 ? "bg-green-500" : score >= 2.5 ? "bg-orange-400" : "bg-red-400";
  const textColor =
    score >= 4 ? "text-green-700" : score >= 2.5 ? "text-orange-600" : "text-red-600";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={`text-sm font-bold ${textColor}`}>{score}/5</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
    </div>
  );
}

function List({ items, icon, color }: { items: string[]; icon: string; color: string }) {
  if (items.length === 0) return <p className="text-slate-400 text-sm italic">Aucun élément.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className={`text-sm mt-0.5 ${color}`}>{icon}</span>
          <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

type SendStatus = "idle" | "sending" | "sent" | "error" | "auth-error";
type VideoStatus = "idle" | "loading" | "ready" | "unavailable";
type ReplyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "replied"; repliedAt: string; body: string | null; open: boolean; loadingBody: boolean }
  | { status: "none" };

function formatSentAt(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

export default function FeedbackDetailClient({ call }: { call: CallWithAnalysis }) {
  const [copied, setCopied] = useState(false);
  const [subject, setSubject] = useState(call.follow_up_email?.subject ?? "");
  const [body, setBody] = useState(call.follow_up_email?.body ?? "");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [sentAt, setSentAt] = useState<string | null>(call.follow_up_sent_at ?? null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [reply, setReply] = useState<ReplyState>({ status: "idle" });

  useEffect(() => {
    if (!call.follow_up_sent_at) return;
    setReply({ status: "loading" });
    fetch(`/api/feedback/check-reply?callId=${call.id}`)
      .then((r) => r.json())
      .then((data: { replied: boolean; repliedAt?: string; body?: string | null }) => {
        if (data.replied && data.repliedAt) {
          setReply({ status: "replied", repliedAt: data.repliedAt, body: data.body ?? null, open: false, loadingBody: false });
        } else {
          setReply({ status: "none" });
        }
      })
      .catch(() => setReply({ status: "none" }));
  }, [call.id, call.follow_up_sent_at]);

  const a = call.analysis;
  const scores = a?.scores as AnalysisScores | null;
  const globalScore = scores?.global_score ?? null;

  const globalColor =
    globalScore === null
      ? "text-slate-400"
      : globalScore >= 4
      ? "text-green-600"
      : globalScore >= 2.5
      ? "text-orange-500"
      : "text-red-500";

  const sentimentBg: Record<string, string> = {
    positif: "bg-green-100 text-green-700",
    neutre: "bg-slate-100 text-slate-500",
    négatif: "bg-red-100 text-red-600",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Back */}
        <Link
          href="/feedback"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour aux feedbacks
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {call.company_name || call.contact_email || "Call sans titre"}
              </h1>
              {call.company_name && call.contact_email && (
                <p className="text-slate-400 text-sm mt-0.5">{call.contact_email}</p>
              )}
              <p className="text-slate-400 text-sm mt-1 flex items-center gap-3 flex-wrap">
                <span>{formatDateTime(call.started_at ?? call.created_at)}</span>
                {call.duration_seconds !== null && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                    </svg>
                    {formatDuration(call.duration_seconds)}
                  </span>
                )}
                {call.participant_count !== null && (
                  <span>{call.participant_count} {call.participant_count === 1 ? "participant" : "participants"}</span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              {globalScore !== null && (
                <p className={`text-3xl font-bold ${globalColor}`}>
                  {globalScore.toFixed(1)}<span className="text-base font-medium text-slate-300">/5</span>
                </p>
              )}
              {a?.sentiment && (
                <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${sentimentBg[a.sentiment] ?? "bg-slate-100 text-slate-500"}`}>
                  {a.sentiment}
                </span>
              )}
            </div>
          </div>
        </div>

        {!a ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
            Analyse non disponible pour cet appel.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Coaching summary */}
            {a.summary && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">Synthèse coaching</p>
                <p className="text-slate-700 text-sm leading-relaxed">{a.summary}</p>
              </div>
            )}

            {/* Enregistrement vidéo */}
            {call.recall_bot_id && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Enregistrement</h2>
                  {videoStatus === "idle" && (
                    <button
                      onClick={async () => {
                        setVideoStatus("loading");
                        try {
                          const res = await fetch(`/api/recall/video-url?callId=${call.id}`);
                          if (!res.ok) { setVideoStatus("unavailable"); return; }
                          const { videoUrl: url } = await res.json() as { videoUrl: string };
                          setVideoUrl(url);
                          setVideoStatus("ready");
                        } catch {
                          setVideoStatus("unavailable");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Voir l&apos;enregistrement
                    </button>
                  )}
                  {videoStatus === "loading" && (
                    <span className="text-xs text-slate-400">Chargement…</span>
                  )}
                </div>
                {videoStatus === "ready" && videoUrl && (
                  <video
                    controls
                    src={videoUrl}
                    className="w-full rounded-xl bg-black"
                    style={{ maxHeight: "360px" }}
                  />
                )}
                {videoStatus === "unavailable" && (
                  <p className="text-sm text-slate-400 italic">Enregistrement non disponible.</p>
                )}
              </div>
            )}

            {/* Scores par dimension */}
            {scores && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
                  Scores par dimension
                </h2>
                <div className="space-y-5">
                  <ScoreBar
                    score={scores.opening_framing.score}
                    label="Ouverture & cadrage"
                    description={scores.opening_framing.description}
                  />
                  <ScoreBar
                    score={scores.pain_point.score}
                    label="Découverte des besoins"
                    description={scores.pain_point.description}
                  />
                  <ScoreBar
                    score={scores.pitch_demo.score}
                    label="Argumentation & démo"
                    description={scores.pitch_demo.description}
                  />
                  <ScoreBar
                    score={scores.next_step.score}
                    label="Conclusion & suite"
                    description={scores.next_step.description}
                  />
                </div>
              </div>
            )}

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Points forts</h2>
                <List items={a.strengths ?? []} icon="✓" color="text-green-500" />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Axes d&apos;amélioration</h2>
                <List items={a.weaknesses ?? []} icon="△" color="text-orange-400" />
              </div>
            </div>

            {/* Objections */}
            {(a.objections ?? []).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Objections rencontrées</h2>
                <List items={a.objections ?? []} icon="–" color="text-slate-400" />
              </div>
            )}

            {/* Next steps */}
            {(a.next_steps ?? []).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Prochaines étapes</h2>
                <List items={a.next_steps ?? []} icon="→" color="text-indigo-400" />
              </div>
            )}

            {/* Email de suivi */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email de suivi suggéré</h2>
                {call.follow_up_email && !sentAt && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const text = `Objet : ${subject}\n\n${body}`;
                        navigator.clipboard.writeText(text).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        });
                      }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50"
                    >
                      {copied ? "Copié !" : "Copier"}
                    </button>
                    <button
                      disabled={sendStatus === "sending"}
                      onClick={async () => {
                        const to = call.contact_email ?? "ce contact";
                        if (!window.confirm(`Envoyer cet email à ${to} ?`)) return;
                        setSendStatus("sending");
                        try {
                          const res = await fetch("/api/feedback/send-follow-up", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ callId: call.id, subject, body }),
                          });
                          if (res.status === 401 || res.status === 403) {
                            setSendStatus("auth-error");
                            return;
                          }
                          if (!res.ok) {
                            setSendStatus("error");
                            return;
                          }
                          const now = new Date().toISOString();
                          setSentAt(now);
                          setSendStatus("sent");
                        } catch {
                          setSendStatus("error");
                        }
                      }}
                      className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-2.5 py-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendStatus === "sending" ? "Envoi…" : "Envoyer"}
                    </button>
                  </div>
                )}
                {sentAt && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-emerald-600 font-medium">
                      Envoyé le {formatSentAt(sentAt)}
                    </span>
                    {reply.status === "replied" && (
                      <button
                        onClick={() =>
                          setReply((r) =>
                            r.status === "replied" ? { ...r, open: !r.open } : r
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                      >
                        <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Le prospect a répondu
                        <svg
                          className={`w-3 h-3 shrink-0 transition-transform ${reply.open ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {sendStatus === "auth-error" && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                  Reconnecte-toi à Google pour envoyer cet email.{" "}
                  <a href="/api/auth/signout" className="font-medium underline hover:text-amber-900">
                    Se déconnecter
                  </a>
                </div>
              )}
              {sendStatus === "error" && (
                <p className="mb-4 text-sm text-red-600">Erreur lors de l&apos;envoi, réessaie.</p>
              )}

              {reply.status === "replied" && reply.open && (
                <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1.5">
                    Réponse du prospect — {formatSentAt(reply.repliedAt)}
                  </p>
                  {reply.body !== null ? (
                    <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {reply.body}
                    </pre>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-slate-500 italic">Contenu non chargé.</p>
                      <button
                        disabled={reply.loadingBody}
                        onClick={async () => {
                          setReply((r) => r.status === "replied" ? { ...r, loadingBody: true } : r);
                          try {
                            const res = await fetch(`/api/feedback/check-reply?callId=${call.id}&force=true`);
                            const data = await res.json() as { replied: boolean; repliedAt?: string; body?: string | null };
                            setReply((r) =>
                              r.status === "replied"
                                ? { ...r, body: data.body ?? null, loadingBody: false }
                                : r
                            );
                          } catch {
                            setReply((r) => r.status === "replied" ? { ...r, loadingBody: false } : r);
                          }
                        }}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reply.loadingBody ? "Chargement…" : "Charger le contenu"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {call.follow_up_email ? (
                <>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                    placeholder="Objet"
                  />
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-3 border border-slate-200 rounded-lg text-sm text-slate-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                  />
                </>
              ) : (
                <p className="text-slate-400 text-sm italic">Email de suivi en cours de génération…</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
