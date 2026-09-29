"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientMember } from "@/lib/clients-overview";
import type { OrganizationMember, UserRole } from "@/lib/db";

// L'équipe d'un client, telle que l'account manager la suit : qui s'est
// connecté, quel agenda est branché, qui travaille. Les actions reprennent
// celles de l'ancienne fiche organisation (rôle, retrait, ajout, invitation),
// plus « Ouvrir le compte » (impersonation, pour voir exactement ce que voit
// le membre) et le renvoi d'invitation.

function formatDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

function AgendaBadge({ member }: { member: ClientMember }) {
  if (member.status === "invited") return <span className="text-xs text-slate-400">—</span>;
  const styles = {
    connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
    disconnected: "border-red-200 bg-red-50 text-red-700",
    missing: "border-amber-200 bg-amber-50 text-amber-800",
  } as const;
  const labels = {
    connected: "Branché",
    disconnected: member.agendaSince ? `Coupé depuis le ${formatDay(member.agendaSince)}` : "Coupé",
    missing: "Non branché",
  } as const;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${styles[member.agenda]}`}>
      {labels[member.agenda]}
    </span>
  );
}

async function send(url: string, init: RequestInit): Promise<void> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "L'opération a échoué.");
  }
}

// Actions secondaires d'un membre, dans un menu pour ne pas encombrer la
// ligne : désactiver (réversible, bloque la connexion), retirer du client
// (le compte reste), supprimer définitivement (le compte ET tout son
// historique — double confirmation, comme dans Monitoring).
function MemberMenu({
  member,
  disabled,
  onDisable,
  onRestore,
  onRemove,
  onDelete,
}: {
  member: ClientMember;
  disabled: boolean;
  onDisable: () => void;
  onRestore: () => void;
  onRemove: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const item = "w-full text-left px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";
  const pick = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label={`Autres actions pour ${member.name || member.email}`}
        className="px-2 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-50"
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-56 bg-white border border-border rounded-lg shadow-lg z-20 py-1">
            {member.status === "disabled" ? (
              <button onClick={pick(onRestore)} className={`${item} text-slate-700`}>
                Réactiver le compte
              </button>
            ) : (
              <button onClick={pick(onDisable)} className={`${item} text-slate-700`}>
                Désactiver le compte
              </button>
            )}
            <button onClick={pick(onRemove)} className={`${item} text-slate-700`}>
              Retirer du client
            </button>
            <button onClick={pick(onDelete)} className={`${item} text-red-600 hover:bg-red-50`}>
              Supprimer définitivement
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TeamPanel({
  organizationId,
  members,
  availableUsers,
}: {
  organizationId: string;
  members: ClientMember[];
  availableUsers: OrganizationMember[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function run(id: string, action: () => Promise<void>, success?: string) {
    setBusyId(id);
    setMessage(null);
    try {
      await action();
      if (success) setMessage({ tone: "ok", text: success });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "L'opération a échoué." });
    } finally {
      setBusyId(null);
    }
  }

  function changeRole(member: ClientMember, role: UserRole) {
    if (member.role === role) return;
    if (member.linksCount > 0 && !window.confirm(`${member.name || member.email} a ${member.linksCount} liaison(s) manager ↔ commercial. Changer son rôle les supprimera. Confirmer ?`)) {
      return;
    }
    void run(member.id, () =>
      send(`/api/admin/organizations/${organizationId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, role }),
      })
    );
  }

  function remove(member: ClientMember) {
    if (!window.confirm(`Retirer ${member.name || member.email} de ce client ?`)) return;
    void run(member.id, () => send(`/api/admin/organizations/${organizationId}/members/${member.id}`, { method: "DELETE" }));
  }

  function disable(member: ClientMember) {
    if (!window.confirm(`Désactiver ${member.name || member.email} ? Il ne pourra plus se connecter ; ses données sont conservées et le compte peut être réactivé.`)) return;
    void run(member.id, () => send(`/api/admin/users/${member.id}?mode=soft`, { method: "DELETE" }), "Compte désactivé.");
  }

  function restore(member: ClientMember) {
    void run(member.id, () => send(`/api/admin/users/${member.id}/restore`, { method: "POST" }), "Compte réactivé.");
  }

  function hardDelete(member: ClientMember) {
    const who = member.name || member.email;
    if (!window.confirm(`Supprimer définitivement ${who} ? Tout son historique (briefs, calls, analyses…) est effacé, sans retour possible.`)) return;
    if (!window.confirm(`Dernière confirmation : supprimer définitivement ${member.email} ?`)) return;
    void run(member.id, () => send(`/api/admin/users/${member.id}?mode=hard`, { method: "DELETE" }), `${who} a été supprimé.`);
  }

  function resendInvitation(member: ClientMember) {
    void run(
      member.id,
      () => send(`/api/admin/users/${member.id}/resend-invitation`, { method: "POST" }),
      `Invitation renvoyée à ${member.email}.`
    );
  }

  async function openAccount(member: ClientMember) {
    if (!window.confirm(`Ouvrir Brief dans le compte de ${member.name || member.email} ? Vous verrez exactement ce qu'il voit.`)) return;
    setBusyId(member.id);
    try {
      await send("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id }),
      });
      window.location.href = "/brief";
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Impossible d'ouvrir le compte." });
      setBusyId(null);
    }
  }

  // Ajout : invitation par email, ou rattachement d'un utilisateur existant.
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("commercial");
  const [attachId, setAttachId] = useState("");
  const [attachRole, setAttachRole] = useState<UserRole>("commercial");

  function invite() {
    const email = inviteEmail.trim();
    if (!email) return;
    void run(
      "invite",
      async () => {
        await send("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name: inviteName.trim() || undefined, role: inviteRole, organizationId }),
        });
        setInviteEmail("");
        setInviteName("");
      },
      `Invitation envoyée à ${email}.`
    );
  }

  function attach() {
    if (!attachId) return;
    void run("attach", async () => {
      await send(`/api/admin/organizations/${organizationId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: attachId, role: attachRole }),
      });
      setAttachId("");
    });
  }

  const input = "px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]/20";

  return (
    <section className="bg-white rounded-2xl border border-border p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Équipe</h2>
        <span className="text-xs text-slate-400">{members.length} membre{members.length > 1 ? "s" : ""}</span>
      </div>

      {/* Pas de largeur minimale ni de défilement horizontal : la colonne
          d'actions était poussée hors de vue dans la colonne gauche de la
          fiche (constaté le 29/09/2026). Connexion et activité partagent une
          colonne, les actions s'empilent. */}
      <div className="-mx-6">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col />
            <col className="w-[120px]" />
            <col className="w-[150px]" />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/60 text-left">
              {["Membre", "Rôle", "Activité", "Agenda", ""].map((h, i) => (
                <th key={i} className={`py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${i === 0 ? "pl-6 pr-3" : "px-3"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-b-0 align-top">
                <td className="pl-6 pr-3 py-3 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{m.name || "—"}</p>
                  <p className="text-xs text-slate-400 truncate" title={m.email}>
                    {m.email}
                  </p>
                  {m.status === "invited" && <p className="text-[11px] font-medium text-amber-700 mt-0.5">Invitation en attente</p>}
                  {m.status === "disabled" && <p className="text-[11px] font-medium text-slate-500 mt-0.5">Compte désactivé</p>}
                </td>
                <td className="px-3 py-3">
                  <select
                    value={m.role ?? ""}
                    disabled={busyId !== null}
                    onChange={(e) => changeRole(m, e.target.value as UserRole)}
                    className="w-full px-2 py-1 border border-border rounded-lg text-xs bg-white disabled:opacity-50"
                  >
                    <option value="commercial">Commercial</option>
                    <option value="manager">Manager</option>
                  </select>
                </td>
                <td className="px-3 py-3">
                  {m.status === "invited" ? (
                    <p className="text-xs text-slate-400">—</p>
                  ) : (
                    <>
                      <p className="text-slate-700">{m.lastSeenAt ? `Vu le ${formatDay(m.lastSeenAt)}` : "Pas vu récemment"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {m.calls7d} call{m.calls7d > 1 ? "s" : ""} · {m.briefs7d} brief{m.briefs7d > 1 ? "s" : ""} sur 7 j
                      </p>
                    </>
                  )}
                </td>
                <td className="px-3 py-3">
                  <AgendaBadge member={m} />
                </td>
                <td className="px-3 pr-6 py-3 text-right">
                  <div className="flex flex-col items-end gap-1.5">
                    {m.status === "invited" && (
                      <button onClick={() => resendInvitation(m)} disabled={busyId !== null} className="text-xs font-medium text-[color:var(--violet)] hover:underline disabled:opacity-50">
                        Renvoyer l&apos;invitation
                      </button>
                    )}
                    {m.status === "active" && (
                      <button onClick={() => void openAccount(m)} disabled={busyId !== null} className="text-xs font-medium text-[color:var(--violet)] hover:underline disabled:opacity-50">
                        Ouvrir le compte
                      </button>
                    )}
                    <MemberMenu
                      member={m}
                      disabled={busyId !== null}
                      onDisable={() => disable(m)}
                      onRestore={() => restore(m)}
                      onRemove={() => remove(m)}
                      onDelete={() => hardDelete(m)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                  Aucun membre : invitez le premier ci-dessous.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {message && <p className={`mt-4 text-xs ${message.tone === "ok" ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>}

      <div className="mt-5 grid gap-4 lg:grid-cols-2 border-t border-slate-100 pt-5">
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2">Inviter un membre</p>
          <div className="flex flex-wrap gap-2">
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email" className={`${input} flex-1 min-w-[180px]`} />
            <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nom (facultatif)" className={`${input} flex-1 min-w-[140px]`} />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} className={input}>
              <option value="commercial">Commercial</option>
              <option value="manager">Manager</option>
            </select>
            <button onClick={invite} disabled={busyId !== null || !inviteEmail.trim()} className="px-4 py-2 brand-gradient text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-50">
              Inviter
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Un email d&apos;invitation part aussitôt.</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2">Rattacher un compte existant</p>
          <div className="flex flex-wrap gap-2">
            <select value={attachId} onChange={(e) => setAttachId(e.target.value)} className={`${input} flex-1 min-w-[220px]`}>
              <option value="">{availableUsers.length ? "Choisir un utilisateur sans client…" : "Aucun utilisateur sans client"}</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} — ${u.email}` : u.email}
                </option>
              ))}
            </select>
            <select value={attachRole} onChange={(e) => setAttachRole(e.target.value as UserRole)} className={input}>
              <option value="commercial">Commercial</option>
              <option value="manager">Manager</option>
            </select>
            <button onClick={attach} disabled={busyId !== null || !attachId} className="px-4 py-2 border border-border text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
              Rattacher
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
