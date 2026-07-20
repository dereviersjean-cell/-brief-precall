"use client";

import { useState, useRef } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuoteSettings, QuoteOffer } from "@/lib/db";

type SettingsForm = {
  company_name: string;
  company_siret: string;
  company_vat_number: string;
  company_address: string;
  company_email: string;
  company_phone: string;
  company_website: string;
  company_logo_url: string;
  company_rib: string;
  legal_mentions: string;
  default_vat_rate: string;
  payment_terms: string;
  quote_number_prefix: string;
};

function toForm(settings: QuoteSettings | null): SettingsForm {
  return {
    company_name: settings?.company_name ?? "",
    company_siret: settings?.company_siret ?? "",
    company_vat_number: settings?.company_vat_number ?? "",
    company_address: settings?.company_address ?? "",
    company_email: settings?.company_email ?? "",
    company_phone: settings?.company_phone ?? "",
    company_website: settings?.company_website ?? "",
    company_logo_url: settings?.company_logo_url ?? "",
    company_rib: settings?.company_rib ?? "",
    legal_mentions: settings?.legal_mentions ?? "",
    default_vat_rate: settings?.default_vat_rate != null ? String(settings.default_vat_rate) : "20",
    payment_terms: settings?.payment_terms ?? "",
    quote_number_prefix: settings?.quote_number_prefix ?? "DEV",
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
      />
    </div>
  );
}

