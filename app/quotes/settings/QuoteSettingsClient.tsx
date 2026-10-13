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
      <label className="mb-1.5 block text-[12px] font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
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
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-md)] sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900">{offer ? "Modifier l'offre" : "Ajouter une offre"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] resize-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-700">Prix unitaire</label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-700">Unité</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-700">TVA (%)</label>
              <input
                type="number"
                step="0.1"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !unitPrice || loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
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
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">Paramètres devis</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">Informations utilisées pour générer vos devis.</p>
          </div>
        </div>

        {/* Company info */}
        <div className="rounded-2xl border border-border bg-white divide-y divide-border">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Informations entreprise</h2>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
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
                  className="inline-flex h-8 items-center rounded-lg border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-3 text-[12.5px] font-medium text-[color:var(--violet)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {logoUploading ? "Envoi…" : "Changer le logo"}
                </button>
                {logoError && <p className="mt-1.5 text-[12px] text-rose-700">{logoError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div className="sm:col-span-2">
                <Field label="Adresse" value={form.company_address} onChange={(v) => updateField("company_address", v)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700">RIB</label>
                <textarea
                  value={form.company_rib}
                  onChange={(e) => updateField("company_rib", e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Mentions légales</label>
                <textarea
                  value={form.legal_mentions}
                  onChange={(e) => updateField("legal_mentions", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] resize-none"
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

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            {error && <p className="text-[13px] text-rose-700">{error}</p>}
            {saved && !error && <p className="text-[13px] font-medium text-emerald-700">Modifications enregistrées.</p>}
            {!error && !saved && <span />}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        {/* Offer catalog */}
        <div className="mt-6 rounded-2xl border border-border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
            <div className="min-w-0">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Catalogue d&apos;offres</h2>
              <p className="mt-1 text-[13px] text-slate-500">Offres réutilisables dans vos devis.</p>
            </div>
            <button
              onClick={() => {
                setEditingOffer(null);
                setShowOfferModal(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Ajouter une offre
            </button>
          </div>

          {offers.length === 0 ? (
            <div className="px-6 pb-8 text-center text-[13px] text-slate-500">Aucune offre pour l&apos;instant.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-y border-border">
                    <th className="py-2.5 pl-4 pr-4 sm:pl-6 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Nom</th>
                    <th className="py-2.5 pr-4 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Prix</th>
                    <th className="py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Unité</th>
                    <th className="py-2.5 pr-4 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">TVA</th>
                    <th className="py-2.5 pr-4 text-right sm:pr-6 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer, i) => (
                    <tr key={offer.id} className="border-b border-border transition-colors last:border-b-0 hover:bg-slate-50">
                      <td className="py-3 pl-4 pr-4 sm:pl-6">
                        <p className="font-medium text-slate-900">{offer.name}</p>
                        {offer.description && (
                          <p className="mt-0.5 max-w-xs truncate text-[12px] text-slate-500">{offer.description}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-right font-semibold tabular-nums text-slate-900">{offer.unit_price.toFixed(2)} €</td>
                      <td className="py-3 pr-4 text-slate-600">{offer.unit}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-600">{offer.vat_rate}%</td>
                      <td className="py-3 pr-4 sm:pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleMove(offer, "up")}
                            disabled={i === 0 || reordering !== null}
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            title="Monter"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMove(offer, "down")}
                            disabled={i === offers.length - 1 || reordering !== null}
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            title="Descendre"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => {
                              setEditingOffer(offer);
                              setShowOfferModal(true);
                            }}
                            className="rounded-md px-2 py-1 text-[12px] font-medium text-[color:var(--violet)] transition-colors hover:bg-[color:var(--lavender)]"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleArchiveOffer(offer)}
                            className="rounded-md px-2 py-1 text-[12px] font-medium text-rose-700 transition-colors hover:bg-[color:var(--danger-soft)]"
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
