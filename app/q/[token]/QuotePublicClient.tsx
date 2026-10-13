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
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-8">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div className="min-w-0">
              {company.company_logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.company_logo_url}
                  alt={company.company_name ?? "Logo"}
                  className="mb-3 h-12 object-contain"
                />
              )}
              <p className="text-[14px] font-semibold text-slate-900">{company.company_name}</p>
              {company.company_address && <p className="mt-0.5 text-[12.5px] text-slate-500">{company.company_address}</p>}
              {company.company_email && <p className="text-[12.5px] text-slate-500">{company.company_email}</p>}
            </div>
            <div className="sm:text-right">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">
                Devis <span className="tabular-nums">{quote.quote_number}</span>
              </h1>
              <p className="mt-1 text-[13px] tabular-nums text-slate-500">Émis le {formatDate(quote.issued_at)}</p>
              {quote.valid_until && (
                <p className="text-[13px] tabular-nums text-slate-500">Valable jusqu&apos;au {formatDate(quote.valid_until)}</p>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="mb-6">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Adressé à</p>
            <p className="text-[14px] font-semibold text-slate-900">{quote.client_name}</p>
            {quote.client_address && <p className="text-[13px] text-slate-500">{quote.client_address}</p>}
            {quote.client_email && <p className="text-[13px] text-slate-500">{quote.client_email}</p>}
          </div>

          {/* Lines */}
          <div className="mb-6 overflow-hidden overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Désignation</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Qté</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">PU HT</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((line) => {
                  const computed = computeLineTotals(line);
                  return (
                    <tr key={line.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{line.name}</p>
                        {line.description && <p className="mt-0.5 text-[12px] text-slate-500">{line.description}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                        {line.quantity} {line.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">{formatCurrency(line.unit_price)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatCurrency(computed.net_ht)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mb-8 ml-auto max-w-xs space-y-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-500">Sous-total HT</span>
              <span className="tabular-nums text-slate-900">{formatCurrency(totals.subtotal_ht)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">Remises</span>
                <span className="tabular-nums text-slate-900">-{formatCurrency(totals.total_discount)}</span>
              </div>
            )}
            {totals.vat_breakdown.map((v) => (
              <div className="flex justify-between text-[13px]" key={v.rate}>
                <span className="text-slate-500">TVA {v.rate}%</span>
                <span className="tabular-nums text-slate-900">{formatCurrency(v.amount)}</span>
              </div>
            ))}
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2.5 text-slate-900">
              <span className="text-[14px] font-semibold">Total TTC</span>
              <span className="text-[20px] font-semibold tracking-tight tabular-nums">{formatCurrency(totals.total_ttc)}</span>
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>
          )}

          {isFinal ? (
            <div
              className={`rounded-xl px-4 py-3 text-[13.5px] font-semibold ${
                quote.status === "accepted"
                  ? "bg-[color:var(--success-soft)] text-emerald-700"
                  : "bg-[color:var(--danger-soft)] text-rose-700"
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
                <div className="mb-4 rounded-xl bg-slate-50 p-4">
                  <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Motif (optionnel)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`/api/public/quotes/${token}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-[13.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Télécharger le PDF
                </a>
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="inline-flex h-10 items-center rounded-lg bg-[color:var(--primary)] px-4 text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Accepter le devis
                </button>
                {showRejectForm ? (
                  <button
                    onClick={handleReject}
                    disabled={submitting}
                    className="inline-flex h-10 items-center rounded-lg border border-[color:var(--danger-soft)] bg-white px-4 text-[13.5px] font-semibold text-rose-700 transition-colors hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Confirmer le refus
                  </button>
                ) : (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="inline-flex h-10 items-center rounded-lg px-4 text-[13.5px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
