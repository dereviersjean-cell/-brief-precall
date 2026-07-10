"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertTriangle } from "lucide-react";

export default function ConnexionsSettingsClient({
  recallConnected,
  hasCalendarWriteAccess,
}: {
  recallConnected: boolean;
  hasCalendarWriteAccess: boolean;
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const recall = searchParams.get("recall");
    if (recall === "connected") {
      setToast({ type: "success", message: "Calendrier connecté avec succès." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
    if (recall === "error") {
      setToast({ type: "error", message: "La connexion au calendrier a échoué, réessayez." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Connexions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Intégrations techniques permettant l&apos;enregistrement automatique de vos appels.
        </p>
      </div>

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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Calendrier Recall</h2>
          <p className="text-sm text-slate-500 mb-4">
            Permet l&apos;enregistrement et l&apos;analyse automatique de vos appels avec des prospects.
          </p>
          {recallConnected ? (
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-emerald-700">Calendrier connecté</span>
              </div>
              <button
                disabled={disconnecting}
                onClick={async () => {
                  if (!window.confirm("Déconnecter le calendrier ? L'enregistrement automatique de vos calls sera désactivé.")) return;
                  setDisconnecting(true);
                  try {
                    await fetch("/api/recall/disconnect", { method: "POST" });
                    router.refresh();
                  } finally {
                    setDisconnecting(false);
                  }
                }}
                className="text-sm text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disconnecting ? "Déconnexion…" : "Déconnecter"}
              </button>
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

      {/* Distinct from "Calendrier Recall" above — this is about the app's
          own Google session (login), not Recall's separate calendar
          connection. Reconnecting here re-runs NextAuth's Google OAuth flow
          so the user grants the newer calendar.events scope (module
          Distribution Flexible sous-étape B) — /api/recall/google-oauth/start
          above wouldn't touch this at all, it's a different credential. */}
      {!hasCalendarWriteAccess && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-6">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-900">
              Reconnectez-vous à Google Calendar pour bénéficier des nouvelles fonctionnalités (écriture de briefs
              dans les événements).
            </p>
            <button
              disabled={reconnecting}
              onClick={async () => {
                setReconnecting(true);
                await signIn("google", { callbackUrl: "/settings/connexions" });
              }}
              className="inline-block mt-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors px-2.5 py-1 rounded-md disabled:opacity-50"
            >
              {reconnecting ? "Redirection…" : "Se reconnecter avec Google"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
