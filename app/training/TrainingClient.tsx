"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell,
  Mic,
  MicOff,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  Flag,
  Sparkles,
  Trophy,
  XCircle,
  HelpCircle,
  MessagesSquare,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card, Button } from "@/app/components/ui/ui-bits";
import FadeIn from "@/app/dashboard/FadeIn";
import { MEETING_STAGE_SHORT_LABELS } from "@/lib/meeting-stage";
import type { TrainingDebrief, TrainingObjectionCandidate, TrainingScenario, TrainingSessionRow, TrainingTurn } from "@/lib/db";

// ── Web Speech API (reconnaissance vocale navigateur) ──────────────────────
// Pas dans les types TS standard — interface minimale locale. Supporté par
// Chrome/Edge/Safari (fr-FR) ; sur Firefox le micro est masqué et le
// commercial tape sa réponse — le reste de la session est identique.
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: { length: number; [i: number]: SpeechRecognitionResultLike } };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speak(text: string, enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("fr"));
  if (voice) utterance.voice = voice;
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}

const SOURCE_BADGES: Record<TrainingObjectionCandidate["source"], { label: string; cls: string }> = {
  no_response: { label: "Restée sans réponse", cls: "bg-amber-50 border-amber-200 text-amber-700" },
  lost_deal: { label: "Deal perdu", cls: "bg-rose-50 border-rose-200 text-rose-700" },
  unknown_outcome: { label: "Issue inconnue", cls: "bg-slate-50 border-border text-slate-500" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function ScoreChipSmall({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-300">—</span>;
  const cls = score >= 4 ? "bg-green-100 text-green-700" : score >= 2.5 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{score.toFixed(1)}/5</span>;
}

function HandledChip({ value }: { value: TrainingDebrief["objection_handled"] }) {
  if (value === "oui") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color:var(--success-soft)] text-emerald-700">
        <Trophy className="w-3 h-3" /> Objection traitée
      </span>
    );
  }
  if (value === "non") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color:var(--danger-soft)] text-rose-700">
        <XCircle className="w-3 h-3" /> Objection non traitée
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
      <HelpCircle className="w-3 h-3" /> Partiellement traitée
    </span>
  );
}

function DebriefView({ debrief }: { debrief: TrainingDebrief }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold ${
              debrief.global_score >= 4 ? "text-green-600" : debrief.global_score >= 2.5 ? "text-orange-500" : "text-red-500"
            }`}
          >
            {debrief.global_score.toFixed(1)}
          </span>
          <span className="text-sm text-slate-400">/5</span>
        </div>
        <HandledChip value={debrief.objection_handled} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {debrief.axes.map((axis) => (
          <div key={axis.key} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-slate-700">{axis.label}</span>
              <span className="tabular-nums font-semibold text-slate-900">{axis.score.toFixed(1)}/5</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-[color:var(--lavender)]">
              <div className="h-full rounded-full brand-gradient" style={{ width: `${(axis.score / 5) * 100}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-slate-500 leading-relaxed">{axis.comment}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-2">Points forts</p>
          <ul className="space-y-1.5 text-[13px] text-slate-700">
            {debrief.strengths.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-rose-50/60 border border-rose-100 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 mb-2">À travailler</p>
          <ul className="space-y-1.5 text-[13px] text-slate-700">
            {debrief.weaknesses.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl bg-[color:var(--lavender)] border border-[color:var(--lavender-strong)] p-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--violet)] mb-2">
          <Sparkles className="w-3.5 h-3.5" /> La réponse à retenir
        </p>
        <p className="text-[13.5px] text-slate-800 leading-relaxed italic">« {debrief.better_response} »</p>
      </div>
    </div>
  );
}

type ActiveSession = {
  id: string;
  scenario: TrainingScenario;
  transcript: TrainingTurn[];
};

