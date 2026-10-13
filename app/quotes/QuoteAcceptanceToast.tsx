"use client";

import { useEffect, useState } from "react";
import type { PendingAcceptanceNotification } from "@/lib/db";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export default function QuoteAcceptanceToast() {
  const [notifications, setNotifications] = useState<PendingAcceptanceNotification[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/quotes/pending-notifications")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PendingAcceptanceNotification[]) => {
        if (!cancelled) setNotifications(data);
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleClose(quoteId: string) {
    setNotifications((prev) => prev.filter((n) => n.quote_id !== quoteId));
    fetch(`/api/quotes/${quoteId}/mark-notified`, { method: "POST" }).catch(() => {
      // Non-blocking — worst case it re-appears on the next page load.
    });
  }

  if (notifications.length === 0) return null;

  return (
    <div className="brief-ui fixed top-4 right-4 left-4 z-50 flex flex-col gap-2 sm:left-auto sm:max-w-sm">
      {notifications.map((n) => (
        <div
          key={n.quote_id}
          className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-[var(--shadow-md)]"
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--success)]" aria-hidden />
          <p className="flex-1 text-[13px] leading-relaxed text-slate-700">
            🎉 <span className="font-semibold text-slate-900">{n.client_name}</span> a accepté votre devis{" "}
            <span className="font-semibold text-slate-900">{n.quote_number}</span> (<span className="tabular-nums">{formatCurrency(n.total_ttc)}</span>)
          </p>
          <button
            onClick={() => handleClose(n.quote_id)}
            className="shrink-0 rounded-md px-1 text-[16px] leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
