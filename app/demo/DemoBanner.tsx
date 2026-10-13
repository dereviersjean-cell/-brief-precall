import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";

// Bandeau permanent des routes /demo.
//
// Non négociable et non masquable : ces écrans ressemblent trait pour trait
// aux vrais, et confondre une démonstration avec ses propres chiffres serait
// le pire défaut possible sur un produit qui sert à juger la performance de
// commerciaux. L'URL le dit déjà, ce bandeau le confirme à l'écran.
export default function DemoBanner() {
  return (
    <div className="border-b border-border bg-[color:var(--warning-soft)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-amber-900">
          <Eye className="mt-[3px] h-3.5 w-3.5 shrink-0 text-amber-700" />
          <span>
            <strong>Démonstration</strong> — données fictives, pour montrer à quoi ressemblent ces écrans une fois
            alimentés. Aucune de ces informations ne vous concerne.
          </span>
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 text-[12px] font-semibold text-amber-800 transition-colors hover:border-amber-300 hover:text-amber-900"
        >
          Revenir à mes données <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
