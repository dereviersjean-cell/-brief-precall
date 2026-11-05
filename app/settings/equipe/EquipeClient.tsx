"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrgTeam, OrgTeamMember } from "@/lib/db";
import { isPendingInvitation } from "@/lib/team-invitation";
import PersonPhoto from "@/app/components/PersonPhoto";
import InviteCommercialModal from "@/app/team/InviteCommercialModal";

const CARD = "rounded-2xl border border-border bg-white p-5 sm:p-6";

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

// Paramètres › Équipe, une carte par manager (maquette H1 B, 05/11/2026).
// Le manager connecté agit sur sa propre équipe ; les autres équipes sont en
// lecture (les routes /api/team/* n'acceptent que ses propres liens).
export default function EquipeClient({ team, viewerId }: { team: OrgTeam; viewerId: string }) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [picking, setPicking] = useState("");

  const managers = [...team.managers].sort((a, b) => (a.id === viewerId ? -1 : b.id === viewerId ? 1 : 0));
  const mine = team.managers.find((m) => m.id === viewerId);
  const myIds = new Set(mine?.commercialIds ?? []);
  const linkable = Object.values(team.members)
    .filter((m) => m.role === "commercial" && !myIds.has(m.id))
    .sort((a, b) => label(a).localeCompare(label(b), "fr"));

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] text-slate-600">Chaque manager suit les deals des commerciaux de son équipe dans « Suivi des deals ».</p>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {managers.map((mgr) => {
          const manager = team.members[mgr.id];
          const own = mgr.id === viewerId;
          return (
            <section key={mgr.id} className={CARD} aria-label={`Équipe de ${label(manager)}`}>
              <div className="flex items-center gap-3">
                <PersonPhoto name={label(manager)} url={manager.avatarUrl} size={44} />
                <div className="min-w-0">
                  <h2 className="truncate text-[15.5px] font-semibold text-slate-900">{own ? "Votre équipe" : `Équipe de ${label(manager)}`}</h2>
                  <p className="text-[13px] text-slate-500">
                    {own ? label(manager) : "Manager"} · {mgr.commercialIds.length} commercia{mgr.commercialIds.length > 1 ? "ux" : "l"}
                  </p>
                </div>
              </div>

              {mgr.commercialIds.length === 0 ? (
                <p className="mt-4 text-[13.5px] text-slate-500">Aucun commercial rattaché.</p>
              ) : (
                <ul className="mt-3">
                  {mgr.commercialIds.map((id) => {
                    const m = team.members[id];
                    const pending = isPendingInvitation(m);
                    return (
                      <li key={id} className="border-t border-border py-2.5 first:border-t-0">
                        <div className="flex items-center gap-3">
                          <span className="min-w-0 flex-1 truncate text-[14px] text-slate-900" title={m.email}>
                            {label(m)}
                          </span>
                          <Status m={m} />
                        </div>
                        {own && (
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            {pending && (
                              <button onClick={() => resend(m)} disabled={busyId === id} className={action}>
                                Renvoyer l&apos;invitation
                              </button>
                            )}
                            {pending && !m.hasActivity && (
                              <button onClick={() => cancel(m)} disabled={busyId === id} className="text-[13px] font-medium text-slate-500 hover:text-rose-700 disabled:opacity-50">
                                Annuler l&apos;invitation
                              </button>
                            )}
                            <button onClick={() => unlink(m)} disabled={busyId === id} className="text-[13px] font-medium text-slate-500 hover:text-rose-700 disabled:opacity-50">
                              Retirer de mon équipe
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {own && linkable.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <label htmlFor="rattacher" className="sr-only">
                    Commercial à rattacher
                  </label>
                  <select
                    id="rattacher"
                    value={picking}
                    onChange={(e) => setPicking(e.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-[13.5px] text-slate-900"
                  >
                    <option value="">Rattacher un commercial…</option>
                    {linkable.map((m) => (
                      <option key={m.id} value={m.id}>
                        {label(m)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const m = team.members[picking];
                      if (m) link(m).then(() => setPicking(""));
                    }}
                    disabled={!picking || busyId !== null}
                    className="inline-flex h-10 items-center rounded-xl border border-[color:var(--lavender-strong)] bg-white px-4 text-[13.5px] font-semibold text-[color:var(--violet)] hover:bg-[color:var(--lavender)] disabled:opacity-50"
                  >
                    Rattacher
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className={CARD} aria-labelledby="sans-manager">
        <h2 id="sans-manager" className="text-[15px] font-semibold text-slate-900">
          Sans manager
        </h2>
        {team.unassignedIds.length === 0 ? (
          <p className="mt-1 text-[13.5px] text-slate-500">Tout le monde est rattaché.</p>
        ) : (
          <ul className="mt-2">
            {team.unassignedIds.map((id) => {
              const m = team.members[id];
              return (
                <li key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border py-2.5 first:border-t-0">
                  <span className="min-w-0 flex-1 truncate text-[14px] text-slate-900">{label(m)}</span>
                  <Status m={m} />
                  <button onClick={() => link(m)} disabled={busyId === id} className={action}>
                    Prendre dans mon équipe
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
