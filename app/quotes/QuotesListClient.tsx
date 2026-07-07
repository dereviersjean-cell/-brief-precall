"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuoteListItem } from "@/lib/db";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-100 text-slate-600" },
  sent: { label: "Envoyé", className: "bg-blue-50 text-blue-700" },
  accepted: { label: "Accepté", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Refusé", className: "bg-red-50 text-red-700" },
};

// "Ouvert" isn't a real status value — status stays "sent", viewed_at is a
// separate timestamp — so it's derived here rather than looked up.
function StatusBadge({ status, viewedAt }: { status: string; viewedAt: string | null }) {
  if (status === "sent" && viewedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
        Ouvert
      </span>
    );
  }
  const s = STATUS_STYLES[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function QuotesListClient({ quotes: initialQuotes }: { quotes: QuoteListItem[] }) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function handleSend(quote: QuoteListItem) {
    if (!quote.client_email) {
      alert("Ce devis n'a pas d'email client renseigné.");
      return;
    }
    if (!window.confirm(`Envoyer le devis à ${quote.client_email} ?`)) return;

    setSendingId(quote.id);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de l'envoi.");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSendingId(null);
    }
  }

  async function handleDelete(quote: QuoteListItem) {
    setOpenMenuId(null);
    if (!window.confirm(`Supprimer le devis ${quote.quote_number} ? Cette action est irréversible.`)) return;
    setDeletingId(quote.id);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la suppression.");
      }
      setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 pl-6 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Numéro</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">
              Montant TTC
            </th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
            <th className="py-3 pr-6 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr
              key={quote.id}
              className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                deletingId === quote.id ? "opacity-40" : ""
              }`}
            >
              <td className="py-3 pl-6 pr-4 font-medium text-slate-800">{quote.quote_number}</td>
              <td className="py-3 pr-4">
                <p className="text-slate-700">{quote.client_name}</p>
                {quote.client_email && <p className="text-slate-400 text-xs">{quote.client_email}</p>}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-slate-700">{formatCurrency(quote.total_ttc)}</td>
              <td className="py-3 pr-4">
                <StatusBadge status={quote.status} viewedAt={quote.viewed_at} />
              </td>
              <td className="py-3 pr-4 text-slate-500">{formatDate(quote.issued_at ?? quote.created_at)}</td>
              <td className="py-3 pr-6 text-right relative">
                <div className="flex items-center justify-end gap-3">
                  {quote.status === "draft" && (
                    <button
                      onClick={() => handleSend(quote)}
                      disabled={sendingId === quote.id}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      {sendingId === quote.id ? "Envoi…" : "📤 Envoyer"}
                    </button>
                  )}
                  <button
                    onClick={() => setOpenMenuId(openMenuId === quote.id ? null : quote.id)}
                    className="text-slate-400 hover:text-slate-700 px-2 py-1"
                  >
                    ⋯
                  </button>
                </div>
                {openMenuId === quote.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-6 top-10 z-20 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-left">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setOpenMenuId(null)}
                      >
                        {quote.status === "draft" ? "Modifier" : "Voir"}
                      </Link>
                      <a
                        href={`/api/quotes/${quote.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setOpenMenuId(null)}
                      >
                        Télécharger PDF
                      </a>
                      {quote.status === "draft" && (
                        <button
                          onClick={() => handleDelete(quote)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
