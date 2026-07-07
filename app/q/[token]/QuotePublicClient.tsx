"use client";

import { useState } from "react";
import type { QuoteWithLines } from "@/lib/db";
import { computeLineTotals, computeQuoteTotals } from "@/lib/quote-calc";

type CompanySnapshot = {
  company_name?: string | null;
  company_logo_url?: string | null;
  company_address?: string | null;
  company_email?: string | null;
  company_phone?: string | null;
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function QuotePublicClient({ token, quote: initialQuote }: { token: string; quote: QuoteWithLines }) {
  const [quote, setQuote] = useState(initialQuote);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const company = (quote.company_snapshot ?? {}) as CompanySnapshot;
  const totals = computeQuoteTotals(quote.lines);
  const isFinal = quote.status === "accepted" || quote.status === "rejected";

  async function handleAccept() {
    if (!window.confirm("Confirmer l'acceptation de ce devis ?")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/quotes/${token}/accept`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Une erreur est survenue.");
      }
      setQuote((q) => ({ ...q, status: "accepted", accepted_at: new Date().toISOString() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/quotes/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Une erreur est survenue.");
      }
      setQuote((q) => ({
        ...q,
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason.trim() || null,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
            <div>
              {company.company_logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.company_logo_url}
                  alt={company.company_name ?? "Logo"}
                  className="h-12 object-contain mb-2"
                />
              )}
              <p className="font-semibold text-slate-900">{company.company_name}</p>
              {company.company_address && <p className="text-xs text-slate-500">{company.company_address}</p>}
              {company.company_email && <p className="text-xs text-slate-500">{company.company_email}</p>}
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-slate-900">Devis {quote.quote_number}</h1>
              <p className="text-sm text-slate-500">Émis le {formatDate(quote.issued_at)}</p>
              {quote.valid_until && (
                <p className="text-sm text-slate-500">Valable jusqu&apos;au {formatDate(quote.valid_until)}</p>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Adressé à</p>
            <p className="font-medium text-slate-900">{quote.client_name}</p>
            {quote.client_address && <p className="text-sm text-slate-500">{quote.client_address}</p>}
            {quote.client_email && <p className="text-sm text-slate-500">{quote.client_email}</p>}
          </div>

          {/* Lines */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Désignation</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase text-right">Qté</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase text-right">PU HT</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((line) => {
                  const computed = computeLineTotals(line);
                  return (
                    <tr key={line.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="text-slate-800">{line.name}</p>
                        {line.description && <p className="text-xs text-slate-400">{line.description}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {line.quantity} {line.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(line.unit_price)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                        {formatCurrency(computed.net_ht)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="max-w-xs ml-auto space-y-1.5 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Sous-total HT</span>
              <span className="text-slate-800">{formatCurrency(totals.subtotal_ht)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Remises</span>
                <span className="text-slate-800">-{formatCurrency(totals.total_discount)}</span>
              </div>
            )}
            {totals.vat_breakdown.map((v) => (
              <div className="flex justify-between text-sm" key={v.rate}>
                <span className="text-slate-500">TVA {v.rate}%</span>
                <span className="text-slate-800">{formatCurrency(v.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-semibold pt-2 mt-1 border-t border-slate-200">
              <span>Total TTC</span>
              <span>{formatCurrency(totals.total_ttc)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {isFinal ? (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                quote.status === "accepted"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {quote.status === "accepted"
                ? `Accepté le ${formatDate(quote.accepted_at)}`
                : `Refusé le ${formatDate(quote.rejected_at)}${
                    quote.rejection_reason ? ` — ${quote.rejection_reason}` : ""
                  }`}
            </div>
          ) : (
            <>
              {showRejectForm && (
                <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Motif (optionnel)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`/api/public/quotes/${token}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Télécharger le PDF
                </a>
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  Accepter le devis
                </button>
                {showRejectForm ? (
                  <button
                    onClick={handleReject}
                    disabled={submitting}
                    className="px-5 py-2.5 bg-slate-600 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Confirmer le refus
                  </button>
                ) : (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Refuser
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
