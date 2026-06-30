"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

type Props = {
  initialProductDescription: string;
  initialIcp: string;
  initialCompanyName: string;
  recallConnected: boolean;
};

export default function SettingsClient({
  initialProductDescription,
  initialIcp,
  initialCompanyName,
  recallConnected,
}: Props) {
  const [productDescription, setProductDescription] = useState(initialProductDescription);
  const [icp, setIcp] = useState(initialIcp);
  const [companyName, setCompanyName] = useState(initialCompanyName);

  useEffect(() => {
    setProductDescription(initialProductDescription);
    setIcp(initialIcp);
    setCompanyName(initialCompanyName);
  }, [initialProductDescription, initialIcp, initialCompanyName]);

  const searchParams = useSearchParams();
  const [recallToast, setRecallToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const recall = searchParams.get("recall");
    if (recall === "connected") {
      setRecallToast({ type: "success", message: "Calendrier connecté avec succès." });
      const t = setTimeout(() => setRecallToast(null), 5000);
      return () => clearTimeout(t);
    }
    if (recall === "error") {
      setRecallToast({ type: "error", message: "La connexion au calendrier a échoué, réessayez." });
      const t = setTimeout(() => setRecallToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName || null,
          product_description: productDescription || null,
          icp: icp || null,
        }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

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
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ces informations personnalisent vos briefs pré-call.
        </p>
      </div>

      {recallToast && (
        <div className={`mb-6 rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${
          recallToast.type === "success" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        }`}>
          <p className={`text-sm font-medium ${recallToast.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
            {recallToast.message}
          </p>
          <button
            onClick={() => setRecallToast(null)}
            className={`shrink-0 text-lg leading-none ${recallToast.type === "success" ? "text-emerald-400 hover:text-emerald-600" : "text-red-400 hover:text-red-600"}`}
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {/* Section profil commercial */}
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Profil commercial</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nom commercial
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex : Acme Solutions"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ce que vous vendez
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={3}
                placeholder="Ex : Un logiciel de gestion de devis pour les artisans du bâtiment"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Votre client idéal (ICP)
              </label>
              <input
                type="text"
                value={icp}
                onChange={(e) => setIcp(e.target.value)}
                placeholder="Ex : Directeurs commerciaux de PME de 10 à 50 personnes dans l'industrie"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer bouton */}
        <div className="px-6 py-4 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {saved && !error && (
            <p className="text-sm text-emerald-600 font-medium">Modifications enregistrées.</p>
          )}
          {!error && !saved && <span />}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Section références clients */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mt-6">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Références clients</h2>
          <p className="text-sm text-slate-500 mb-4">
            Importez vos références clients (Excel, Word, PDF) pour que Brief les utilise dans vos briefs.
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
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Importer un nouveau fichier
                </button>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 mt-3">
                <p className="text-sm text-slate-600">
                  💡 Pour de meilleurs résultats, utilisez notre template avec les colonnes : problématique, solution et résultats chiffrés.
                </p>
                <a
                  href="/Template references clients.xlsx"
                  download
                  className="text-sm text-indigo-600 font-medium hover:underline mt-1 inline-block"
                >
                  📥 Télécharger le template
                </a>
              </div>
            </div>
          ) : (
            /* Zone d'upload */
            <>
              <p className="text-sm text-gray-500 mb-1">
                Brief analyse votre fichier et extrait automatiquement les références les plus complètes. Pour de meilleurs résultats, incluez pour chaque client : la problématique, la solution mise en place et les résultats chiffrés.
              </p>
              <a
                href="/Template references clients.xlsx"
                download
                className="inline-block text-sm text-indigo-600 hover:underline mb-4"
              >
                📥 Télécharger le template
              </a>

              {/* File zone — hidden while polling or done */}
              {refStatus !== "polling" && refStatus !== "done" && (
                refFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg mb-4">
                    <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-indigo-700 font-medium flex-1 truncate">{refFile.name}</p>
                    <button
                      type="button"
                      onClick={() => { setRefFile(null); setRefStatus("idle"); setRefError(null); }}
                      className="text-xs text-indigo-400 hover:text-indigo-600"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-slate-500 text-sm mb-4"
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
                    <svg className="w-4 h-4 animate-spin text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24">
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
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Importer un autre fichier
                  </button>
                ) : (
                  <button
                    onClick={handleImport}
                    disabled={!refFile || refStatus === "uploading"}
                    className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Section Calendrier Recall */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mt-6">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Calendrier Recall</h2>
          <p className="text-sm text-slate-500 mb-4">
            Permet l&apos;enregistrement et l&apos;analyse automatique de vos appels avec des prospects.
          </p>
          {recallConnected ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-emerald-700">Calendrier connecté</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href="/api/recall/google-oauth/start"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity=".9"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".9"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#fff" opacity=".9"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
                </svg>
                Connecter Google
              </a>
              <a
                href="/api/recall/microsoft-oauth/start"
                className="inline-flex items-center gap-2 bg-slate-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 0H0v11.4h11.4V0z" fill="#fff" opacity=".9"/>
                  <path d="M24 0H12.6v11.4H24V0z" fill="#fff" opacity=".9"/>
                  <path d="M11.4 12.6H0V24h11.4V12.6z" fill="#fff" opacity=".9"/>
                  <path d="M24 12.6H12.6V24H24V12.6z" fill="#fff" opacity=".9"/>
                </svg>
                Connecter Outlook
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
