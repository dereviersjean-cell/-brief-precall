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
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Base de données commerciale</h2>
          <p className="text-sm text-slate-500 mb-4">
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
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{existingRefCount}</span>{" "}
                    référence{existingRefCount !== 1 ? "s" : ""} client{existingRefCount !== 1 ? "s" : ""} importée{existingRefCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="text-sm text-[color:var(--violet)] hover:text-[color:var(--violet)] font-medium"
                >
                  Importer un nouveau fichier
                </button>
              </div>
              <div className="bg-[color:var(--lavender)] rounded-lg p-3 mt-3">
                <p className="text-sm text-slate-600">
                  💡 Pour de meilleurs résultats, utilisez notre template avec les colonnes : problématique, solution et résultats chiffrés.
                </p>
                <a
                  href="/Template references clients.xlsx"
                  download
                  className="text-sm text-[color:var(--violet)] font-medium hover:underline mt-1 inline-block"
                >
                  📥 Télécharger le template
                </a>
              </div>
            </div>
          ) : (
            /* Zone d'upload */
            <>
              <p className="text-sm text-slate-500 mb-1">
                Brief analyse votre fichier et extrait automatiquement les références les plus complètes. Pour de meilleurs résultats, incluez pour chaque client : la problématique, la solution mise en place et les résultats chiffrés.
              </p>
              <a
                href="/Template references clients.xlsx"
                download
                className="inline-block text-sm text-[color:var(--violet)] hover:underline mb-4"
              >
                📥 Télécharger le template
              </a>

              {/* File zone — hidden while polling or done */}
              {refStatus !== "polling" && refStatus !== "done" && (
                refFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[color:var(--lavender)] border border-[color:var(--lavender-strong)] rounded-lg mb-4">
                    <svg className="w-4 h-4 text-[color:var(--violet)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-[color:var(--violet)] font-medium flex-1 truncate">{refFile.name}</p>
                    <button
                      type="button"
                      onClick={() => { setRefFile(null); setRefStatus("idle"); setRefError(null); }}
                      className="text-xs text-[color:var(--violet)] hover:text-[color:var(--violet)]"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-border rounded-xl hover:border-[color:var(--lavender-strong)] hover:bg-[color:var(--lavender)] transition-all text-slate-500 text-sm mb-4"
                  >
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Cliquez pour sélectionner un fichier
                  </button>
                )
              )}

              <div className="flex items-center justify-between">
                <div>
                  {refStatus === "done" && (
                    <p className="text-sm text-emerald-600 font-medium">
                      {refProcessedCount} référence{refProcessedCount !== 1 ? "s" : ""} importée{refProcessedCount !== 1 ? "s" : ""} avec succès.
                    </p>
                  )}
                  {refError && (
                    <p className="text-sm text-red-600">{refError}</p>
                  )}
                </div>

                {refStatus === "polling" ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2.5">
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
                    className="text-sm text-[color:var(--violet)] hover:text-[color:var(--violet)] font-medium"
                  >
                    Importer un autre fichier
                  </button>
                ) : (
                  <button
                    onClick={handleImport}
                    disabled={!refFile || refStatus === "uploading"}
                    className="flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
