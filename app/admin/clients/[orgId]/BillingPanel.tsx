"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationBilling } from "@/lib/db";

// Facturation d'un client — reprise telle quelle de l'ancienne fiche
// organisation (29/09/2026) : statut Stripe, dates, et override support.

const BILLING_STATUS_META: Record<string, { label: string; className: string }> = {
  none: { label: "Aucun abonnement", className: "bg-slate-100 text-slate-600" },
  trialing: { label: "Essai gratuit", className: "bg-indigo-100 text-indigo-700" },
  active: { label: "Actif", className: "bg-emerald-100 text-emerald-700" },
  grace_period: { label: "Paiement en échec", className: "bg-amber-100 text-amber-700" },
  blocked: { label: "Accès suspendu", className: "bg-red-100 text-red-700" },
  canceled: { label: "Résilié", className: "bg-slate-100 text-slate-600" },
};

function formatBillingDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// Override côté Brief pour les cas de support (paiement par virement, litige)
// — n'agit jamais sur le véritable abonnement Stripe, seulement sur l'accès
// à l'app. Si l'abonnement Stripe est réellement résilié/impayé, un futur
// webhook peut réécraser ce déblocage.
function BillingOverrideActions({
  orgId,
  status,
  onDone,
}: {
  orgId: string;
  status: string;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: "unblock" | "extend_grace") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur.");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 pt-5 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Override support</p>
      <p className="text-xs text-slate-400 mb-3">
        N&apos;agit que sur l&apos;accès Brief — ne modifie pas l&apos;abonnement Stripe. À utiliser pour un cas de
        support (paiement par virement, litige en cours).
      </p>
      <div className="flex items-center gap-2">
        {status === "blocked" && (
          <button
            onClick={() => runAction("unblock")}
            disabled={pending}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Débloquer manuellement
          </button>
        )}
        {status === "grace_period" && (
          <button
            onClick={() => runAction("extend_grace")}
            disabled={pending}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Prolonger la grâce de 48h
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

export default function BillingPanel({ organizationId, billing }: { organizationId: string; billing: OrganizationBilling | null }) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Facturation</h2>
        {(() => {
          const meta = BILLING_STATUS_META[billing?.billing_status ?? "none"] ?? BILLING_STATUS_META.none;
          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${meta.className}`}>
              {meta.label}
            </span>
          );
        })()}
      </div>
      {!billing || billing.billing_status === "none" ? (
        <p className="text-sm text-slate-400">Cette organisation n&apos;a pas encore souscrit d&apos;abonnement.</p>
      ) : (
        <table className="w-full text-sm text-left border-collapse">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stripe Customer</td>
              <td className="py-2 font-mono text-xs text-slate-700">{billing.stripe_customer_id ?? "—"}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stripe Subscription</td>
              <td className="py-2 font-mono text-xs text-slate-700">{billing.stripe_subscription_id ?? "—"}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Essai jusqu&apos;au</td>
              <td className="py-2 text-slate-700">{formatBillingDate(billing.trial_ends_at)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Période en cours</td>
              <td className="py-2 text-slate-700">
                {formatBillingDate(billing.current_period_start)} → {formatBillingDate(billing.current_period_end)}
              </td>
            </tr>
            {billing.grace_period_ends_at && (
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 text-xs font-semibold text-amber-600 uppercase tracking-wide">Grâce jusqu&apos;au</td>
                <td className="py-2 text-amber-700 font-medium">{formatBillingDate(billing.grace_period_ends_at)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {billing && (billing.billing_status === "blocked" || billing.billing_status === "grace_period") && (
        <BillingOverrideActions orgId={organizationId} status={billing.billing_status} onDone={() => router.refresh()} />
      )}
    </div>
  );
}
