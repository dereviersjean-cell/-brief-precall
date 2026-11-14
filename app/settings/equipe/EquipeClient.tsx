"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrgTeam, OrgTeamMember } from "@/lib/db";
import { isPendingInvitation } from "@/lib/team-invitation";
import PersonPhoto from "@/app/components/PersonPhoto";
import InviteCommercialModal from "@/app/team/InviteCommercialModal";

function label(m: OrgTeamMember): string {
  return m.name ?? m.email;
}

// Ce qui compte d'abord sur une ligne : l'invitation acceptée ou non, puis
// l'agenda — sans agenda relié, les rendez-vous du commercial ne sont ni
// préparés ni enregistrés.
function Status({ m }: { m: OrgTeamMember }) {
  if (isPendingInvitation(m))
    return (
      <span className="text-[12.5px] font-medium text-[color:var(--violet)]">{m.hasActivity ? "Jamais connecté à Brief" : "Invitation en attente"}</span>
    );
  return m.calendarConnected ? (
    <span className="text-[12.5px] text-emerald-700">Agenda connecté</span>
  ) : (
    <span className="text-[12.5px] text-amber-700">Agenda non connecté</span>
  );
}

// Paramètres › Équipe en tableau (maquette H1 A, choisie par Jean le
// 14/11/2026 ; la version « une carte par manager » du 05/11 est dans
// l'historique git). Une ligne par personne : rôle, managers, agenda, et les
// actions du manager connecté sur sa propre équipe (les routes /api/team/*
// n'acceptent que ses propres liens — décision F4 : le manager gère son
// équipe).
export default function EquipeClient({ team, viewerId }: { team: OrgTeam; viewerId: string }) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const mine = team.managers.find((m) => m.id === viewerId);
  const myIds = new Set(mine?.commercialIds ?? []);
  const managersOf = (id: string) => team.managers.filter((m) => m.commercialIds.includes(id)).map((m) => label(team.members[m.id]).split(" ")[0]);
  // Les managers d'abord (soi en premier), puis les commerciaux par nom.
  const people = Object.values(team.members).sort(
    (a, b) =>
      Number(b.id === viewerId) - Number(a.id === viewerId) ||
      Number(b.role === "manager") - Number(a.role === "manager") ||
      label(a).localeCompare(label(b), "fr")
  );
  const managerCount = people.filter((m) => m.role === "manager").length;

  async function act(id: string, url: string, init: RequestInit, ok: string, fallback: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(url, init);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? fallback);
      setMessage({ kind: "ok", text: ok });
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : fallback });
    } finally {
      setBusyId(null);
    }
  }

  const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const link = (m: OrgTeamMember) =>
    act(m.id, "/api/team/link", json({ commercialId: m.id }), `${label(m)} rejoint votre équipe.`, "Le rattachement a échoué.");
  const unlink = (m: OrgTeamMember) => {
    if (!window.confirm(`Retirer ${label(m)} de votre équipe ? Son compte reste actif ; vous ne suivrez plus ses deals.`)) return;
    act(m.id, "/api/team/unlink", json({ commercialId: m.id }), `${label(m)} ne fait plus partie de votre équipe.`, "Le retrait a échoué.");
  };
  const resend = (m: OrgTeamMember) =>
    act(m.id, `/api/team/${m.id}/resend-invitation`, { method: "POST" }, `Invitation renvoyée à ${m.email}.`, "L'envoi a échoué.");
  const cancel = (m: OrgTeamMember) => {
    if (!window.confirm(`Annuler l'invitation de ${m.email} ? Le compte sera supprimé et le siège libéré.`)) return;
    act(m.id, `/api/team/${m.id}/invitation`, { method: "DELETE" }, `Invitation de ${m.email} annulée.`, "L'annulation a échoué.");
  };

  const action = "text-[13px] font-medium text-[color:var(--violet)] hover:underline disabled:opacity-50";

  const COLS = "sm:grid-cols-[minmax(0,2fr)_110px_minmax(0,1.2fr)_150px_minmax(0,1.6fr)]";
  const muted = "text-[13px] font-medium text-slate-500 hover:text-rose-700 disabled:opacity-50";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] text-slate-600">
          <strong className="text-slate-900">
            {people.length} personne{people.length > 1 ? "s" : ""}
          </strong>{" "}
          · {managerCount} manager{managerCount > 1 ? "s" : ""}, {people.length - managerCount} commercia{people.length - managerCount > 1 ? "ux" : "l"}
        </p>
        <button
          onClick={() => setInviting(true)}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] px-5 text-[13.5px] font-semibold text-white hover:brightness-110"
        >
          Inviter un commercial
        </button>
      </div>

      {message && (
        <p role="status" className={`text-[13px] ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
          {message.text}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className={`hidden gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:grid ${COLS}`}>
          <span>Personne</span>
          <span>Rôle</span>
          <span>Manager</span>
          <span>Agenda</span>
          <span />
        </div>
        <ul>
          {people.map((m) => {
            const pending = isPendingInvitation(m);
            const isCommercial = m.role !== "manager";
            const inMyTeam = myIds.has(m.id);
            const managers = managersOf(m.id);
            return (
              <li key={m.id} className={`grid grid-cols-1 items-center gap-x-4 gap-y-1.5 border-b border-border px-5 py-3 last:border-0 ${COLS}`}>
                <span className="flex min-w-0 items-center gap-3">
                  <PersonPhoto name={label(m)} url={m.avatarUrl} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-slate-900">{label(m)}</span>
                    {m.name && <span className="block truncate text-[12.5px] text-slate-500">{m.email}</span>}
                  </span>
                </span>
                <span className="text-[13.5px] text-slate-800">{isCommercial ? "Commercial" : "Manager"}</span>
                <span className="text-[13.5px] text-slate-800">{isCommercial ? (managers.length > 0 ? managers.join(", ") : <span className="text-amber-700">Sans manager</span>) : "—"}</span>
                <span>
                  <Status m={m} />
                </span>
                <span className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
                  {isCommercial && inMyTeam && pending && (
                    <button onClick={() => resend(m)} disabled={busyId === m.id} className={action}>
                      Renvoyer l&apos;invitation
                    </button>
                  )}
                  {isCommercial && inMyTeam && pending && !m.hasActivity && (
                    <button onClick={() => cancel(m)} disabled={busyId === m.id} className={muted}>
                      Annuler l&apos;invitation
                    </button>
                  )}
                  {isCommercial && inMyTeam && (
                    <button onClick={() => unlink(m)} disabled={busyId === m.id} className={muted}>
                      Retirer de mon équipe
                    </button>
                  )}
                  {isCommercial && !inMyTeam && (
                    <button onClick={() => link(m)} disabled={busyId === m.id} className={action}>
                      Prendre dans mon équipe
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {inviting && (
        <InviteCommercialModal
          onClose={() => {
            setInviting(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
