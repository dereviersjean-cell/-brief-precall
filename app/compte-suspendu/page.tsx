import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getEffectiveUserId } from "@/lib/session-user";
import { getUserRole } from "@/lib/db";

export default async function AccountSuspendedPage() {
  const userId = await getEffectiveUserId();
  const role = userId ? await getUserRole(userId) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-red-200/40 via-amber-200/30 to-transparent blur-3xl"
          />
          <div className="relative">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Accès suspendu</h1>

            {role === "manager" ? (
              <>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Le paiement de l&apos;abonnement de votre organisation a échoué et la fenêtre de grâce est
                  dépassée. Mettez à jour votre moyen de paiement pour réactiver l&apos;accès.
                </p>
                <Link
                  href="/settings/billing"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 px-5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors mt-5"
                >
                  Régulariser mon abonnement
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                L&apos;abonnement de votre organisation n&apos;est plus à jour. Contactez votre manager pour
                régulariser la situation et réactiver l&apos;accès.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
