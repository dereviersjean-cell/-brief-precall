"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { QuoteSettings, QuoteOffer, Contact, QuoteWithLines, QuoteDataInput } from "@/lib/db";
import { computeQuoteTotals, computeLineTotals, type QuoteLineInput } from "@/lib/quote-calc";
import { formatContactDisplayName } from "@/lib/format";
import SendQuoteModal from "./SendQuoteModal";

type EditorLine = {
  key: string;
  offer_id: string | null;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  discount_type: "percent" | "amount" | "";
  discount_value: number;
};

function makeKey(): string {
  return Math.random().toString(36).slice(2);
}

function linesFromQuote(quote: QuoteWithLines | null): EditorLine[] {
  if (!quote) return [];
  return quote.lines.map((l) => ({
    key: l.id,
    offer_id: l.offer_id,
    name: l.name,
    description: l.description ?? "",
    quantity: l.quantity,
    unit: l.unit ?? "",
    unit_price: l.unit_price,
    vat_rate: l.vat_rate,
    discount_type: l.discount_type ?? "",
    discount_value: l.discount_value,
  }));
}

function emptyLine(defaultVatRate: number): EditorLine {
  return {
    key: makeKey(),
    offer_id: null,
    name: "",
    description: "",
    quantity: 1,
    unit: "unité",
    unit_price: 0,
    vat_rate: defaultVatRate,
    discount_type: "",
    discount_value: 0,
  };
}

function lineFromOffer(offer: QuoteOffer): EditorLine {
  return {
    key: makeKey(),
    offer_id: offer.id,
    name: offer.name,
    description: offer.description ?? "",
    quantity: 1,
    unit: offer.unit,
    unit_price: offer.unit_price,
    vat_rate: offer.vat_rate,
    discount_type: "",
    discount_value: 0,
  };
}

function toLineInput(line: EditorLine): QuoteLineInput {
  return {
    quantity: line.quantity,
    unit_price: line.unit_price,
    vat_rate: line.vat_rate,
    discount_type: line.discount_type === "" ? null : line.discount_type,
    discount_value: line.discount_value,
  };
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

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

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}

