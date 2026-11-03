"use client";

import CompanyLogo from "@/app/components/CompanyLogo";
import type { DealProgress } from "@/lib/deal-progress";
import { nameHue } from "@/app/components/PersonPhoto";

// Le logo de l'entreprise d'un deal (trouvé par le serveur, app/api/company-logo),
// sinon son initiale sur une teinte propre au deal.
export default function DealAvatar({ d, size }: { d: Pick<DealProgress, "name" | "domain">; size: 34 | 46 }) {
  const h = nameHue(d.name);
  return (
    <CompanyLogo
      domain={d.domain}
      name={d.name}
      alt={d.name}
      className={`${size > 40 ? "h-[46px] w-[46px]" : "h-[34px] w-[34px]"} shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-stone-200`}
      fallback={
        <span
          className="grid shrink-0 place-items-center rounded-xl font-semibold"
          style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${h} 70% 94%)`, color: `hsl(${h} 55% 32%)` }}
        >
          {d.name.charAt(0).toUpperCase()}
        </span>
      }
    />
  );
}
