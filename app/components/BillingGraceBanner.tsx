"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useChromeState } from "./ShellProvider";

function hoursUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (60 * 60 * 1000)));
}

export default function BillingGraceBanner() {
  // Rendu par le serveur (AppShell) ; repli sur /api/chrome sans lui.
  const chrome = useChromeState();
  const graceEndsAt = chrome?.billingStatus === "grace_period" ? chrome.graceEndsAt : null;

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
