"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgetFetchOnce } from "@/lib/fetch-once";
import { useChromeState } from "./ShellProvider";

export default function ImpersonationBanner() {
  const router = useRouter();
  const [ending, setEnding] = useState(false);
  // Rendu par le serveur (AppShell) ; repli sur /api/chrome sans lui.
  const imp = useChromeState()?.impersonation;
  const targetUserName = imp?.active ? imp.targetUserName ?? "cet utilisateur" : null;

  if (!targetUserName) return null;

  async function handleEnd() {
    setEnding(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
    } finally {
      // Sans ça, le cache continuerait d'annoncer une impersonation qui vient
      // de se terminer, et la bannière rouge réapparaîtrait au montage suivant.
      forgetFetchOnce("/api/chrome");
      router.push("/admin/dashboard");
    }
  }

  return (
    <div className="brief-ui sticky top-0 z-50 w-full bg-rose-600 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[13px] font-medium">
      <span>👤 Connecté en tant que {targetUserName}</span>
      <button
        onClick={handleEnd}
        disabled={ending}
        className="shrink-0 px-3 py-1 rounded-full bg-white/15 text-[12px] font-semibold hover:bg-white/25 transition-colors duration-200 disabled:opacity-50"
      >
        {ending ? "Fin en cours…" : "Terminer l'impersonation"}
      </button>
    </div>
  );
}
