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
    <th className={`px-4 py-2.5 text-${align === "right" ? "right" : "left"}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.07em] transition-colors ${
          active ? "text-[color:var(--violet)]" : "text-slate-500 hover:text-slate-900"
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">
              <Users className="h-3.5 w-3.5" />
              Pilotage d&apos;équipe
            </span>
            <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">Équipe</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
              Gérez les {overview.length} {overview.length === 1 ? "commercial" : "commerciaux"} de votre équipe — pour la performance, direction l&apos;onglet Performance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:shrink-0">
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={!hasOrganization}
              title={
                hasOrganization
                  ? undefined
                  : "Vous devez être rattaché à une organisation pour inviter un collaborateur."
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <UserPlus className="h-4 w-4" />
              Inviter un collaborateur
            </button>
            <button
              onClick={() => setShowManageModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110"
            >
              <Settings2 className="h-4 w-4" />
              Gérer mon équipe
            </button>
          </div>
        </div>
      </FadeIn>

      {/* Commercials table */}
      {overview.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--lavender)]">
            <Users className="h-5 w-5 text-[color:var(--violet)]" strokeWidth={1.75} />
          </div>
          <p className="text-[14px] font-semibold text-slate-900">Aucun commercial rattaché à votre équipe pour l&apos;instant</p>
        </div>
      ) : (
        <>
          <div className="relative mb-4 w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un commercial…"
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-[color:var(--violet)] focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]/20"
            />
          </div>

          {filteredOverview.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
              <p className="text-[13px] text-slate-500">Aucun résultat pour « {query} ».</p>
            </div>
          ) : (
            <FadeIn delay={0.1}>
              {actionMessage && (
                <div
                  className={`mb-3 rounded-xl px-4 py-2.5 text-[13px] ${
                    actionMessage.kind === "ok"
                      ? "bg-[color:var(--success-soft)] text-emerald-700"
                      : "bg-[color:var(--danger-soft)] text-rose-700"
                  }`}
                >
                  {actionMessage.text}
                </div>
              )}
              <div className="overflow-hidden rounded-2xl border border-border bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border-collapse stacked-table sm:min-w-[520px]">
                    <thead>
                      <tr className="border-b border-border">
                        <SortHeader label="Nom" sortKey="name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                        <SortHeader label="Dernière activité" sortKey="activity" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                        {/* Distincte de l'activité : un commercial peut se connecter
                            sans générer ni brief ni call (migration 018). */}
                        <th className="px-4 py-2.5 text-left">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Dernière connexion</span>
                        </th>
                        <th className="px-4 py-2.5 text-right">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Performance</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOverview.map((c) => (
                        <tr
                          key={c.user_id}
                          onClick={isPending(c) ? undefined : () => router.push(`/team/${c.user_id}`)}
                          className={`border-b border-border last:border-b-0 transition-colors group ${
                            isPending(c)
                              ? ""
                              : "hover:bg-slate-50 cursor-pointer"
                          }`}
                        >
                          <td className="px-4 py-3 max-w-[280px]">
                            <div className="flex items-center gap-3">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--lavender)]">
                                <span className="text-[12px] font-semibold text-[color:var(--violet)]">
                                  {(c.name ?? c.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium text-slate-900 transition-colors group-hover:text-[color:var(--violet)]">
                                  {c.name || "—"}
                                </p>
                                <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{c.email}</p>
                                {c.calendar_disconnected && (
                                  <span
                                    title="Plus aucune réunion n'est enregistrée tant que l'agenda n'est pas reconnecté (Paramètres > Connexions)."
                                    className="mt-1 inline-flex items-center rounded-full bg-[color:var(--danger-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-rose-700"
                                  >
                                    Agenda déconnecté
                                    {c.calendar_disconnected_at ? ` depuis le ${formatDate(c.calendar_disconnected_at)}` : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td data-label="Dernière activité" className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-600">
                            {isPending(c) ? (
                              <span className="inline-flex items-center rounded-full bg-[color:var(--warning-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-amber-700">
                                Invitation en attente
                              </span>
                            ) : (
                              formatDate(c.last_activity_at)
                            )}
                          </td>
                          <td data-label="Dernière connexion" className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-600">
                            {isPending(c) ? "—" : formatDate(c.last_seen_at)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {isPending(c) ? (
                              <div className="inline-flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void resendInvitation(c.user_id, c.email);
                                  }}
                                  disabled={busyId === c.user_id}
                                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--violet)] hover:underline disabled:opacity-50 disabled:no-underline"
                                >
                                  <Send className="w-3 h-3" /> Renvoyer l&apos;invitation
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void cancelInvitation(c.user_id, c.email);
                                  }}
                                  disabled={busyId === c.user_id}
                                  className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-rose-700 disabled:opacity-50"
                                >
                                  <X className="w-3 h-3" /> Annuler
                                </button>
                              </div>
                            ) : (
                              <Link
                                href={`/dashboard?commercial=${c.user_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--violet)] hover:underline"
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