export default function QuoteEditor({
  mode,
  quoteId,
  settings,
  offers,
  contacts,
  quote,
}: {
  mode: "create" | "edit";
  quoteId?: string;
  settings: QuoteSettings;
  offers: QuoteOffer[];
  contacts: Contact[];
  quote: QuoteWithLines | null;
}) {
  const router = useRouter();

  const [contactId, setContactId] = useState(quote?.contact_id ?? "");
  const [clientName, setClientName] = useState(quote?.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(quote?.client_email ?? "");
  const [clientAddress, setClientAddress] = useState(quote?.client_address ?? "");
  const [clientSiret, setClientSiret] = useState(quote?.client_siret ?? "");
  const [clientVatNumber, setClientVatNumber] = useState(quote?.client_vat_number ?? "");

  const [lines, setLines] = useState<EditorLine[]>(linesFromQuote(quote));

  const isReadOnly = quote != null && quote.status !== "draft";
  const [showSendModal, setShowSendModal] = useState(false);

  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [legalMentions, setLegalMentions] = useState(quote?.legal_mentions ?? settings.legal_mentions ?? "");
  const [paymentTerms, setPaymentTerms] = useState(quote?.payment_terms ?? settings.payment_terms ?? "");
  const [validUntil, setValidUntil] = useState(quote?.valid_until ? quote.valid_until.slice(0, 10) : "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateInfo, setGenerateInfo] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const totals = computeQuoteTotals(lines.map(toLineInput));

  function updateLine(key: string, patch: Partial<EditorLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function moveLine(key: string, direction: "up" | "down") {
    setLines((prev) => {
      const index = prev.findIndex((l) => l.key === key);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  function handleContactChange(id: string) {
    setContactId(id);
    if (!id) return;
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;
    setClientName(formatContactDisplayName(contact.company_name, contact.email));
    setClientEmail(contact.email);
  }

  function handleAddFromCatalog(offerId: string) {
    if (!offerId) return;
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;
    setLines((prev) => [...prev, lineFromOffer(offer)]);
  }

  function handleAddBlankLine() {
    setLines((prev) => [...prev, emptyLine(settings.default_vat_rate)]);
  }

  async function handleGenerate() {
    if (!contactId) return;
    if (lines.length > 0) {
      const confirmed = window.confirm(
        "Des lignes sont déjà présentes dans ce devis. Les remplacer par la proposition de Brief ?"
      );
      if (!confirmed) return;
    }

    setGenerating(true);
    setGenerateInfo(null);
    setGenerateError(null);
    try {
      const res = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "La génération a échoué.");
      }

      const draft = (await res.json()) as {
        lines: Array<{
          offer_id: string | null;
          name: string;
          description: string | null;
          quantity: number;
          unit: string;
          unit_price: number;
          vat_rate: number;
          discount_type: "percent" | "amount" | null;
          discount_value: number;
        }>;
        notes: string;
        validity_days: number;
      };

      if (draft.lines.length === 0) {
        setGenerateInfo("Pas assez d'échanges pour proposer un pré-remplissage — remplis manuellement.");
        return;
      }

      setLines(
        draft.lines.map((l) => ({
          key: makeKey(),
          offer_id: l.offer_id,
          name: l.name,
          description: l.description ?? "",
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          vat_rate: l.vat_rate,
          discount_type: l.discount_type ?? "",
          discount_value: l.discount_value,
        }))
      );
      setNotes(draft.notes);
      const validUntilDate = new Date();
      validUntilDate.setDate(validUntilDate.getDate() + draft.validity_days);
      setValidUntil(validUntilDate.toISOString().slice(0, 10));
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "La génération a échoué.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!clientName.trim()) {
      setError("Le nom du client est requis.");
      return;
    }
    if (lines.length === 0) {
      setError("Ajoutez au moins une ligne au devis.");
      return;
    }
    if (lines.some((l) => !l.name.trim())) {
      setError("Chaque ligne doit avoir un nom.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    const payload: QuoteDataInput = {
      contact_id: contactId || null,
      client_name: clientName.trim(),
      client_email: clientEmail.trim() || null,
      client_address: clientAddress.trim() || null,
      client_siret: clientSiret.trim() || null,
      client_vat_number: clientVatNumber.trim() || null,
      notes: notes.trim() || null,
      legal_mentions: legalMentions.trim() || null,
      payment_terms: paymentTerms.trim() || null,
      valid_until: validUntil || null,
      lines: lines.map((l, i) => ({
        offer_id: l.offer_id,
        name: l.name.trim(),
        description: l.description.trim() || null,
        quantity: l.quantity,
        unit: l.unit.trim() || null,
        unit_price: l.unit_price,
        vat_rate: l.vat_rate,
        discount_type: l.discount_type === "" ? null : l.discount_type,
        discount_value: l.discount_value,
        sort_order: i,
      })),
    };

    try {
      if (mode === "create") {
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Erreur serveur");
        }
        const { id } = (await res.json()) as { id: string };
        router.push(`/quotes/${id}`);
      } else {
        const res = await fetch(`/api/quotes/${quoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Erreur serveur");
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex items-start gap-3">
          <Link
            href="/quotes"
            className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">
              {mode === "create" ? "Nouveau devis" : `Devis ${quote?.quote_number ?? ""}`}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
              {isReadOnly ? "Devis envoyé — lecture seule." : "Brouillon — modifiable tant qu'il n'est pas envoyé."}
            </p>
          </div>
        </div>

        {isReadOnly && quote && (
          <div className="mb-6 rounded-2xl border border-border bg-white px-4 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Statut</h2>
              <StatusBadge status={quote.status} viewedAt={quote.viewed_at} />
            </div>
            <div className="grid grid-cols-1 gap-4 text-[13px] sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Envoyé le</p>
                <p className="tabular-nums text-slate-900">{formatDateTime(quote.sent_at)}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Ouverture</p>
                <p className="tabular-nums text-slate-900">{quote.viewed_at ? formatDateTime(quote.viewed_at) : "Pas encore ouvert"}</p>
              </div>
              {quote.status === "accepted" && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Accepté le</p>
                  <p className="font-semibold tabular-nums text-emerald-700">{formatDateTime(quote.accepted_at)}</p>
                </div>
              )}
              {quote.status === "rejected" && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Refusé le</p>
                  <p className="font-semibold tabular-nums text-rose-700">{formatDateTime(quote.rejected_at)}</p>
                  {quote.rejection_reason && (
                    <p className="mt-1 text-[12px] text-slate-500">Motif : {quote.rejection_reason}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <fieldset disabled={isReadOnly} className="contents">

        {/* Client */}
        <div className="mb-6 rounded-2xl border border-border bg-white px-4 py-5 sm:px-6">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Client</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Contact existant</label>
              <select
                value={contactId}
                onChange={(e) => handleContactChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">— Nouveau client —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.email}
                    {c.company_name ? ` (${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <TextField label="Nom / raison sociale" value={clientName} onChange={setClientName} />
            <TextField label="Email" type="email" value={clientEmail} onChange={setClientEmail} />
            <TextField label="SIRET" value={clientSiret} onChange={setClientSiret} />
            <TextField label="N° TVA" value={clientVatNumber} onChange={setClientVatNumber} />
            <div className="sm:col-span-2">
              <TextField label="Adresse" value={clientAddress} onChange={setClientAddress} />
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="mb-6 rounded-2xl border border-border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Lignes</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {contactId && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-3.5 text-[13px] font-medium text-[color:var(--violet)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Génération…
                    </>
                  ) : (
                    "✨ Générer avec Brief"
                  )}
                </button>
              )}
              <select
                value=""
                onChange={(e) => handleAddFromCatalog(e.target.value)}
                className="h-9 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:border-[color:var(--violet)] disabled:opacity-50"
              >
                <option value="">+ Depuis le catalogue</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddBlankLine}
                className="inline-flex h-9 items-center rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Ligne libre
              </button>
            </div>
          </div>

          {generateInfo && (
            <div className="-mt-2 px-4 pb-4 sm:px-6">
              <p className="text-[12px] italic text-slate-500">{generateInfo}</p>
            </div>
          )}
          {generateError && (
            <div className="-mt-2 px-4 pb-4 sm:px-6">
              <p className="rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[12.5px] text-rose-700">{generateError}</p>
            </div>
          )}

          {lines.length === 0 ? (
            <div className="px-6 pb-8 text-center text-[13px] text-slate-500">Aucune ligne pour l&apos;instant.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-y border-border">
                    <th className="min-w-[200px] py-2.5 pl-4 pr-2 sm:pl-6 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                      Désignation
                    </th>
                    <th className="px-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Qté</th>
                    <th className="px-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Unité</th>
                    <th className="px-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">PU HT</th>
                    <th className="px-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Remise</th>
                    <th className="px-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">TVA %</th>
                    <th className="px-1.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                      Total HT
                    </th>
                    <th className="py-2.5 pl-1.5 pr-4 text-right sm:pr-6 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const computed = computeLineTotals(toLineInput(line));
                    return (
                      <tr key={line.key} className="border-b border-border last:border-b-0">
                        <td className="py-2.5 pl-4 pr-2 align-top sm:pl-6">
                          <input
                            type="text"
                            value={line.name}
                            onChange={(e) => updateLine(line.key, { name: e.target.value })}
                            placeholder="Nom de la ligne"
                            className="mb-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50"
                          />
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(line.key, { description: e.target.value })}
                            placeholder="Description (optionnel)"
                            className="w-full rounded-lg border border-border bg-white px-2 py-1 text-[12px] text-slate-500 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-14 rounded-lg border border-border bg-white px-1.5 py-1.5 text-[13px] tabular-nums text-slate-900 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 align-top">
                          <input
                            type="text"
                            value={line.unit}
                            onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                            className="w-16 rounded-lg border border-border bg-white px-1.5 py-1.5 text-[13px] tabular-nums text-slate-900 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => updateLine(line.key, { unit_price: parseFloat(e.target.value) || 0 })}
                            className="w-20 rounded-lg border border-border bg-white px-1.5 py-1.5 text-[13px] tabular-nums text-slate-900 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 align-top">
                          <div className="flex items-center gap-1">
                            <select
                              value={line.discount_type}
                              onChange={(e) =>
                                updateLine(line.key, { discount_type: e.target.value as EditorLine["discount_type"] })
                              }
                              className="rounded-lg border border-border bg-white px-1 py-1.5 text-[12px] text-slate-900 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50"
                            >
                              <option value="">—</option>
                              <option value="percent">%</option>
                              <option value="amount">€</option>
                            </select>
                            {line.discount_type !== "" && (
                              <input
                                type="number"
                                step="0.01"
                                value={line.discount_value}
                                onChange={(e) =>
                                  updateLine(line.key, { discount_value: parseFloat(e.target.value) || 0 })
                                }
                                className="w-14 rounded-lg border border-border bg-white px-1.5 py-1.5 text-[13px] tabular-nums text-slate-900 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-1.5 py-2.5 align-top">
                          <input
                            type="number"
                            step="0.1"
                            value={line.vat_rate}
                            onChange={(e) => updateLine(line.key, { vat_rate: parseFloat(e.target.value) || 0 })}
                            className="w-14 rounded-lg border border-border bg-white px-1.5 py-1.5 text-[13px] tabular-nums text-slate-900 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </td>
                        <td className="whitespace-nowrap px-1.5 pb-2 pt-3.5 text-right align-top font-semibold tabular-nums text-slate-900">
                          {formatCurrency(computed.net_ht)}
                        </td>
                        <td className="py-2.5 pl-1.5 pr-4 align-top sm:pr-6">
                          <div className="flex items-center justify-end gap-1 pt-1.5">
                            <button
                              onClick={() => moveLine(line.key, "up")}
                              disabled={i === 0}
                              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveLine(line.key, "down")}
                              disabled={i === lines.length - 1}
                              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button onClick={() => removeLine(line.key)} className="grid h-7 w-7 place-items-center rounded-md text-rose-600 transition-colors hover:bg-[color:var(--danger-soft)] hover:text-rose-700">
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="mb-6 rounded-2xl border border-border bg-white px-4 py-5 sm:px-6">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Totaux</h2>
          <div className="ml-auto max-w-xs space-y-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-500">Sous-total HT</span>
              <span className="tabular-nums text-slate-900">{formatCurrency(totals.subtotal_ht)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">Total remises</span>
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
        </div>

        {/* Options */}
        <div className="mb-6 rounded-2xl border border-border bg-white px-4 py-5 sm:px-6">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Options</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500 resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Mentions légales</label>
              <textarea
                value={legalMentions}
                onChange={(e) => setLegalMentions(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Conditions de paiement" value={paymentTerms} onChange={setPaymentTerms} />
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Date de validité</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            {error && <p className="text-[13px] text-rose-700">{error}</p>}
            {saved && !error && <p className="text-[13px] font-medium text-emerald-700">Brouillon enregistré.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push("/quotes")}
              className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Annuler
            </button>
            {mode === "edit" && quoteId ? (
              <a
                href={`/api/quotes/${quoteId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Aperçu PDF
              </a>
            ) : (
              <span
                title="Enregistrez le brouillon avant de générer un PDF."
                className="inline-flex h-9 cursor-not-allowed items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-300"
              >
                Aperçu PDF
              </span>
            )}
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-9 items-center rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer brouillon"}
              </button>
            )}
            {mode === "edit" && quote && quote.status === "draft" && (
              <button
                onClick={() => setShowSendModal(true)}
                className="inline-flex h-9 items-center rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-semibold text-white transition-all hover:brightness-110"
              >
                📤 Envoyer
              </button>
            )}
          </div>
        </div>
      </div>

      {showSendModal && quote && (
        <SendQuoteModal
          quoteId={quote.id}
          quoteNumber={quote.quote_number}
          clientEmail={quote.client_email ?? ""}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
