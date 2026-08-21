"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Section CRM de la page Connexions. Vivait dans un onglet séparé
// (/settings/crm, supprimée) jusqu'au 21/08/2026 : tout ce qui se connecte est
// désormais au même endroit. Le composant lit toujours ?crm=… dans l'URL —
// les callbacks OAuth HubSpot et Pipedrive redirigent maintenant vers
// /settings/connexions?crm=…, cf. les routes de callback.
type Props = {
  pipedriveConnected: boolean;
  hubspotConnected: boolean;
};

export default function CrmSection({
  pipedriveConnected: initialPipedriveConnected,
  hubspotConnected: initialHubspotConnected,
}: Props) {
  const [pipedriveConnected, setPipedriveConnected] = useState(initialPipedriveConnected);
  const [pipedriveDisconnecting, setPipedriveDisconnecting] = useState(false);
  const [pipedriveImporting, setPipedriveImporting] = useState(false);
  const [pipedriveImportResult, setPipedriveImportResult] = useState<{ count: number } | { error: string } | null>(null);
  const [hubspotConnected, setHubspotConnected] = useState(initialHubspotConnected);
  const [hubspotDisconnecting, setHubspotDisconnecting] = useState(false);
  const [hubspotImporting, setHubspotImporting] = useState(false);
  const [hubspotImportResult, setHubspotImportResult] = useState<{ count: number } | { error: string } | null>(null);

  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const crm = searchParams.get("crm");
    if (crm === "pipedrive_connected") {
      setPipedriveConnected(true);
      setToast({ type: "success", message: "Pipedrive connecté avec succès." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
    if (crm === "hubspot_connected") {
      setHubspotConnected(true);
      setToast({ type: "success", message: "HubSpot connecté avec succès." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
    if (crm === "error") {
      setToast({ type: "error", message: "La connexion au CRM a échoué, réessayez." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  return (
    <div>
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

      <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)]">
        <div className="px-6 py-5 space-y-5 divide-y divide-slate-100">
          {/* Pipedrive */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[color:var(--violet)] mb-3">Pipedrive</p>
            {pipedriveConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-emerald-700">Pipedrive connecté</span>
                  </div>
                  <button
                    disabled={pipedriveImporting}
                    onClick={async () => {
                      setPipedriveImporting(true);
                      setPipedriveImportResult(null);
                      try {
                        const res = await fetch("/api/crm/pipedrive/import-references", { method: "POST" });
                        const data = await res.json() as { ok?: boolean; count?: number; error?: string };
                        if (!res.ok || !data.ok) {
                          setPipedriveImportResult({ error: data.error ?? "Erreur lors de l'import." });
                        } else {
                          setPipedriveImportResult({ count: data.count ?? 0 });
                        }
                      } catch {
                        setPipedriveImportResult({ error: "Une erreur est survenue." });
                      } finally {
                        setPipedriveImporting(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-5 py-2 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pipedriveImporting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Import en cours…
                      </>
                    ) : "Importer les deals gagnés"}
                  </button>
                  <button
                    disabled={pipedriveDisconnecting}
                    onClick={async () => {
                      if (!window.confirm("Déconnecter Pipedrive ? L'enrichissement CRM sera désactivé.")) return;
                      setPipedriveDisconnecting(true);
                      try {
                        await fetch("/api/crm/pipedrive/disconnect", { method: "POST" });
                        setPipedriveConnected(false);
                        setPipedriveImportResult(null);
                      } finally {
                        setPipedriveDisconnecting(false);
                      }
                    }}
                    className="text-sm text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pipedriveDisconnecting ? "Déconnexion…" : "Déconnecter"}
                  </button>
                </div>
                {pipedriveImportResult && (
                  "error" in pipedriveImportResult ? (
                    <p className="text-sm text-red-600">{pipedriveImportResult.error}</p>
                  ) : (
                    <p className="text-sm text-emerald-600 font-medium">
                      {pipedriveImportResult.count} référence{pipedriveImportResult.count !== 1 ? "s" : ""} importée{pipedriveImportResult.count !== 1 ? "s" : ""} depuis Pipedrive.
                    </p>
                  )
                )}
              </div>
            ) : (
              <a
                href="/api/crm/pipedrive/start"
                className="inline-flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:brightness-110 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 14.5v-9l6 4.5-6 4.5z" fillOpacity=".9"/>
                </svg>
                Connecter Pipedrive
              </a>
            )}
          </div>

          {/* HubSpot */}
          <div className="pt-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[color:var(--violet)] mb-3">HubSpot</p>
            {hubspotConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-emerald-700">HubSpot connecté</span>
                  </div>
                  <button
                    disabled={hubspotImporting}
                    onClick={async () => {
                      setHubspotImporting(true);
                      setHubspotImportResult(null);
                      try {
                        const res = await fetch("/api/crm/hubspot/import-references", { method: "POST" });
                        const data = await res.json() as { ok?: boolean; count?: number; error?: string };
                        if (!res.ok || !data.ok) {
                          setHubspotImportResult({ error: data.error ?? "Erreur lors de l'import." });
                        } else {
                          setHubspotImportResult({ count: data.count ?? 0 });
                        }
                      } catch {
                        setHubspotImportResult({ error: "Une erreur est survenue." });
                      } finally {
                        setHubspotImporting(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-5 py-2 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {hubspotImporting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Import en cours…
                      </>
                    ) : "Importer les deals gagnés"}
                  </button>
                  <button
                    disabled={hubspotDisconnecting}
                    onClick={async () => {
                      if (!window.confirm("Déconnecter HubSpot ? L'enrichissement CRM sera désactivé.")) return;
                      setHubspotDisconnecting(true);
                      try {
                        await fetch("/api/crm/hubspot/disconnect", { method: "POST" });
                        setHubspotConnected(false);
                        setHubspotImportResult(null);
                      } finally {
                        setHubspotDisconnecting(false);
                      }
                    }}
                    className="text-sm text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {hubspotDisconnecting ? "Déconnexion…" : "Déconnecter"}
                  </button>
                </div>
                {hubspotImportResult && (
                  "error" in hubspotImportResult ? (
                    <p className="text-sm text-red-600">{hubspotImportResult.error}</p>
                  ) : (
                    <p className="text-sm text-emerald-600 font-medium">
                      {hubspotImportResult.count} référence{hubspotImportResult.count !== 1 ? "s" : ""} importée{hubspotImportResult.count !== 1 ? "s" : ""} depuis HubSpot.
                    </p>
                  )
                )}
              </div>
            ) : (
              <a
                href="/api/crm/hubspot/start"
                className="inline-flex items-center gap-2 bg-[#ff7a59] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#ff6641] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.164 7.931V5.085a1.747 1.747 0 0 0 1.008-1.573V3.49a1.748 1.748 0 0 0-3.496 0v.022a1.747 1.747 0 0 0 1.008 1.573v2.846a4.966 4.966 0 0 0-2.373 1.041L7.103 4.042a1.943 1.943 0 1 0-.948 1.306l7.013 4.773a4.984 4.984 0 0 0-.67 2.49 4.998 4.998 0 0 0 2.124 4.1l-1.553 2.69a1.647 1.647 0 1 0 1.35.779l1.553-2.69a4.994 4.994 0 1 0 2.192-8.559z" fillOpacity=".9"/>
                </svg>
                Connecter HubSpot
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
