"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Organization, OrganizationMember, UserRole } from "@/lib/db";
import { AdminNav } from "@/app/admin/AdminNav";
import { RoleBadge } from "@/app/admin/dashboard/AdminBadges";

type MemberRow = OrganizationMember & { pending: boolean; error: string | null };

export default function OrganizationDetailClient({
  organization,
  initialMembers,
  availableUsers,
}: {
  organization: Organization;
  initialMembers: OrganizationMember[];
  availableUsers: OrganizationMember[];
}) {
  const router = useRouter();

  const [members, setMembers] = useState<MemberRow[]>(
    initialMembers.map((m) => ({ ...m, pending: false, error: null }))
  );
  useEffect(() => {
    setMembers(initialMembers.map((m) => ({ ...m, pending: false, error: null })));
  }, [initialMembers]);

  // Inline org name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(organization.name);
  useEffect(() => setNameValue(organization.name), [organization.name]);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === organization.name) {
      setEditingName(false);
      setNameValue(organization.name);
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors du renommage.");
      }
      setEditingName(false);
      router.refresh();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Erreur lors du renommage.");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleRoleChange(member: MemberRow, role: UserRole) {
    const previousRole = member.role;

    if (previousRole && previousRole !== role && member.links_count > 0) {
      const noun =
        previousRole === "manager"
          ? member.links_count > 1
            ? "commerciaux"
            : "commercial"
          : member.links_count > 1
          ? "managers"
          : "manager";
      const confirmed = window.confirm(
        `Cet utilisateur est actuellement lié à ${member.links_count} ${noun}. Changer son rôle supprimera ces liaisons. Confirmer ?`
      );
      if (!confirmed) return;
    }

    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role, pending: true, error: null } : m)));
    try {
      const res = await fetch(`/api/admin/organizations/${organization.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors du changement de rôle.");
      }
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, pending: false } : m)));
      router.refresh();
    } catch (err) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? { ...m, role: previousRole, pending: false, error: err instanceof Error ? err.message : "Erreur." }
            : m
        )
      );
    }
  }

  async function handleRemove(member: MemberRow) {
    if (!window.confirm(`Retirer ${member.name || member.email} de l'organisation ?`)) return;
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, pending: true, error: null } : m)));
    try {
      const res = await fetch(`/api/admin/organizations/${organization.id}/members/${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors du retrait.");
      }
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      router.refresh();
    } catch (err) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, pending: false, error: err instanceof Error ? err.message : "Erreur." } : m
        )
      );
    }
  }

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("commercial");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAddMember() {
    if (!selectedUserId) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${organization.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de l'ajout.");
      }
      setSelectedUserId("");
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Erreur lors de l'ajout.");
    } finally {
      setAddLoading(false);
    }
  }

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("commercial");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: inviteName.trim() || undefined,
          role: inviteRole,
          organizationId: organization.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la création.");
      }
      setInviteSuccess(`Invitation envoyée à ${email}`);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("commercial");
      router.refresh();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setInviteLoading(false);
    }
  }

  const [deleteOrgLoading, setDeleteOrgLoading] = useState(false);
  const [deleteOrgError, setDeleteOrgError] = useState<string | null>(null);

  async function handleDeleteOrganization() {
    if (members.length > 0) return;
    if (!window.confirm(`Supprimer l'organisation "${organization.name}" ?`)) return;

    setDeleteOrgLoading(true);
    setDeleteOrgError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${organization.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la suppression.");
      }
      router.push("/admin/organizations");
    } catch (err) {
      setDeleteOrgError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      setDeleteOrgLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] ml-48">
      <AdminNav />
      <div className="py-10 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link
            href="/admin/organizations"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Retour aux organisations
          </Link>

          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  autoFocus
                  className="text-2xl font-bold text-slate-900 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setEditingName(false);
                      setNameValue(organization.name);
                    }
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameValue(organization.name);
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <h1
                onClick={() => setEditingName(true)}
                className="text-2xl font-bold text-slate-900 inline-flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                title="Cliquer pour renommer"
              >
                {organization.name}
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </h1>
            )}
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Membres ({members.length})</h2>
            {members.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Aucun membre dans cette organisation.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                      <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                      <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rôle</th>
                      <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 text-slate-800 font-medium max-w-[180px] truncate">{m.name || "—"}</td>
                        <td className="py-3 pr-4 text-slate-500 max-w-[220px] truncate">{m.email}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <RoleBadge role={m.role} />
                            <select
                              value={m.role ?? ""}
                              disabled={m.pending}
                              onChange={(e) => handleRoleChange(m, e.target.value as UserRole)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 disabled:opacity-50"
                            >
                              <option value="commercial">Commercial</option>
                              <option value="manager">Manager</option>
                            </select>
                          </div>
                          {m.error && <p className="text-xs text-red-500 mt-1">{m.error}</p>}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleRemove(m)}
                            disabled={m.pending}
                            className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                          >
                            Retirer de l&apos;organisation
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Ajouter un membre</h2>
            {availableUsers.length === 0 ? (
              <p className="text-slate-400 text-sm">
                Aucun utilisateur disponible — tous sont déjà rattachés à une organisation.
              </p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 min-w-[240px] text-slate-700"
                >
                  <option value="">Choisir un utilisateur…</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
                >
                  <option value="commercial">Commercial</option>
                  <option value="manager">Manager</option>
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUserId || addLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
            )}
            {addError && <p className="text-xs text-red-600 mt-2">{addError}</p>}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Créer et inviter un nouveau membre</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@entreprise.com"
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 min-w-[220px] text-slate-700"
              />
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nom (optionnel)"
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 min-w-[180px] text-slate-700"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              >
                <option value="commercial">Commercial</option>
                <option value="manager">Manager</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Créer et envoyer l&apos;invitation
              </button>
            </div>
            {inviteError && <p className="text-xs text-red-600 mt-2">{inviteError}</p>}
            {inviteSuccess && <p className="text-xs text-emerald-600 mt-2">{inviteSuccess}</p>}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Zone dangereuse</h2>
            <p className="text-xs text-slate-400 mb-4">
              La suppression est définitive et impossible tant que l&apos;organisation a des membres.
            </p>
            <button
              onClick={handleDeleteOrganization}
              disabled={members.length > 0 || deleteOrgLoading}
              title={
                members.length > 0
                  ? "Retirez d'abord tous les membres de l'organisation pour pouvoir la supprimer."
                  : undefined
              }
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              Supprimer l&apos;organisation
            </button>
            {deleteOrgError && <p className="text-xs text-red-600 mt-2">{deleteOrgError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
