"use client";

import type { UserRole } from "@/lib/db";

export function formatAdminDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function CrmBadge({ provider }: { provider: string }) {
  const label = provider === "pipedrive" ? "Pipedrive" : provider === "hubspot" ? "HubSpot" : provider;
  const color =
    provider === "pipedrive"
      ? "bg-green-100 text-green-700"
      : provider === "hubspot"
      ? "bg-orange-100 text-orange-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole | null }) {
  if (!role) return <span className="text-slate-300 text-xs">—</span>;
  const label = role === "manager" ? "Manager" : "Commercial";
  const color = role === "manager" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
