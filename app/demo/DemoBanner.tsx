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
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
        <p className="flex items-center gap-2 text-[12.5px] text-amber-900">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Démonstration</strong> — données fictives, pour montrer à quoi ressemblent ces écrans une fois
            alimentés. Aucune de ces informations ne vous concerne.
          </span>
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[12px] font-medium text-amber-800 hover:bg-amber-100"
        >
          Revenir à mes données <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
