"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJsonOnce, forgetFetchOnce } from "@/lib/fetch-once";

export default function ImpersonationBanner() {
  const router = useRouter();
  const [targetUserName, setTargetUserName] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Une fois par chargement de page : remonté à chaque changement de
    // section, alors qu'une impersonation ne démarre ni ne s'arrête au fil
    // d'une navigation. `forgetFetchOnce` est appelé à la sortie ci-dessous.
    fetchJsonOnce<{ active: boolean; targetUserName?: string }>("/api/impersonation-status").then((data) => {
      if (cancelled) return;
      setTargetUserName(data?.active ? data.targetUserName ?? "cet utilisateur" : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!targetUserName) return null;

  async function handleEnd() {
    setEnding(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
    } finally {
      // Sans ça, le cache continuerait d'annoncer une impersonation qui vient
      // de se terminer, et la bannière rouge réapparaîtrait au montage suivant.
      forgetFetchOnce("/api/impersonation-status");
      router.push("/admin/dashboard");
    }
  }

  return (
    <div className="brief-ui sticky top-0 z-50 w-full bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium shadow-sm">
      <span>👤 Connecté en tant que {targetUserName}</span>
      <button
        onClick={handleEnd}
        disabled={ending}
        className="shrink-0 px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 transition-colors duration-200 disabled:opacity-50"
      >
        {ending ? "Fin en cours…" : "Terminer l'impersonation"}
      </button>
    </div>
  );
}
