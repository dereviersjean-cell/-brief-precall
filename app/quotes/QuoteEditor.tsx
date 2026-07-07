"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { QuoteSettings, QuoteOffer, Contact, QuoteWithLines, QuoteDataInput } from "@/lib/db";
import { computeQuoteTotals, computeLineTotals, type QuoteLineInput } from "@/lib/quote-calc";
import { formatContactDisplayName } from "@/lib/format";

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
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/quotes" className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === "create" ? "Nouveau devis" : `Devis ${quote?.quote_number ?? ""}`}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Brouillon — modifiable tant qu&apos;il n&apos;est pas envoyé.</p>
          </div>
        </div>

        {/* Client */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Client</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact existant</label>
              <select
                value={contactId}
                onChange={(e) => handleContactChange(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <div className="col-span-2">
              <TextField label="Adresse" value={clientAddress} onChange={setClientAddress} />
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Lignes</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {contactId && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                + Ligne libre
              </button>
            </div>
          </div>

          {generateInfo && (
            <div className="px-6 pb-4 -mt-2">
              <p className="text-xs text-slate-500 italic">{generateInfo}</p>
            </div>
          )}
          {generateError && (
            <div className="px-6 pb-4 -mt-2">
              <p className="text-xs text-red-600">{generateError}</p>
            </div>
          )}

          {lines.length === 0 ? (
            <div className="px-6 pb-8 text-center text-slate-400 text-sm">Aucune ligne pour l&apos;instant.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pl-6 pr-2 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[200px]">
                      Désignation
                    </th>
                    <th className="py-2 px-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qté</th>
                    <th className="py-2 px-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unité</th>
                    <th className="py-2 px-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">PU HT</th>
                    <th className="py-2 px-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Remise</th>
                    <th className="py-2 px-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">TVA %</th>
                    <th className="py-2 px-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">
                      Total HT
                    </th>
                    <th className="py-2 pr-6 pl-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const computed = computeLineTotals(toLineInput(line));
                    return (
                      <tr key={line.key} className="border-b border-slate-100">
                        <td className="py-2 pl-6 pr-2 align-top">
                          <input
                            type="text"
                            value={line.name}
                            onChange={(e) => updateLine(line.key, { name: e.target.value })}
                            placeholder="Nom de la ligne"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(line.key, { description: e.target.value })}
                            placeholder="Description (optionnel)"
                            className="w-full px-2 py-1 border border-slate-100 rounded-md text-xs text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-1.5 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-14 px-1.5 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-1.5 align-top">
                          <input
                            type="text"
                            value={line.unit}
                            onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                            className="w-16 px-1.5 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-1.5 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => updateLine(line.key, { unit_price: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-1.5 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-1.5 align-top">
                          <div className="flex items-center gap-1">
                            <select
                              value={line.discount_type}
                              onChange={(e) =>
                                updateLine(line.key, { discount_type: e.target.value as EditorLine["discount_type"] })
                              }
                              className="px-1 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                                className="w-14 px-1.5 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-1.5 align-top">
                          <input
                            type="number"
                            step="0.1"
                            value={line.vat_rate}
                            onChange={(e) => updateLine(line.key, { vat_rate: parseFloat(e.target.value) || 0 })}
                            className="w-14 px-1.5 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-1.5 align-top text-right font-mono text-slate-700 pt-3.5">
                          {formatCurrency(computed.net_ht)}
                        </td>
                        <td className="py-2 pr-6 pl-1.5 align-top">
                          <div className="flex items-center justify-end gap-1 pt-1.5">
                            <button
                              onClick={() => moveLine(line.key, "up")}
                              disabled={i === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveLine(line.key, "down")}
                              disabled={i === lines.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button onClick={() => removeLine(line.key)} className="p-1 text-red-500 hover:text-red-700">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Totaux</h2>
          <div className="max-w-xs ml-auto space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Sous-total HT</span>
              <span className="text-slate-800">{formatCurrency(totals.subtotal_ht)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total remises</span>
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
        </div>

        {/* Options */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Options</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mentions légales</label>
              <textarea
                value={legalMentions}
                onChange={(e) => setLegalMentions(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Conditions de paiement" value={paymentTerms} onChange={setPaymentTerms} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date de validité</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && !error && <p className="text-sm text-emerald-600 font-medium">Brouillon enregistré.</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/quotes")}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            {mode === "edit" && quoteId ? (
              <a
                href={`/api/quotes/${quoteId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Aperçu PDF
              </a>
            ) : (
              <span
                title="Enregistrez le brouillon avant de générer un PDF."
                className="px-5 py-2.5 border border-slate-100 text-slate-300 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                Aperçu PDF
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer brouillon"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
