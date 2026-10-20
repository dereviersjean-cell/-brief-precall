"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationBilling } from "@/lib/db";

// Facturation d'un client — reprise telle quelle de l'ancienne fiche
// organisation (29/09/2026) : statut Stripe, dates, et override support.

const BILLING_STATUS_META: Record<string, { label: string; className: string }> = {
  none: { label: "Aucun abonnement", className: "bg-slate-100 text-slate-600" },
  trialing: { label: "Essai gratuit", className: "bg-[color:var(--lavender)] text-[color:var(--violet)]" },
  active: { label: "Actif", className: "bg-[color:var(--success-soft)] text-emerald-700" },
  grace_period: { label: "Paiement en échec", className: "bg-[color:var(--warning-soft)] text-amber-700" },
  blocked: { label: "Accès suspendu", className: "bg-[color:var(--danger-soft)] text-rose-700" },
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
    <div className="mt-5 border-t border-border pt-5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Override support</p>
      <p className="mb-3 text-[12.5px] text-slate-500">
        N&apos;agit que sur l&apos;accès Brief — ne modifie pas l&apos;abonnement Stripe. À utiliser pour un cas de
        support (paiement par virement, litige en cours).
      </p>
      <div className="flex items-center gap-2">
        {status === "blocked" && (
          <button
            onClick={() => runAction("unblock")}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Débloquer manuellement
          </button>
        )}
        {status === "grace_period" && (
          <button
            onClick={() => runAction("extend_grace")}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prolonger la grâce de 48h
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-[12px] text-rose-700">{error}</p>}
    </div>
  );
}

// Abonnement activé à la main (migration 028) : l'accès reste ouvert quel que
// soit le statut Stripe, tant que l'interrupteur est allumé. C'est ce qui
// remplace le « déblocage manuel » quand l'abonnement Stripe est vraiment
// résilié — celui-ci se faisait réécraser par le webhook suivant.
function ManualAccessToggle({ orgId, exempt, onDone }: { orgId: string; exempt: boolean; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_exempt", exempt: !exempt }),
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
    <div className="mt-5 flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-4">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-900">Abonnement activé manuellement</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
          {exempt
            ? "L'accès reste ouvert quel que soit le statut Stripe (impayé, résilié). Éteindre pour redonner la main à Stripe."
            : "Ouvre l'accès à Brief même sans paiement, et le garde ouvert quoi que Stripe dise. N'agit pas sur l'abonnement Stripe."}
        </p>
        {error && <p className="mt-1.5 text-[12px] text-rose-700">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={exempt}
        aria-label="Abonnement activé manuellement"
        onClick={toggle}
        disabled={pending}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${exempt ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${exempt ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export default function BillingPanel({ organizationId, billing }: { organizationId: string; billing: OrganizationBilling | null }) {
  const router = useRouter();
  const exempt = billing?.billing_exempt === true;
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Facturation</h2>
        <div className="flex items-center gap-1.5">
          {exempt && (
            <span className="inline-flex items-center rounded-full bg-[color:var(--success-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">
              Accès ouvert manuellement
            </span>
          )}
          {(() => {
            const meta = BILLING_STATUS_META[billing?.billing_status ?? "none"] ?? BILLING_STATUS_META.none;
            return (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${meta.className}`}>
                {meta.label}
              </span>
            );
          })()}
        </div>
      </div>
      {!billing || billing.billing_status === "none" ? (
        <p className="text-[13.5px] text-slate-500">Cette organisation n&apos;a pas encore souscrit d&apos;abonnement.</p>
      ) : (
        <table className="w-full border-collapse text-left text-[13px]">
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Stripe Customer</td>
              <td className="py-2.5 font-mono text-[12px] text-slate-700">{billing.stripe_customer_id ?? "—"}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Stripe Subscription</td>
              <td className="py-2.5 font-mono text-[12px] text-slate-700">{billing.stripe_subscription_id ?? "—"}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Essai jusqu&apos;au</td>
              <td className="py-2.5 tabular-nums text-slate-700">{formatBillingDate(billing.trial_ends_at)}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Période en cours</td>
              <td className="py-2.5 tabular-nums text-slate-700">
                {formatBillingDate(billing.current_period_start)} → {formatBillingDate(billing.current_period_end)}
              </td>
            </tr>
            {billing.grace_period_ends_at && (
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-amber-700">Grâce jusqu&apos;au</td>
                <td className="py-2.5 font-medium tabular-nums text-amber-700">{formatBillingDate(billing.grace_period_ends_at)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <ManualAccessToggle orgId={organizationId} exempt={exempt} onDone={() => router.refresh()} />

      {billing && !exempt && (billing.billing_status === "blocked" || billing.billing_status === "grace_period") && (
        <BillingOverrideActions orgId={organizationId} status={billing.billing_status} onDone={() => router.refresh()} />
      )}
    </div>
  );
}
