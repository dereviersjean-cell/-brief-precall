"use client";

import { useState } from "react";
import { CreditCard, Users, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import FadeIn from "@/app/dashboard/FadeIn";
import StatTile from "@/app/dashboard/StatTile";
import type { OrganizationBilling } from "@/lib/db";

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
  trialing: { label: "Essai gratuit", className: "bg-indigo-100 text-indigo-700" },
  active: { label: "Actif", className: "bg-emerald-100 text-emerald-700" },
  grace_period: { label: "Paiement en échec", className: "bg-amber-100 text-amber-700" },
  blocked: { label: "Accès suspendu", className: "bg-red-100 text-red-700" },
  canceled: { label: "Résilié", className: "bg-slate-100 text-slate-600" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.none;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function BillingSettingsClient({
  organizationName,
  billing,
  seatCount,
  seatPrice,
}: {
  organizationName: string | null;
  billing: OrganizationBilling | null;
  seatCount: number;
  seatPrice: { amountCents: number; currency: string } | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = billing?.billing_status ?? "none";
  const hasSubscription = status !== "none";

  async function handleAction(endpoint: "checkout" | "portal") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings/billing/${endpoint}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Une erreur est survenue.");
      }
      window.location.href = (data as { url: string }).url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setLoading(false);
    }
  }

  const monthlyTotal = seatPrice ? seatPrice.amountCents * Math.max(seatCount, 1) : null;

  if (!organizationName) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
        Vous devez être rattaché à une organisation pour accéder à la facturation. Contactez votre administrateur.
      </div>
    );
  }

  return (
    <div>
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-3">
                <CreditCard className="w-3 h-3" />
                Facturation
              </span>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3 flex-wrap">
                {organizationName}
                <StatusBadge status={status} />
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {seatPrice
                  ? `${formatCurrency(seatPrice.amountCents, seatPrice.currency)} / siège / mois`
                  : "Tarification par siège"}
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {status === "grace_period" && billing?.grace_period_ends_at && (
        <FadeIn delay={0.05}>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Le dernier paiement a échoué — accès suspendu dans {hoursUntil(billing.grace_period_ends_at)}h
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Mettez à jour votre moyen de paiement pour éviter l&apos;interruption du service.
              </p>
            </div>
          </div>
        </FadeIn>
      )}

      {status === "blocked" && (
        <FadeIn delay={0.05}>
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Accès suspendu — paiement requis</p>
              <p className="text-xs text-red-700 mt-1">
                Mettez à jour votre moyen de paiement pour réactiver l&apos;accès à Brief.
              </p>
            </div>
          </div>
        </FadeIn>
      )}

      {hasSubscription && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatTile label="Sièges actifs" value={seatCount} icon={<Users className="w-4 h-4" />} accent="indigo" index={0} />
          <StatTile
            label="Coût mensuel estimé"
            value={monthlyTotal !== null ? monthlyTotal / 100 : null}
            decimals={2}
            suffix={seatPrice ? seatPrice.currency.toUpperCase() : undefined}
            icon={<CreditCard className="w-4 h-4" />}
            accent="violet"
            index={1}
          />
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {status === "trialing" ? "Fin de l'essai" : "Prochain renouvellement"}
            </p>
            <p className="text-sm text-slate-900 mt-1.5">
              {status === "trialing" ? formatDate(billing?.trial_ends_at ?? null) : formatDate(billing?.current_period_end ?? null)}
            </p>
          </div>
        </div>
      )}

      <FadeIn delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {!hasSubscription ? (
            <>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Démarrer votre essai gratuit</h2>
              <p className="text-sm text-slate-500 mb-4">
                7 jours d&apos;essai, carte bancaire requise. {seatCount} siège{seatCount > 1 ? "s" : ""} actif
                {seatCount > 1 ? "s" : ""} dans votre organisation
                {seatPrice ? ` — ${formatCurrency(seatPrice.amountCents * Math.max(seatCount, 1), seatPrice.currency)}/mois après l'essai.` : "."}
              </p>
              <button
                onClick={() => handleAction("checkout")}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Démarrer mon essai gratuit de 7 jours
              </button>
            </>
          ) : status === "canceled" ? (
            <>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Abonnement résilié</h2>
              <p className="text-sm text-slate-500 mb-4">Réabonnez-vous pour retrouver l&apos;accès à Brief.</p>
              <button
                onClick={() => handleAction("checkout")}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Se réabonner
              </button>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Gérer mon abonnement</h2>
              <p className="text-sm text-slate-500 mb-4">
                Moyen de paiement, historique des factures, résiliation — tout se passe dans l&apos;espace Stripe sécurisé.
              </p>
              <button
                onClick={() => handleAction("portal")}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Gérer mon abonnement
              </button>
            </>
          )}
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      </FadeIn>
    </div>
  );
}
