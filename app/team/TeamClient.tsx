"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronUp, ChevronDown, Users, UserPlus, Settings2, ArrowUpRight, Send, X } from "lucide-react";
import type { TeamOverviewItem } from "@/lib/db";
import { isPendingInvitation } from "@/lib/team-invitation";
import FadeIn from "@/app/dashboard/FadeIn";
import ManageTeamModal from "./ManageTeamModal";
import InviteCommercialModal from "./InviteCommercialModal";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

type SortKey = "name" | "activity";
type SortDirection = "asc" | "desc";

// Un membre invité qui ne s'est jamais connecté n'a rien à montrer dans les
// colonnes d'activité et de performance. La ligne propose à la place les deux
// seules actions qui ont du sens sur lui : relancer, ou annuler. La définition
// vit dans lib/team-invitation.ts, partagée avec les routes qui exécutent ces
// deux actions.
const isPending = isPendingInvitation;

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDirection: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentSort === sortKey;
  return (
    <th className={`px-4 py-3 text-${align === "right" ? "right" : "left"}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
          active ? "text-[color:var(--violet)]" : "text-slate-400 hover:text-slate-600"
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        {active &&
          (currentDirection === "asc" ? (
            <ChevronUp className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ))}
      </button>
    </th>
  );
}

// Pilotage pur : composition de l'équipe, invitations, gestion des
// rattachements. Les scores et statistiques détaillées ont leur propre
// onglet (Performance) — cette page n'en affiche plus (25/07/2026).
export default function TeamClient({
  overview,
  hasOrganization,
}: {
  overview: TeamOverviewItem[];
  hasOrganization: boolean;
}) {
  const router = useRouter();
  const [showManageModal, setShowManageModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  // Actions sur une invitation en attente. `busyId` désarme les deux boutons de
  // la ligne concernée seulement — pas de toute la table.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function resendInvitation(userId: string, email: string) {
    setBusyId(userId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/team/${userId}/resend-invitation`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "L'envoi a échoué.");
      setActionMessage({ kind: "ok", text: `Invitation renvoyée à ${email}.` });
    } catch (err) {
      setActionMessage({ kind: "error", text: err instanceof Error ? err.message : "L'envoi a échoué." });
    } finally {
      setBusyId(null);
    }
  }

  async function cancelInvitation(userId: string, email: string) {
    if (!window.confirm(`Annuler l'invitation de ${email} ? Le compte sera supprimé et le siège libéré.`)) return;
    setBusyId(userId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/team/${userId}/invitation`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "L'annulation a échoué.");
      setActionMessage({ kind: "ok", text: `Invitation de ${email} annulée.` });
      router.refresh();
    } catch (err) {
      setActionMessage({ kind: "error", text: err instanceof Error ? err.message : "L'annulation a échoué." });
    } finally {
      setBusyId(null);
    }
  }

  function handleCloseManageModal() {
    setShowManageModal(false);
    router.refresh();
  }

  function handleCloseInviteModal() {
    setShowInviteModal(false);
    router.refresh();
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "asc" : "desc");
    }
  }

  const filteredOverview = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matching = trimmed
      ? overview.filter(
          (c) => (c.name ?? "").toLowerCase().includes(trimmed) || c.email.toLowerCase().includes(trimmed)
        )
      : overview;

    const sorted = [...matching].sort((a, b) => {
      const cmp =
        sortKey === "name"
          ? (a.name ?? a.email).localeCompare(b.name ?? b.email)
          : (a.last_activity_at ?? "").localeCompare(b.last_activity_at ?? "");
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [overview, query, sortKey, sortDirection]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-sm)] bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-[color:var(--lavender-strong)]/60 via-[color:var(--lavender)]/40 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-100/40 to-transparent blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--violet)] bg-[color:var(--lavender)] px-2.5 py-1 rounded-full mb-3">
                <Users className="w-3 h-3" />
                Pilotage d&apos;équipe
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Équipe</h1>
              <p className="text-slate-500 text-sm mt-1">
                Gérez les {overview.length} {overview.length === 1 ? "commercial" : "commerciaux"} de votre équipe — pour la performance, direction l&apos;onglet Performance.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowInviteModal(true)}
                disabled={!hasOrganization}
                title={
                  hasOrganization
                    ? undefined
                    : "Vous devez être rattaché à une organisation pour inviter un collaborateur."
                }
                className="inline-flex items-center gap-2 h-9 px-3.5 bg-white border border-border text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                <UserPlus className="w-4 h-4" />
                Inviter un collaborateur
              </button>
              <button
                onClick={() => setShowManageModal(true)}
                className="inline-flex items-center gap-2 h-9 px-3.5 brand-gradient text-white rounded-lg text-sm font-medium shadow-[var(--shadow-sm)] hover:brightness-110 hover:shadow-[var(--shadow-md)] transition-all duration-200"
              >
                <Settings2 className="w-4 h-4" />
                Gérer mon équipe
              </button>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Commercials table */}
      {overview.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
          <div className="w-12 h-12 bg-[color:var(--lavender)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-[color:var(--violet)]" strokeWidth={1.5} />
          </div>
          <p className="text-slate-700 font-medium">Aucun commercial rattaché à votre équipe pour l&apos;instant</p>
        </div>
      ) : (
        <>
          <div className="relative mb-4 w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un commercial…"
              className="pl-9 pr-3.5 py-2 border border-border rounded-lg text-sm text-slate-700 bg-white w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
            />
          </div>

          {filteredOverview.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
              <p className="text-slate-500 text-sm">Aucun résultat pour « {query} ».</p>
            </div>
          ) : (
            <FadeIn delay={0.1}>
              {actionMessage && (
                <div
                  className={`mb-3 rounded-lg border px-4 py-2.5 text-sm ${
                    actionMessage.kind === "ok"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {actionMessage.text}
                </div>
              )}
              <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[520px]">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/60">
                        <SortHeader label="Nom" sortKey="name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                        <SortHeader label="Dernière activité" sortKey="activity" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                        <th className="px-4 py-3 text-right">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Performance</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOverview.map((c) => (
                        <tr
                          key={c.user_id}
                          onClick={isPending(c) ? undefined : () => router.push(`/team/${c.user_id}`)}
                          className={`border-b border-slate-100 last:border-b-0 transition-colors group ${
                            isPending(c)
                              ? ""
                              : "hover:bg-[color:var(--lavender)]/50 cursor-pointer"
                          }`}
                        >
                          <td className="px-4 py-3.5 max-w-[280px]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br brand-gradient flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-white">
                                  {(c.name ?? c.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 text-sm truncate group-hover:text-[color:var(--violet)] transition-colors">
                                  {c.name || "—"}
                                </p>
                                <p className="text-slate-400 text-xs truncate">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                            {isPending(c) ? (
                              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Invitation en attente
                              </span>
                            ) : (
                              formatDate(c.last_activity_at)
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            {isPending(c) ? (
                              <div className="inline-flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void resendInvitation(c.user_id, c.email);
                                  }}
                                  disabled={busyId === c.user_id}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--violet)] hover:underline disabled:opacity-50 disabled:no-underline"
                                >
                                  <Send className="w-3 h-3" /> Renvoyer l&apos;invitation
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void cancelInvitation(c.user_id, c.email);
                                  }}
                                  disabled={busyId === c.user_id}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
                                >
                                  <X className="w-3 h-3" /> Annuler
                                </button>
                              </div>
                            ) : (
                              <Link
                                href={`/dashboard?commercial=${c.user_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--violet)] hover:underline"
                              >
                                Voir la performance <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </FadeIn>
          )}
        </>
      )}

      {showManageModal && <ManageTeamModal onClose={handleCloseManageModal} />}
      {showInviteModal && <InviteCommercialModal onClose={handleCloseInviteModal} />}
    </div>
  );
}
