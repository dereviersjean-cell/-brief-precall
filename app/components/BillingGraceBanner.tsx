"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

function hoursUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (60 * 60 * 1000)));
}

export default function BillingGraceBanner() {
  const [graceEndsAt, setGraceEndsAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/billing/status")
      .then((res) => (res.ok ? res.json() : { status: "none", graceEndsAt: null }))
      .then((data: { status: string; graceEndsAt: string | null }) => {
        if (!cancelled) setGraceEndsAt(data.status === "grace_period" ? data.graceEndsAt : null);
      })
      .catch(() => {
        if (!cancelled) setGraceEndsAt(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!graceEndsAt) return null;

  return (
    <div className="brief-ui sticky top-0 z-40 w-full bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-sm">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        Le dernier paiement a échoué — accès suspendu dans {hoursUntil(graceEndsAt)}h
      </span>
      <Link
        href="/settings/billing"
        className="shrink-0 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors duration-200"
      >
        Régulariser
      </Link>
    </div>
  );
}
