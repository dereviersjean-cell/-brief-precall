"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { fetchJsonOnce } from "@/lib/fetch-once";
import type { ChromeState } from "@/lib/chrome-state";

function hoursUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (60 * 60 * 1000)));
}

export default function BillingGraceBanner() {
  const [graceEndsAt, setGraceEndsAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Une fois par chargement de page : ce composant est remonté à chaque
    // changement de section, et le statut de facturation n'en dépend pas.
    fetchJsonOnce<ChromeState>("/api/chrome").then((data) => {
      if (cancelled) return;
      setGraceEndsAt(data?.billingStatus === "grace_period" ? data.graceEndsAt : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!graceEndsAt) return null;

  return (
    <div className="brief-ui sticky top-0 z-40 w-full border-b border-amber-200 bg-[color:var(--warning-soft)] text-amber-900 px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[13px] font-medium">
      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
      <span>
        Le dernier paiement a échoué — accès suspendu dans {hoursUntil(graceEndsAt)}h
      </span>
      <Link
        href="/settings/billing"
        className="shrink-0 px-3 py-1 rounded-full border border-amber-200 bg-white text-[12px] font-semibold text-amber-800 hover:border-amber-300 hover:text-amber-900 transition-colors duration-200"
      >
        Régulariser
      </Link>
    </div>
  );
}
