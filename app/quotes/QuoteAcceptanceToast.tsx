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
    <div className="brief-ui fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((n) => (
        <div
          key={n.quote_id}
          className="bg-white border border-emerald-200 shadow-lg rounded-2xl px-4 py-3 flex items-start gap-3"
        >
          <p className="text-sm text-slate-700 flex-1">
            🎉 <span className="font-semibold">{n.client_name}</span> a accepté votre devis{" "}
            <span className="font-semibold">{n.quote_number}</span> ({formatCurrency(n.total_ttc)})
          </p>
          <button
            onClick={() => handleClose(n.quote_id)}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors duration-200"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