export default function TrainingClient({
  candidates,
  history,
  initialObjection,
}: {
  candidates: TrainingObjectionCandidate[];
  history: TrainingSessionRow[];
  initialObjection: string | null;
}) {
  const router = useRouter();

  const [session, setSession] = useState<ActiveSession | null>(null);
  const [debrief, setDebrief] = useState<TrainingDebrief | null>(null);
  const [starting, setStarting] = useState<string | null>(null); // key du scénario en cours de démarrage
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [customObjection, setCustomObjection] = useState(initialObjection ?? "");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // ── Voix ──
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Ref maintenue en effect (pas pendant le render) — les callbacks async
  // (réponse du prospect après un await) lisent la valeur à jour du toggle.
  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  // Détection du support micro, hydration-safe : false côté serveur, la
  // vraie valeur au premier render client — sans setState dans un effect.
  const micSupported = useSyncExternalStore(
    () => () => {},
    () => getSpeechRecognition() !== null,
    () => false
  );

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Certains navigateurs chargent les voix de synthèse en asynchrone — un
    // premier getVoices() vide se re-remplit ensuite tout seul.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session?.transcript.length, debrief]);

  // Coupe micro + synthèse en quittant la page/session.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
  }, []);

  function toggleRecording() {
    if (recording) {
      stopRecording();
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) return;
    // Le prospect se tait quand le commercial prend la parole.
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();

    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
      }
      if (finalChunk) setDraft((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  async function startSession(input: {
    key: string;
    objection: string;
    originalResponse?: string | null;
    source?: string;
    sourceCallId?: string | null;
    companyName?: string | null;
    meetingStage?: string | null;
  }) {
    setStarting(input.key);
    setError(null);
    try {
      const res = await fetch("/api/training/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objection: input.objection,
          originalResponse: input.originalResponse ?? null,
          source: input.source,
          sourceCallId: input.sourceCallId ?? null,
          companyName: input.companyName ?? null,
          meetingStage: input.meetingStage ?? null,
        }),
      });
      const data = (await res.json()) as { id?: string; scenario?: TrainingScenario; transcript?: TrainingTurn[]; error?: string };
      if (!res.ok || !data.id || !data.scenario || !data.transcript) {
        throw new Error(data.error ?? "Impossible de démarrer la session.");
      }
      setSession({ id: data.id, scenario: data.scenario, transcript: data.transcript });
      setDebrief(null);
      setDraft("");
      const opening = data.transcript.find((t) => t.role === "prospect");
      if (opening) speak(opening.text, voiceEnabledRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de démarrer la session.");
    } finally {
      setStarting(null);
    }
  }

  async function sendMessage() {
    if (!session || sending) return;
    const message = draft.trim();
    if (!message) return;
    stopRecording();
    setSending(true);
    setError(null);
    setDraft("");
    setSession((prev) =>
      prev ? { ...prev, transcript: [...prev.transcript, { role: "commercial", text: message, at: new Date().toISOString() }] } : prev
    );
    try {
      const res = await fetch(`/api/training/sessions/${session.id}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "Le prospect n'a pas pu répondre.");
      const reply = data.reply;
      setSession((prev) =>
        prev ? { ...prev, transcript: [...prev.transcript, { role: "prospect", text: reply, at: new Date().toISOString() }] } : prev
      );
      speak(reply, voiceEnabledRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le prospect n'a pas pu répondre.");
      setDraft(message); // ne pas perdre la réplique tapée/dictée
      setSession((prev) => (prev ? { ...prev, transcript: prev.transcript.filter((t) => t.text !== message || t.role !== "commercial") } : prev));
    } finally {
      setSending(false);
    }
  }

  async function finishSession() {
    if (!session || finishing) return;
    stopRecording();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setFinishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/training/sessions/${session.id}/finish`, { method: "POST" });
      const data = (await res.json()) as { debrief?: TrainingDebrief; error?: string };
      if (!res.ok || !data.debrief) throw new Error(data.error ?? "Le débrief n'a pas pu être généré.");
      setDebrief(data.debrief);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le débrief n'a pas pu être généré.");
    } finally {
      setFinishing(false);
    }
  }

  function backToHome() {
    stopRecording();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSession(null);
    setDebrief(null);
    setError(null);
    router.refresh(); // recharge l'historique côté serveur
  }

  const commercialTurns = session?.transcript.filter((t) => t.role === "commercial").length ?? 0;

  // ── Écran session ──
  if (session) {
    const persona = session.scenario.persona;
    return (
      <main className="brief-ui mx-auto px-4 sm:px-10 py-8 max-w-4xl">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl brand-gradient text-white text-[14px] font-semibold">
              {persona.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-slate-900 truncate">{persona.name}</p>
              <p className="text-[12.5px] text-slate-500 truncate">
                {persona.role} · {persona.company}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!debrief && (
              <>
                <button
                  onClick={() => setVoiceEnabled((v) => !v)}
                  title={voiceEnabled ? "Couper la voix du prospect" : "Activer la voix du prospect"}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-white text-slate-600 hover:bg-slate-50"
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <Button
                  variant="primary"
                  icon={finishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                  onClick={finishSession}
                  disabled={finishing || commercialTurns < 1}
                  title={commercialTurns < 1 ? "Répondez au moins une fois avant de terminer" : undefined}
                >
                  {finishing ? "Débrief en cours…" : "Terminer & débrief"}
                </Button>
              </>
            )}
            {debrief && (
              <Button variant="secondary" onClick={backToHome}>
                Nouvelle session
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-[color:var(--lavender)]/50 px-4 py-2.5 mb-4 flex items-center gap-2 flex-wrap text-[12.5px] text-slate-700">
          <MessagesSquare className="h-3.5 w-3.5 text-[color:var(--violet)] shrink-0" />
          <span className="min-w-0">
            Objection à traiter : <b>« {session.scenario.objection} »</b>
          </span>
          {session.scenario.meetingStage && (
            <span className="inline-flex items-center rounded-full border border-[color:var(--lavender-strong)] bg-white px-1.5 py-px text-[10px] font-semibold text-[color:var(--violet)]">
              {MEETING_STAGE_SHORT_LABELS[session.scenario.meetingStage]}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[11.5px] text-slate-400 tabular-nums">{commercialTurns}/12 tours</span>
        </div>

        <Card padded={false} className="p-5">
          <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
            {session.transcript.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === "commercial" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                    turn.role === "commercial"
                      ? "brand-gradient text-white rounded-br-md"
                      : "bg-slate-50 border border-border text-slate-800 rounded-bl-md"
                  }`}
                >
                  {turn.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-slate-50 border border-border px-3.5 py-2.5 text-[13.5px] text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {!debrief && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-end gap-2">
                {micSupported && (
                  <button
                    onClick={toggleRecording}
                    title={recording ? "Arrêter la dictée" : "Répondre à la voix"}
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors ${
                      recording
                        ? "border-rose-300 bg-rose-50 text-rose-600 animate-pulse"
                        : "border-border bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {recording ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                  </button>
                )}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={2}
                  placeholder={recording ? "Parlez — votre réponse s'écrit ici…" : micSupported ? "Répondez au prospect (ou dictez au micro)…" : "Répondez au prospect…"}
                  className="flex-1 resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--violet)]/30"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !draft.trim()}
                  title="Envoyer (Entrée)"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl brand-gradient text-white shadow-[var(--shadow-glow)] hover:brightness-110 disabled:opacity-40 transition-all"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {recording && <p className="mt-2 text-[11.5px] text-rose-500">● Dictée en cours — cliquez sur le micro pour arrêter, puis envoyez.</p>}
            </div>
          )}
        </Card>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">{error}</p>
        )}

        {debrief && (
          <FadeIn>
            <Card className="mt-5">
              <h2 className="text-[15px] font-semibold text-slate-900 mb-4">Débrief de la session</h2>
              <DebriefView debrief={debrief} />
            </Card>
          </FadeIn>
        )}
      </main>
    );
  }

  // ── Écran d'accueil ──
  return (
    <main className="brief-ui mx-auto px-4 sm:px-10 py-8 max-w-5xl">
      <PageHeader
        eyebrow="Coach IA"
        title="Entraînement"
        subtitle="Travaillez les objections que vous n'avez pas su traiter en rendez-vous — face à un prospect IA qui ne lâche rien, à la voix ou au clavier."
      />

      {error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">{error}</p>
      )}

      <section className="mt-7">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">
          Vos points faibles détectés dans vos calls
        </h2>
        {candidates.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">
              Rien à travailler pour l&apos;instant — vos objections mal traitées apparaîtront ici au fil de vos calls
              analysés. Vous pouvez aussi vous entraîner sur une objection libre ci-dessous.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {candidates.map((c) => {
              const key = `${c.callId}:${c.objection}`;
              const badge = SOURCE_BADGES[c.source];
              return (
                <Card key={key} padded={false} className="p-4 flex flex-col">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {c.meetingStage && (
                      <span className="inline-flex items-center rounded-full border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-1.5 py-px text-[10px] font-semibold text-[color:var(--violet)]">
                        {MEETING_STAGE_SHORT_LABELS[c.meetingStage]}
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 text-[13.5px] font-medium text-slate-900 leading-snug flex-1">« {c.objection} »</p>
                  <p className="mt-2 text-[11.5px] text-slate-400">
                    {c.companyName ?? "Prospect"} · {formatDate(c.createdAt)}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    icon={starting === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Dumbbell className="h-3.5 w-3.5" />}
                    disabled={starting !== null}
                    onClick={() =>
                      startSession({
                        key,
                        objection: c.objection,
                        originalResponse: c.originalResponse,
                        source: c.source,
                        sourceCallId: c.callId,
                        companyName: c.companyName,
                        meetingStage: c.meetingStage,
                      })
                    }
                  >
                    {starting === key ? "Préparation du prospect…" : "M'entraîner"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">Objection libre</h2>
        <Card padded={false} className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={customObjection}
              onChange={(e) => setCustomObjection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customObjection.trim() && starting === null) {
                  startSession({ key: "custom", objection: customObjection.trim() });
                }
              }}
              placeholder="Ex : « Votre solution est trop chère pour une équipe de notre taille »"
              className="h-10 flex-1 rounded-lg border border-border bg-white px-3.5 text-[13.5px] text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--violet)]/30"
            />
            <Button
              variant="primary"
              icon={starting === "custom" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Dumbbell className="h-3.5 w-3.5" />}
              disabled={starting !== null || !customObjection.trim()}
              onClick={() => startSession({ key: "custom", objection: customObjection.trim() })}
            >
              {starting === "custom" ? "Préparation…" : "M'entraîner"}
            </Button>
          </div>
        </Card>
      </section>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3">Vos dernières sessions</h2>
          <Card padded={false} className="divide-y divide-slate-100">
            {history.map((s) => {
              const expanded = expandedHistoryId === s.id;
              const score = s.debrief?.global_score ?? null;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setExpandedHistoryId(expanded ? null : s.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/70 transition-colors"
                  >
                    <span className="text-[12px] text-slate-400 tabular-nums shrink-0 w-14">{formatDate(s.created_at)}</span>
                    <span className="flex-1 min-w-0 text-[13px] text-slate-700 truncate">« {s.scenario.objection} »</span>
                    {s.status === "completed" ? (
                      <ScoreChipSmall score={score} />
                    ) : (
                      <span className="text-xs text-slate-400 shrink-0">Interrompue</span>
                    )}
                    {s.debrief && (
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    )}
                  </button>
                  {expanded && s.debrief && (
                    <div className="px-4 pb-4">
                      <DebriefView debrief={s.debrief} />
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      )}
    </main>
  );
}
