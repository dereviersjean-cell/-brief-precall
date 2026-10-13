"use client";

import { useState } from "react";
import { CreditCard, Users, Sparkles, AlertTriangle, Loader2, Check, Clock } from "lucide-react";
import FadeIn from "@/app/dashboard/FadeIn";
import StatTile from "@/app/dashboard/StatTile";
import HowItWorksCard, { type PipelineStep } from "@/app/settings/_components/HowItWorksCard";
import type { OrganizationBilling } from "@/lib/db";

const PIPELINE_STEPS: PipelineStep[] = [
  {
    icon: Users,
    title: "Un siège par utilisateur",
    description: "Les sièges se synchronisent sur les comptes actifs de votre équipe, sans démarche de votre part.",
  },
  {
    icon: Clock,
    title: "L'usage à l'heure enregistrée",
    description: "0,50 € par heure de call enregistré, compté à la seconde et ajouté à la facture du mois.",
  },
  {
    icon: CreditCard,
    title: "Essai puis prélèvement",
    description: "7 jours d'essai, puis prélèvement automatique. Un paiement en échec laisse 48h avant suspension.",
  },
];

type SeatPrice = { amountCents: number; currency: string };
type SeatPrices = { monthly: SeatPrice; annual: SeatPrice };

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency.toUpperCase() }).format(amountCents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function hoursUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (60 * 60 * 1000)));
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  none: { label: "Aucun abonnement", className: "bg-slate-100 text-slate-600" },
  trialing: { label: "Essai gratuit", className: "bg-[color:var(--lavender)] text-[color:var(--violet)]" },
  active: { label: "Actif", className: "bg-[color:var(--success-soft)] text-emerald-700" },
  grace_period: { label: "Paiement en échec", className: "bg-[color:var(--warning-soft)] text-amber-700" },
  blocked: { label: "Accès suspendu", className: "bg-[color:var(--danger-soft)] text-rose-700" },
  canceled: { label: "Résilié", className: "bg-slate-100 text-slate-600" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.none;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function IntervalToggle({
  value,
  onChange,
  seatPrices,
  seatCount,
}: {
  value: "month" | "year";
  onChange: (v: "month" | "year") => void;
  seatPrices: SeatPrices;
  seatCount: number;
}) {
  const annualMonthlyEquivalent = seatPrices.annual.amountCents / 12;
  const savingsPct = Math.round((1 - annualMonthlyEquivalent / seatPrices.monthly.amountCents) * 100);

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {(
        [
          { key: "month" as const, label: "Mensuel", price: seatPrices.monthly, sub: `${formatCurrency(seatPrices.monthly.amountCents, seatPrices.monthly.currency)} / siège / mois` },
          {
            key: "year" as const,
            label: "Annuel",
            price: seatPrices.annual,
            sub: `${formatCurrency(annualMonthlyEquivalent, seatPrices.annual.currency)} / mois — ${savingsPct}% d'économie`,
          },
        ]
      ).map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              active ? "border-[color:var(--violet)] bg-[color:var(--lavender)]" : "border-border bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[13.5px] font-semibold ${active ? "text-[color:var(--violet)]" : "text-slate-900"}`}>{option.label}</span>
              {active && <Check className="w-4 h-4 text-[color:var(--violet)]" />}
            </div>
            <p className="mt-1 text-[12.5px] text-slate-600 tabular-nums">{option.sub}</p>
            <p className="mt-0.5 text-[12px] text-slate-500 tabular-nums">
              soit {formatCurrency(option.price.amountCents * Math.max(seatCount, 1), option.price.currency)}
              {option.key === "month" ? "/mois" : "/an"} pour {seatCount} siège{seatCount > 1 ? "s" : ""}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export default function BillingSettingsClient({
  organizationName,
  billing,
  seatCount,
  seatPrices,
}: {
  organizationName: string | null;
  billing: OrganizationBilling | null;
  seatCount: number;
  seatPrices: SeatPrices | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const status = billing?.billing_status ?? "none";
  const hasSubscription = status !== "none";
  const currentInterval = (billing?.billing_interval as "month" | "year" | null) ?? "month";

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: billingInterval }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Une erreur est survenue.");
      window.location.href = (data as { url: string }).url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setLoading(false);
    }
  }

  async function handlePortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Une erreur est survenue.");
      window.location.href = (data as { url: string }).url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setLoading(false);
    }
  }

  // Toujours affiché en équivalent mensuel, même pour un abonnement annuel —
  // reste lisible/cohérent d'un coup d'œil quel que soit l'intervalle choisi.
  const monthlyEquivalentCents = seatPrices
    ? (currentInterval === "year" ? seatPrices.annual.amountCents / 12 : seatPrices.monthly.amountCents) * Math.max(seatCount, 1)
    : null;
  const displayCurrency = seatPrices ? (currentInterval === "year" ? seatPrices.annual.currency : seatPrices.monthly.currency) : undefined;

  if (!organizationName) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-[13.5px] text-slate-500">
        Vous devez être rattaché à une organisation pour accéder à la facturation. Contactez votre administrateur.
      </div>
    );
  }

  return (
    <div>
      <FadeIn>
        <div className="mb-6 rounded-2xl border border-border bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">
                <CreditCard className="h-3.5 w-3.5" />
                Facturation
              </span>
              <h1 className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">
                {organizationName}
                <StatusBadge status={status} />
                {hasSubscription && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600">
                    {currentInterval === "year" ? "Annuel" : "Mensuel"}
                  </span>
                )}
              </h1>
              <p className="mt-1.5 text-[14px] text-slate-500 tabular-nums">
                {seatPrices
                  ? `${formatCurrency(seatPrices.monthly.amountCents, seatPrices.monthly.currency)} / siège / mois`
                  : "Tarification par siège"}
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {status === "grace_period" && billing?.grace_period_ends_at && (
        <FadeIn delay={0.05}>
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[color:var(--warning-soft)] p-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-[13.5px] font-semibold text-amber-800">
                Le dernier paiement a échoué — accès suspendu dans {hoursUntil(billing.grace_period_ends_at)}h
              </p>
              <p className="mt-1 text-[12.5px] text-amber-700">
                Mettez à jour votre moyen de paiement pour éviter l&apos;interruption du service.
              </p>
            </div>
          </div>
        </FadeIn>
      )}

      {(status === "blocked" || status === "canceled") && (
        <FadeIn delay={0.05}>
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[color:var(--danger-soft)] p-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
            <div>
              <p className="text-[13.5px] font-semibold text-rose-700">Accès suspendu</p>
              <p className="mt-1 text-[12.5px] text-rose-700">
                {status === "canceled"
                  ? "Votre abonnement est résilié — réabonnez-vous pour retrouver l'accès à Brief."
                  : "Mettez à jour votre moyen de paiement pour réactiver l'accès à Brief."}
              </p>
            </div>
          </div>
        </FadeIn>
      )}

      <HowItWorksCard title="Ce qui vous est facturé" steps={PIPELINE_STEPS}>
        Votre facture ne comporte que deux lignes. L&apos;
        <span className="font-medium text-slate-900">abonnement par siège</span> suit automatiquement la composition
        de votre équipe : un commercial ajouté ou désactivé met l&apos;abonnement à jour, vous n&apos;avez rien à
        déclarer. L&apos;<span className="font-medium text-slate-900">usage</span>, lui, correspond aux appels
        réellement enregistrés — 0,50 € par heure, compté à la seconde près, et facturé une fois par mois. C&apos;est
        la refacturation directe de ce que coûte l&apos;enregistrement, sans marge ajoutée : un mois sans visio ne
        vous coûte que vos sièges.
      </HowItWorksCard>

      {hasSubscription && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Sièges actifs" value={seatCount} icon={<Users className="w-4 h-4" />} accent="indigo" index={0} />
          <StatTile
            label="Coût mensuel estimé"
            value={monthlyEquivalentCents !== null ? monthlyEquivalentCents / 100 : null}
            decimals={2}
            suffix={displayCurrency?.toUpperCase()}
            icon={<CreditCard className="w-4 h-4" />}
            accent="violet"
            index={1}
          />
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
              {status === "trialing" ? "Fin de l'essai" : "Prochain renouvellement"}
            </p>
            <p className="mt-3 text-[17px] font-semibold leading-tight tracking-tight text-slate-900 tabular-nums">
              {status === "trialing" ? formatDate(billing?.trial_ends_at ?? null) : formatDate(billing?.current_period_end ?? null)}
            </p>
          </div>
        </div>
      )}

      <FadeIn delay={0.1}>
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          {!hasSubscription ? (
            <>
              <h2 className="mb-1 text-[14px] font-semibold text-slate-900">Démarrer votre essai gratuit</h2>
              <p className="mb-4 text-[13px] leading-relaxed text-slate-500">
                7 jours d&apos;essai, carte bancaire requise. {seatCount} siège{seatCount > 1 ? "s" : ""} actif
                {seatCount > 1 ? "s" : ""} dans votre organisation.
              </p>
              {seatPrices && (
                <IntervalToggle value={billingInterval} onChange={setBillingInterval} seatPrices={seatPrices} seatCount={seatCount} />
              )}
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Démarrer mon essai gratuit de 7 jours
              </button>
            </>
          ) : status === "canceled" ? (
            <>
              <h2 className="mb-1 text-[14px] font-semibold text-slate-900">Abonnement résilié</h2>
              <p className="mb-4 text-[13px] leading-relaxed text-slate-500">Réabonnez-vous pour retrouver l&apos;accès à Brief.</p>
              {seatPrices && (
                <IntervalToggle value={billingInterval} onChange={setBillingInterval} seatPrices={seatPrices} seatCount={seatCount} />
              )}
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Se réabonner
              </button>
            </>
          ) : (
            <>
              <h2 className="mb-1 text-[14px] font-semibold text-slate-900">Gérer mon abonnement</h2>
              <p className="mb-4 text-[13px] leading-relaxed text-slate-500">
                Moyen de paiement, historique des factures, résiliation — tout se passe dans l&apos;espace Stripe sécurisé.
              </p>
              <button
                onClick={handlePortal}
                disabled={loading}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Gérer mon abonnement
              </button>
            </>
          )}
          {error && <p className="mt-3 rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>}
        </div>
      </FadeIn>
    </div>
  );
}
