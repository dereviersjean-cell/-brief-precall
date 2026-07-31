"use client";

import { useRef, useState } from "react";
import { ChevronDown, FileText, PlayCircle } from "lucide-react";
import type { ObjectionOccurrence } from "@/lib/db";

// Restitution d'une occurrence, du plus lisible au plus brut :
//   1. des puces courtes — ce que le manager parcourt en diagonale ;
//   2. le verbatim exact, replié, pour vérifier ce qui a réellement été dit ;
//   3. l'extrait vidéo, replié aussi, pour entendre le ton.
// L'ordre compte : en réunion de coaching on lit les puces, et on ne déplie
// que sur le cas qu'on veut travailler.

function formatTimecode(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function Bullets({ label, bullets, fallback }: { label: string; bullets: string[]; fallback: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {bullets.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-slate-800">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              {bullet}
            </li>
          ))}
        </ul>
      ) : (
        // Objection analysée avant la migration 009 : pas de puces, on retombe
        // sur le résumé plutôt que d'afficher un bloc vide.
        <p className="mt-1 text-[13.5px] leading-relaxed text-slate-700">{fallback}</p>
      )}
    </div>
  );
}

export default function OccurrenceDetail({ occurrence }: { occurrence: ObjectionOccurrence }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVerbatim = !!(occurrence.prospectVerbatim || occurrence.commercialVerbatim);
  // Trois conditions pour proposer la vidéo : un enregistrement existe, et on
  // sait où se placer dedans.
  const canPlayVideo = !!occurrence.recallBotId && occurrence.startMs !== null;

  async function openVideo() {
    setShowVideo(true);
    if (videoUrl || loadingVideo) return;
    setLoadingVideo(true);
    setVideoError(null);
    try {
      // L'URL est signée et expire en quelques heures : elle se demande à
      // chaque fois, elle n'est jamais stockée (règle projet).
      const res = await fetch(`/api/recall/video-url?callId=${occurrence.callId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Vidéo indisponible.");
      setVideoUrl((data as { url: string }).url);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Vidéo indisponible.");
    } finally {
      setLoadingVideo(false);
    }
  }

  // Démarre quelques secondes avant l'objection : tomber pile dessus prive du
  // contexte qui l'a amenée, et c'est ce contexte qui rend le coaching utile.
  const seekSeconds = Math.max(0, ((occurrence.startMs ?? 0) - 5000) / 1000);

  return (
    <div className="mt-4 space-y-3">
      <Bullets
        label="Ce que le prospect a dit"
        bullets={occurrence.prospectBullets}
        fallback={occurrence.objection}
      />
      <Bullets
        label="Ce que le commercial a répondu"
        bullets={occurrence.commercialBullets}
        fallback={occurrence.response}
      />

      {occurrence.suggestedResponse && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Ce qu&apos;il aurait fallu répondre
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-emerald-900">{occurrence.suggestedResponse}</p>
        </div>
      )}

      {occurrence.handlingComment && (
        <div className="rounded-lg bg-slate-50 px-3.5 py-2.5">
          <p className="text-[13px] text-slate-600">{occurrence.handlingComment}</p>
          {!occurrence.evaluatedAgainstPlaybook && (
            <p className="mt-1.5 text-xs italic text-slate-400">
              Appréciation générale — aucune méthode définie pour cette objection au moment de l&apos;analyse.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {hasVerbatim && (
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <FileText className="h-3.5 w-3.5" />
            {showTranscript ? "Masquer le passage" : "Voir le passage exact"}
            <ChevronDown className={`h-3 w-3 transition-transform ${showTranscript ? "rotate-180" : ""}`} />
          </button>
        )}
        {canPlayVideo && (
          <button
            type="button"
            onClick={() => (showVideo ? setShowVideo(false) : openVideo())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {showVideo ? "Masquer l'extrait" : "Voir l'extrait vidéo"}
            {occurrence.startMs !== null && (
              <span className="font-mono text-[11px] text-slate-400">{formatTimecode(occurrence.startMs)}</span>
            )}
          </button>
        )}
      </div>

      {showTranscript && (
        <div className="space-y-2.5 rounded-xl border border-border bg-slate-50 px-4 py-3">
          {occurrence.prospectVerbatim && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Prospect</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-700">«&nbsp;{occurrence.prospectVerbatim}&nbsp;»</p>
            </div>
          )}
          {occurrence.commercialVerbatim && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Commercial</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-700">
                «&nbsp;{occurrence.commercialVerbatim}&nbsp;»
              </p>
            </div>
          )}
        </div>
      )}

      {showVideo && (
        <div className="rounded-xl border border-border bg-slate-900 p-2">
          {loadingVideo && <p className="px-2 py-6 text-center text-[13px] text-slate-300">Chargement de la vidéo…</p>}
          {videoError && <p className="px-2 py-6 text-center text-[13px] text-rose-300">{videoError}</p>}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-lg"
              // Le positionnement se fait ici et non via un fragment #t= :
              // l'URL est signée, y ajouter un fragment casse certaines
              // implémentations de lecteur.
              onLoadedMetadata={() => {
                if (videoRef.current) videoRef.current.currentTime = seekSeconds;
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
