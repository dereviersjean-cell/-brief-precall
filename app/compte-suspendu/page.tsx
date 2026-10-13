import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getEffectiveUserId } from "@/lib/session-user";
import { getUserRole, getOrganizationForUser, getOrganizationBillingRow } from "@/lib/db";

export default async function AccountSuspendedPage() {
  const userId = await getEffectiveUserId();
  const role = userId ? await getUserRole(userId) : null;

  let isCanceled = false;
  if (userId) {
    const organization = await getOrganizationForUser(userId);
    if (organization) {
      const billing = await getOrganizationBillingRow(organization.id);
      isCanceled = billing?.billing_status === "canceled";
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-white px-6 py-10 text-center sm:px-8">
          <div>
            <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--danger-soft)]">
              <ShieldAlert className="h-5 w-5 text-rose-700" strokeWidth={1.75} />
            </div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Accès suspendu</h1>

            {role === "manager" ? (
              <>
                <p className="text-[14px] text-slate-500 mt-2 leading-relaxed">
                  {isCanceled
                    ? "L'abonnement de votre organisation a été résilié. Réabonnez-vous pour réactiver l'accès."
                    : "Le paiement de l'abonnement de votre organisation a échoué et la fenêtre de grâce est dépassée. Mettez à jour votre moyen de paiement pour réactiver l'accès."}
                </p>
                <Link
                  href="/settings/billing"
                  className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-5 text-[14px] font-medium text-white hover:brightness-110 transition"
                >
                  {isCanceled ? "Me réabonner" : "Régulariser mon abonnement"}
                </Link>
              </>
            ) : (
              <p className="text-[14px] text-slate-500 mt-2 leading-relaxed">
                {isCanceled
                  ? "L'abonnement de votre organisation a été résilié. Contactez votre manager pour vous réabonner et réactiver l'accès."
                  : "L'abonnement de votre organisation n'est plus à jour. Contactez votre manager pour régulariser la situation et réactiver l'accès."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
