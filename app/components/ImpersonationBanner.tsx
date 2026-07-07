"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ImpersonationBanner() {
  const router = useRouter();
  const [targetUserName, setTargetUserName] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/impersonation-status")
      .then((res) => (res.ok ? res.json() : { active: false }))
      .then((data: { active: boolean; targetUserName?: string }) => {
        if (!cancelled) setTargetUserName(data.active ? data.targetUserName ?? "cet utilisateur" : null);
      })
      .catch(() => {
        if (!cancelled) setTargetUserName(null);
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
      router.push("/admin/dashboard");
    }
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium shadow-md">
      <span>👤 Connecté en tant que {targetUserName}</span>
      <button
        onClick={handleEnd}
        disabled={ending}
        className="shrink-0 px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 transition-colors disabled:opacity-50"
      >
        {ending ? "Fin en cours…" : "Terminer l'impersonation"}
      </button>
    </div>
  );
}
