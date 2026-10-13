"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Settings,
  Plus,
  Send,
  MoreHorizontal,
  Pencil,
  Download,
  Trash2,
  FileText,
  Euro,
  TrendingUp,
} from "lucide-react";
import type { QuoteListItem } from "@/lib/db";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";
import SendQuoteModal from "./SendQuoteModal";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-100 text-slate-600" },
  sent: { label: "Envoyé", className: "bg-[color:var(--lavender)] text-[color:var(--violet)]" },
  accepted: { label: "Accepté", className: "bg-[color:var(--success-soft)] text-emerald-700" },
  rejected: { label: "Refusé", className: "bg-[color:var(--danger-soft)] text-rose-700" },
};

// "Ouvert" isn't a real status value — status stays "sent", viewed_at is a
// separate timestamp — so it's derived here rather than looked up.
function StatusBadge({ status, viewedAt }: { status: string; viewedAt: string | null }) {
  if (status === "sent" && viewedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)]">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--warning)]" />
        Ouvert
      </span>
    );
  }
  const s = STATUS_STYLES[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${s.className}`}>
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

// Same card chrome/entrance as StatTile, but for a currency total — a plain
// formatted string rather than a number, so it can't reuse StatTile's
// AnimatedNumber (which just does toFixed, no thousands separator or € sign).
function AmountTile({ label, amount, index }: { label: string; amount: number; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-2xl border border-border p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.07em]">{label}</p>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[color:var(--warning-soft)] text-amber-700">
          <Euro className="w-3.5 h-3.5" />
        </span>
      </div>
      <p className="text-[26px] lg:text-[30px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">{formatCurrency(amount)}</p>
    </motion.div>
  );
}

type SortKey = "number" | "contact" | "amount" | "date";
type SortDirection = "asc" | "desc";

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDirection: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentSort === sortKey;
  return (
    <th className={`px-4 py-2.5 text-${align === "right" ? "right" : "left"}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.07em] transition-colors ${
          active ? "text-[color:var(--violet)]" : "text-slate-500 hover:text-slate-900"
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        {active &&
          (currentDirection === "asc" ? (
            <ChevronUp className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ))}
      </button>
    </th>
  );
}

