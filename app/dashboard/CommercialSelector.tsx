"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import type { LinkedUser } from "@/lib/db";

// Manager only — bascule entre la vue équipe (défaut) et la vue individuelle
// d'un commercial précis, via le query param ?commercial=<id> lu par
// app/dashboard/page.tsx. La liste vient de getCommercialsForManager, déjà
// scopée aux commerciaux liés à ce manager — pas de vérif supplémentaire
// nécessaire côté client.
export default function CommercialSelector({
  commercials,
  selectedId,
}: {
  commercials: LinkedUser[];
  selectedId: string | null;
}) {
  const router = useRouter();

  if (commercials.length === 0) return null;

  return (
    <div className="mb-5 inline-flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-2 shadow-[var(--shadow-xs)]">
      <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <label htmlFor="commercial-selector" className="text-[12.5px] text-slate-500 shrink-0">
        Vue :
      </label>
      <select
        id="commercial-selector"
        value={selectedId ?? ""}
        onChange={(e) => {
          const value = e.target.value;
          router.push(value ? `/dashboard?commercial=${value}` : "/dashboard");
        }}
        className="text-[13px] font-medium text-slate-900 bg-transparent outline-none cursor-pointer pr-1"
      >
        <option value="">Équipe</option>
        {commercials.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name ?? c.email}
          </option>
        ))}
      </select>
    </div>
  );
}
