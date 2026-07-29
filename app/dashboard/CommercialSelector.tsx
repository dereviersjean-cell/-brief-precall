"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import type { LinkedUser } from "@/lib/db";
import Dropdown from "@/app/components/ui/Dropdown";

// Manager only — bascule entre la vue équipe (défaut) et la vue individuelle
// d'un commercial précis, via le query param ?commercial=<id>. Présent sur les
// onglets de statistiques de Performance ; conserve l'onglet courant en
// réutilisant usePathname plutôt qu'une route fixe. La liste vient de
// getCommercialsForManager, déjà scopée aux commerciaux liés à ce manager —
// pas de vérif supplémentaire nécessaire côté client.
export default function CommercialSelector({
  commercials,
  selectedId,
}: {
  commercials: LinkedUser[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (commercials.length === 0) return null;

  // Les autres paramètres de la page (notamment le filtre de période
  // ?period=/from=/to=) doivent survivre au changement de commercial — sinon
  // on repart sur la période par défaut à chaque bascule.
  function hrefFor(value: string): string {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("commercial", value);
    else params.delete("commercial");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <Dropdown
      className="mb-5"
      ariaLabel="Vue équipe ou commercial"
      icon={<Users className="h-3.5 w-3.5" />}
      prefix="Vue :"
      value={selectedId ?? ""}
      onChange={(value) => router.push(hrefFor(value))}
      options={[
        { value: "", label: "Équipe" },
        ...commercials.map((c) => ({ value: c.id, label: c.name ?? c.email })),
      ]}
    />
  );
}
