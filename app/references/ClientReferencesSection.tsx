"use client";

import { useState, useEffect, useRef } from "react";
import ClientReferencesTable from "./ClientReferencesTable";

// Own settings page (/settings/references) — client references power
// CRM-style enrichment (matched against briefs the same way Pipedrive/HubSpot
// data is), so it's a peer of the CRM connections page, not a sub-section of
// it or of the commercial profile form.
export default function ClientReferencesSection() {
  // Bumped after a successful file import so ClientReferencesTable refetches.
  // Pipedrive/HubSpot imports live in the CRM section of /settings/connexions — no
  // shared state needed there, since navigating here always fetches fresh.
  const [tableVersion, setTableVersion] = useState(0);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refStatus, setRefStatus] = useState<"idle" | "uploading" | "polling" | "done" | "error">("idle");
  const [refProcessedCount, setRefProcessedCount] = useState(0);
  const [refChunksDone, setRefChunksDone] = useState(0);
  const [refChunksTotal, setRefChunksTotal] = useState(0);
  const [refError, setRefError] = useState<string | null>(null);
  const [existingRefCount, setExistingRefCount] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/import-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ref_count?: number } | null) => {
        setExistingRefCount(data?.ref_count ?? 0);
      })
      .catch(() => setExistingRefCount(0));
  }, []);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  useEffect(() => {
    if (refStatus !== "polling") return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/import-status");
        if (!res.ok) return;
        const data = await res.json() as {
          status: string | null;
          processed: number;
          chunks_total: number;
          chunks_done: number;
          ref_count: number;
        };
        setRefChunksDone(data.chunks_done ?? 0);
        setRefChunksTotal(data.chunks_total ?? 0);
        if (data.status === "done") {
          setRefProcessedCount(data.processed);
          setExistingRefCount(data.ref_count ?? 0);
          setShowUpload(false);
          setRefStatus("done");
          setTableVersion((v) => v + 1);
          stopPolling();
        } else if (data.status === "error") {
          setRefError("Erreur lors du traitement des références.");
          setRefStatus("error");
          stopPolling();
        }
      } catch {
        // ignore transient polling errors
      }
    }, 3000);

    return stopPolling;
  }, [refStatus]);

  async function handleImport() {
    if (!refFile) return;
    setRefStatus("uploading");
    setRefError(null);
    setRefProcessedCount(0);
    setRefChunksDone(0);
    setRefChunksTotal(0);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(refFile);
      });
      const res = await fetch("/api/onboarding/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, fileType: refFile.type, source: "upload" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error ?? "Erreur serveur");
      }
      setRefFile(null);
      setRefStatus("polling");
    } catch (err) {
      setRefError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setRefStatus("error");
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-white">
        <div className="px-5 py-5 sm:px-6">
          <h2 className="mb-1 text-[14px] font-semibold text-slate-900">Base de données commerciale</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-slate-500">
            Importées depuis un fichier ou un CRM connecté — Brief s&apos;en sert pour enrichir vos briefs avec des
            cas clients similaires.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              setRefFile(e.target.files?.[0] ?? null);
              setRefStatus("idle");
              setRefError(null);
            }}
          />

          {existingRefCount !== null && existingRefCount > 0 && refStatus === "idle" && !showUpload ? (
            /* Résumé — des références existent déjà */
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--success-soft)]">
                    <svg className="h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[13.5px] text-slate-700">
                    <span className="font-semibold tabular-nums text-slate-900">{existingRefCount}</span>{" "}
                    référence{existingRefCount !== 1 ? "s" : ""} client{existingRefCount !== 1 ? "s" : ""} importée{existingRefCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="text-[13px] font-medium text-[color:var(--violet)] hover:underline"
                >
                  Importer un nouveau fichier
                </button>
              </div>
              <div className="mt-3 rounded-xl bg-[color:var(--lavender)] px-4 py-3">
                <p className="text-[13px] leading-relaxed text-slate-600">
                  💡 Pour de meilleurs résultats, utilisez notre template avec les colonnes : problématique, solution et résultats chiffrés.
                </p>
                <a
                  href="/Template references clients.xlsx"
                  download
                  className="mt-1 inline-block text-[13px] font-medium text-[color:var(--violet)] hover:underline"
                >
                  📥 Télécharger le template
                </a>
              </div>
            </div>
          ) : (
            /* Zone d'upload */
            <>
              <p className="mb-1 text-[13px] leading-relaxed text-slate-500">
                Brief analyse votre fichier et extrait automatiquement les références les plus complètes. Pour de meilleurs résultats, incluez pour chaque client : la problématique, la solution mise en place et les résultats chiffrés.
              </p>
              <a
                href="/Template references clients.xlsx"
                download
                className="mb-4 inline-block text-[13px] font-medium text-[color:var(--violet)] hover:underline"
              >
                📥 Télécharger le template
              </a>

              {/* File zone — hidden while polling or done */}
              {refStatus !== "polling" && refStatus !== "done" && (
                refFile ? (
                  <div className="mb-4 flex items-center gap-3 rounded-xl bg-[color:var(--lavender)] px-4 py-3">
                    <svg className="w-4 h-4 text-[color:var(--violet)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[color:var(--violet)]">{refFile.name}</p>
                    <button
                      type="button"
                      onClick={() => { setRefFile(null); setRefStatus("idle"); setRefError(null); }}
                      className="text-[12px] font-medium text-[color:var(--violet)] hover:underline"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-4 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-[13px] font-medium text-slate-500 transition-colors hover:border-[color:var(--violet)] hover:text-[color:var(--violet)]"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Cliquez pour sélectionner un fichier
                  </button>
                )
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {refStatus === "done" && (
                    <p className="text-[13px] font-medium text-emerald-700">
                      {refProcessedCount} référence{refProcessedCount !== 1 ? "s" : ""} importée{refProcessedCount !== 1 ? "s" : ""} avec succès.
                    </p>
                  )}
                  {refError && (
                    <p className="text-[13px] text-rose-700">{refError}</p>
                  )}
                </div>

                {refStatus === "polling" ? (
                  <div className="flex items-center gap-2 py-2 text-[13px] text-slate-500 tabular-nums">
                    <svg className="w-4 h-4 animate-spin text-[color:var(--violet)] shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {refChunksTotal > 0
                      ? `Import en cours… ${refChunksDone}/${refChunksTotal} chunks traités (${Math.round((refChunksDone / refChunksTotal) * 100)}%)`
                      : "Import en cours…"}
                  </div>
                ) : refStatus === "done" ? (
                  <button
                    type="button"
                    onClick={() => { setRefStatus("idle"); setRefProcessedCount(0); }}
                    className="text-[13px] font-medium text-[color:var(--violet)] hover:underline"
                  >
                    Importer un autre fichier
                  </button>
                ) : (
                  <button
                    onClick={handleImport}
                    disabled={!refFile || refStatus === "uploading"}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refStatus === "uploading" ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Envoi en cours…
                      </>
                    ) : "Importer"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ClientReferencesTable version={tableVersion} />
    </div>
  );
}