export default function QuotesListClient({
  quotes: initialQuotes,
  missingCompanyInfo,
}: {
  quotes: QuoteListItem[];
  missingCompanyInfo: boolean;
}) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendModalQuote, setSendModalQuote] = useState<QuoteListItem | null>(null);

  function handleSend(quote: QuoteListItem) {
    if (!quote.client_email) {
      alert("Ce devis n'a pas d'email client renseigné.");
      return;
    }
    setSendModalQuote(quote);
  }

  function handleSent() {
    setSendModalQuote(null);
    router.refresh();
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

  const filteredQuotes = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matching = trimmed
      ? quotes.filter(
          (q) =>
            q.quote_number.toLowerCase().includes(trimmed) ||
            q.client_name.toLowerCase().includes(trimmed) ||
            (q.client_email ?? "").toLowerCase().includes(trimmed)
        )
      : quotes;

    const sorted = [...matching].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "number":
          cmp = a.quote_number.localeCompare(b.quote_number);
          break;
        case "contact":
          cmp = a.client_name.localeCompare(b.client_name);
          break;
        case "amount":
          cmp = a.total_ttc - b.total_ttc;
          break;
        case "date":
          cmp = (a.issued_at ?? a.created_at).localeCompare(b.issued_at ?? b.created_at);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [quotes, query, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "date" || key === "amount" ? "desc" : "asc");
    }
  }

  const totalAmount = quotes.reduce((n, q) => n + q.total_ttc, 0);
  const decidedCount = quotes.filter((q) => q.status === "accepted" || q.status === "rejected").length;
  const acceptedCount = quotes.filter((q) => q.status === "accepted").length;
  const acceptanceRate = decidedCount > 0 ? Math.round((acceptedCount / decidedCount) * 100) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* En-tête */}
      <FadeIn>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">
              <FileText className="h-3.5 w-3.5" />
              Devis commerciaux
            </span>
            <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">Devis</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
              {quotes.length} {quotes.length === 1 ? "devis créé" : "devis créés"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">
            <Link
              href="/quotes/settings"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </Link>
            <Link
              href="/quotes/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110"
            >
              <Plus className="w-4 h-4" />
              Nouveau devis
            </Link>
          </div>
        </div>
      </FadeIn>

      {missingCompanyInfo && (
        <div className="mb-6 rounded-2xl bg-[color:var(--warning-soft)] px-4 py-3">
          <p className="text-[13px] font-medium text-amber-800">
            Configurez d&apos;abord la raison sociale de votre entreprise dans les paramètres avant de créer un devis.
          </p>
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--lavender)]">
            <svg className="w-6 h-6 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-slate-900">Aucun devis pour l&apos;instant</p>
          <p className="mt-1 text-[13px] text-slate-500">Configurez d&apos;abord vos paramètres, puis créez votre premier devis.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatTile index={0} accent="indigo" label="Devis émis" value={quotes.length} icon={<FileText className="w-3.5 h-3.5" />} />
            <AmountTile index={1} label="Montant total TTC" amount={totalAmount} />
            <StatTile
              index={2}
              accent="emerald"
              label="Taux d'acceptation"
              value={acceptanceRate}
              suffix={acceptanceRate !== null ? "%" : undefined}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Search */}
          <div className="relative mb-4 w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un devis, un contact…"
              className="h-9 w-full rounded-xl border border-border bg-white pl-9 pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)]"
            />
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
              <p className="text-[13px] text-slate-500">Aucun résultat pour « {query} ».</p>
            </div>
          ) : (
            <FadeIn delay={0.1}>
              <div className="overflow-hidden rounded-2xl border border-border bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border-collapse stacked-table sm:min-w-[820px]">
                    <thead>
                      <tr className="border-b border-border">
                        <SortHeader label="Numéro" sortKey="number" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                        <SortHeader label="Contact" sortKey="contact" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                        <SortHeader label="Montant TTC" sortKey="amount" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} align="right" />
                        <th className="px-4 py-2.5 text-left">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Statut</span>
                        </th>
                        <SortHeader label="Date" sortKey="date" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                        <th className="px-4 py-2.5 text-right">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuotes.map((quote) => (
                        <tr
                          key={quote.id}
                          onClick={() => router.push(`/quotes/${quote.id}`)}
                          className={`group cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-slate-50 ${
                            deletingId === quote.id ? "opacity-40" : ""
                          }`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-[13px] font-semibold tabular-nums text-slate-900">{quote.quote_number}</td>
                          <td data-label="Contact" className="max-w-[220px] px-4 py-3">
                            <p className="truncate text-[13px] font-medium text-slate-900 transition-colors group-hover:text-[color:var(--violet)]">{quote.client_name}</p>
                            {quote.client_email && <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{quote.client_email}</p>}
                          </td>
                          <td data-label="Montant TTC" className="whitespace-nowrap px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-slate-900">{formatCurrency(quote.total_ttc)}</td>
                          <td data-label="Statut" className="whitespace-nowrap px-4 py-3">
                            <StatusBadge status={quote.status} viewedAt={quote.viewed_at} />
                          </td>
                          <td data-label="Date" className="whitespace-nowrap px-4 py-3 text-[13px] tabular-nums text-slate-600">{formatDate(quote.issued_at ?? quote.created_at)}</td>
                          <td className="relative px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {quote.status === "draft" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSend(quote);
                                  }}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3 text-[12px] font-medium text-white transition-all hover:brightness-110"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  Envoyer
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === quote.id ? null : quote.id);
                                }}
                                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                            {openMenuId === quote.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                  }}
                                />
                                <div className="absolute right-4 top-11 z-20 w-48 rounded-xl border border-border bg-white py-1 text-left shadow-[var(--shadow-md)]">
                                  <Link
                                    href={`/quotes/${quote.id}`}
                                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    {quote.status === "draft" ? "Modifier" : "Voir"}
                                  </Link>
                                  <a
                                    href={`/api/quotes/${quote.id}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <Download className="w-3.5 h-3.5 text-slate-400" />
                                    Télécharger PDF
                                  </a>
                                  {quote.status === "draft" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(quote);
                                      }}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-rose-700 hover:bg-[color:var(--danger-soft)]"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
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
              </div>
            </FadeIn>
          )}
        </>
      )}

      {sendModalQuote && (
        <SendQuoteModal
          quoteId={sendModalQuote.id}
          quoteNumber={sendModalQuote.quote_number}
          clientEmail={sendModalQuote.client_email ?? ""}
          onClose={() => setSendModalQuote(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