function QuoteOfferModal({
  offer,
  defaultVatRate,
  onClose,
  onSaved,
}: {
  offer: QuoteOffer | null;
  defaultVatRate: number;
  onClose: () => void;
  onSaved: (offer: QuoteOffer) => void;
}) {
  const [name, setName] = useState(offer?.name ?? "");
  const [description, setDescription] = useState(offer?.description ?? "");
  const [unitPrice, setUnitPrice] = useState(offer ? String(offer.unit_price) : "");
  const [unit, setUnit] = useState(offer?.unit ?? "unité");
  const [vatRate, setVatRate] = useState(offer ? String(offer.vat_rate) : String(defaultVatRate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmedName = name.trim();
    const price = parseFloat(unitPrice);
    if (!trimmedName || Number.isNaN(price)) return;

    setLoading(true);
    setError(null);
    try {
      const body = {
        name: trimmedName,
        description: description.trim() || null,
        unit_price: price,
        unit: unit.trim() || "unité",
        vat_rate: vatRate ? parseFloat(vatRate) : defaultVatRate,
      };

      const res = await fetch(offer ? `/api/quotes/offers/${offer.id}` : "/api/quotes/offers", {
        method: offer ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Une erreur est survenue.");
      }

      if (offer) {
        onSaved({ ...offer, ...body });
      } else {
        const { id } = (await res.json()) as { id: string };
        onSaved({
          id,
          user_id: "",
          name: body.name,
          description: body.description,
          unit_price: body.unit_price,
          unit: body.unit,
          vat_rate: body.vat_rate,
          sort_order: 0,
          archived_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">{offer ? "Modifier l'offre" : "Ajouter une offre"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prix unitaire</label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unité</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">TVA (%)</label>
              <input
                type="number"
                step="0.1"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !unitPrice || loading}
            className="text-sm font-medium text-white brand-gradient px-4 py-2 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50"
          >
            {loading ? "Enregistrement…" : offer ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuoteSettingsClient({
  initialSettings,
  initialOffers,
}: {
  initialSettings: QuoteSettings | null;
  initialOffers: QuoteOffer[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<SettingsForm>(toForm(initialSettings));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [offers, setOffers] = useState<QuoteOffer[]>(initialOffers);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<QuoteOffer | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);

  function updateField<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/quotes/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: form.company_name || null,
          company_siret: form.company_siret || null,
          company_vat_number: form.company_vat_number || null,
          company_address: form.company_address || null,
          company_email: form.company_email || null,
          company_phone: form.company_phone || null,
          company_website: form.company_website || null,
          company_logo_url: form.company_logo_url || null,
          company_rib: form.company_rib || null,
          legal_mentions: form.legal_mentions || null,
          default_vat_rate: form.default_vat_rate ? parseFloat(form.default_vat_rate) : null,
          payment_terms: form.payment_terms || null,
          quote_number_prefix: form.quote_number_prefix || "DEV",
        }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoError(null);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const res = await fetch("/api/quotes/settings/logo", { method: "POST", body: uploadData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de l'upload.");
      }
      const { url } = (await res.json()) as { url: string };
      updateField("company_logo_url", url);

      // Persisted right away — the logo shouldn't be lost if the user leaves
      // the page without clicking "Enregistrer".
      await fetch("/api/quotes/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_logo_url: url }),
      });
      router.refresh();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Erreur lors de l'upload.");
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleArchiveOffer(offer: QuoteOffer) {
    if (!window.confirm(`Archiver l'offre "${offer.name}" ?`)) return;
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
    try {
      const res = await fetch(`/api/quotes/offers/${offer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      router.refresh();
    }
  }

  async function handleMove(offer: QuoteOffer, direction: "up" | "down") {
    const index = offers.findIndex((o) => o.id === offer.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= offers.length) return;

    const reordered = [...offers];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    // Re-normalize the whole list's sort_order to its new index — offers can
    // share the same sort_order (e.g. all default to 0), so swapping just the
    // two values wouldn't reliably persist the new order.
    const withNewOrder = reordered.map((o, i) => ({ ...o, sort_order: i }));
    setOffers(withNewOrder);

    setReordering(offer.id);
    try {
      await Promise.all(
        withNewOrder.map((o) =>
          fetch(`/api/quotes/offers/${o.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: o.sort_order }),
          })
        )
      );
    } finally {
      setReordering(null);
    }
  }

  function handleOfferSaved(offer: QuoteOffer) {
    setOffers((prev) => {
      const exists = prev.some((o) => o.id === offer.id);
      const next = exists ? prev.map((o) => (o.id === offer.id ? offer : o)) : [...prev, offer];
      return [...next].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    });
    setShowOfferModal(false);
    setEditingOffer(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/quotes" className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Paramètres devis</h1>
            <p className="text-slate-500 mt-1 text-sm">Informations utilisées pour générer vos devis.</p>
          </div>
        </div>

        {/* Company info */}
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] divide-y divide-slate-100">
          <div className="px-6 py-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Informations entreprise</h2>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {form.company_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.company_logo_url} alt="Logo entreprise" className="w-full h-full object-contain" />
                ) : (
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 21h10.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0017.25 3H6.75A2.25 2.25 0 004.5 5.25v13.5A2.25 2.25 0 006.75 21zM8.25 8.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                  </svg>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="text-sm font-medium text-[color:var(--violet)] hover:brightness-90 disabled:opacity-50"
                >
                  {logoUploading ? "Envoi…" : "Changer le logo"}
                </button>
                {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Raison sociale" value={form.company_name} onChange={(v) => updateField("company_name", v)} />
              <Field label="SIRET" value={form.company_siret} onChange={(v) => updateField("company_siret", v)} />
              <Field
                label="N° TVA intracommunautaire"
                value={form.company_vat_number}
                onChange={(v) => updateField("company_vat_number", v)}
              />
              <Field label="Site web" value={form.company_website} onChange={(v) => updateField("company_website", v)} />
              <Field label="Email" type="email" value={form.company_email} onChange={(v) => updateField("company_email", v)} />
              <Field label="Téléphone" value={form.company_phone} onChange={(v) => updateField("company_phone", v)} />
              <div className="col-span-2">
                <Field label="Adresse" value={form.company_address} onChange={(v) => updateField("company_address", v)} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">RIB</label>
                <textarea
                  value={form.company_rib}
                  onChange={(e) => updateField("company_rib", e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] resize-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mentions légales</label>
                <textarea
                  value={form.legal_mentions}
                  onChange={(e) => updateField("legal_mentions", e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] resize-none"
                />
              </div>
              <Field
                label="TVA par défaut (%)"
                type="number"
                value={form.default_vat_rate}
                onChange={(v) => updateField("default_vat_rate", v)}
              />
              <Field
                label="Conditions de paiement"
                value={form.payment_terms}
                onChange={(v) => updateField("payment_terms", v)}
                placeholder="Ex : 30 jours"
              />
              <Field
                label="Préfixe numéro de devis"
                value={form.quote_number_prefix}
                onChange={(v) => updateField("quote_number_prefix", v)}
                placeholder="DEV"
              />
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-between bg-slate-50 rounded-b-2xl">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && !error && <p className="text-sm text-emerald-600 font-medium">Modifications enregistrées.</p>}
            {!error && !saved && <span />}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        {/* Offer catalog */}
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] mt-6">
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Catalogue d&apos;offres</h2>
              <p className="text-sm text-slate-500 mt-0.5">Offres réutilisables dans vos devis.</p>
            </div>
            <button
              onClick={() => {
                setEditingOffer(null);
                setShowOfferModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 brand-gradient text-white rounded-lg text-sm font-medium hover:brightness-110 transition-colors"
            >
              + Ajouter une offre
            </button>
          </div>

          {offers.length === 0 ? (
            <div className="px-6 pb-8 text-center text-slate-400 text-sm">Aucune offre pour l&apos;instant.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 pl-6 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Prix</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unité</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">TVA</th>
                    <th className="py-3 pr-6 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer, i) => (
                    <tr key={offer.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 pl-6 pr-4">
                        <p className="text-slate-800 font-medium">{offer.name}</p>
                        {offer.description && (
                          <p className="text-slate-400 text-xs mt-0.5 truncate max-w-xs">{offer.description}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-700 text-right font-mono">{offer.unit_price.toFixed(2)} €</td>
                      <td className="py-3 pr-4 text-slate-500">{offer.unit}</td>
                      <td className="py-3 pr-4 text-slate-500 text-right">{offer.vat_rate}%</td>
                      <td className="py-3 pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleMove(offer, "up")}
                            disabled={i === 0 || reordering !== null}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                            title="Monter"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMove(offer, "down")}
                            disabled={i === offers.length - 1 || reordering !== null}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                            title="Descendre"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => {
                              setEditingOffer(offer);
                              setShowOfferModal(true);
                            }}
                            className="text-xs font-medium text-[color:var(--violet)] hover:brightness-90 px-2"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleArchiveOffer(offer)}
                            className="text-xs font-medium text-red-600 hover:text-red-700 px-2"
                          >
                            Archiver
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showOfferModal && (
        <QuoteOfferModal
          offer={editingOffer}
          defaultVatRate={form.default_vat_rate ? parseFloat(form.default_vat_rate) : 20}
          onClose={() => {
            setShowOfferModal(false);
            setEditingOffer(null);
          }}
          onSaved={handleOfferSaved}
        />
      )}
    </div>
  );
}
