"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, AlertTriangle, CalendarClock, PhoneCall, Route } from "lucide-react";
import type { ClientOverview, ClientAlert } from "@/lib/clients-overview";
import { AdminPageShell, AdminPageHeader } from "@/app/admin/AdminShell";

// Espace « Suivi clients » : ce que l'account manager regarde en premier le
// matin. Une ligne par client — où il en est du parcours, quand a lieu le
// prochain point, et ce qui cloche. Les clients à problème remontent en tête.

function formatReview(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

function severityRank(alerts: ClientAlert[]): [number, number] {
  return [alerts.filter((a) => a.severity === "danger").length, alerts.filter((a) => a.severity === "warning").length];
}

function sortClients(clients: ClientOverview[]): ClientOverview[] {
  return [...clients].sort((a, b) => {
    const [da, wa] = severityRank(a.alerts);
    const [db, wb] = severityRank(b.alerts);
    if (db !== da) return db - da;
    if (wb !== wa) return wb - wa;
    return a.name.localeCompare(b.name, "fr");
  });
}

function AlertChip({ alert }: { alert: ClientAlert }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
        alert.severity === "danger" ? "bg-[color:var(--danger-soft)] text-rose-700" : "bg-[color:var(--warning-soft)] text-amber-700"
      }`}
    >
      {alert.label}
    </span>
  );
}

function Tile({ icon: Icon, label, value, tone = "default" }: { icon: typeof Building2; label: string; value: number; tone?: "default" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${tone === "danger" && value > 0 ? "text-rose-600" : "text-slate-400"}`} />
      </div>
      <p className={`mt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums ${tone === "danger" && value > 0 ? "text-rose-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function NewClientForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Erreur lors de la création.");
      onCreated(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110"
      >
        <Plus className="h-4 w-4" />
        Nouveau client
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de l'entreprise"
        className="h-9 w-56 rounded-xl border border-border bg-white px-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="inline-flex h-9 items-center rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Création…" : "Créer"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
        Annuler
      </button>
      {error && <p className="w-full text-[12px] text-rose-700">{error}</p>}
    </form>
  );
}

function ParcoursCell({ client }: { client: ClientOverview }) {
  if (client.accessLevel === "briefs") {
    return (
      <div>
        <p className="text-[13.5px] text-slate-700">Inscription libre</p>
        <p className="mt-0.5 text-[12px] text-slate-500">Briefs uniquement · à passer en accès complet</p>
      </div>
    );
  }
  if (!client.inParcours) {
    return (
      <div>
        <p className="text-[13.5px] text-slate-700">Hors parcours</p>
        <p className="mt-0.5 text-[12px] text-slate-500">Tous les modules ouverts</p>
      </div>
    );
  }
  const { week, finished, nextModule, late, openCount, totalCount } = client.parcours;
  return (
    <div>
      <p className="text-[13.5px] text-slate-700">
        {week === null ? "Début non daté" : finished ? "Parcours terminé" : week === 0 ? "Semaine 0 · mise en route" : `Semaine ${week}`}
        <span className="tabular-nums text-slate-500"> · {openCount}/{totalCount} modules</span>
      </p>
      <p className={`mt-0.5 text-[12px] ${late ? "font-medium text-rose-700" : "text-slate-500"}`}>
        {nextModule ? `Prochain : ${nextModule.label} (semaine ${nextModule.week})` : "Parcours entièrement ouvert"}
      </p>
    </div>
  );
}

// `now` vient du serveur : l'heure courante lue au rendu rendrait la page
// impure (et différente entre le rendu serveur et l'hydratation).
export default function ClientsAdminClient({ clients, now: nowISO }: { clients: ClientOverview[]; now: string }) {
  const router = useRouter();
  const sorted = sortClients(clients);

  const now = new Date(nowISO).getTime();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const reviewsThisWeek = clients.filter((c) => {
    const t = c.nextReviewAt ? new Date(c.nextReviewAt).getTime() : null;
    return t !== null && t >= now && t <= weekAhead;
  }).length;
  const criticalClients = clients.filter((c) => c.alerts.some((a) => a.severity === "danger")).length;
  const inParcours = clients.filter((c) => c.inParcours).length;
  const calls7d = clients.reduce((sum, c) => sum + c.activity7d.calls, 0);

  return (
    <AdminPageShell>
      <AdminPageHeader
        icon={Building2}
        eyebrow="Suivi clients"
        title="Clients"
        subtitle={`${clients.length} client${clients.length > 1 ? "s" : ""}, dont ${inParcours} en parcours. Les clients à surveiller sont en tête de liste.`}
        actions={<NewClientForm onCreated={(id) => router.push(`/admin/clients/${id}`)} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={AlertTriangle} label="À surveiller" value={criticalClients} tone="danger" />
        <Tile icon={CalendarClock} label="Points sous 7 jours" value={reviewsThisWeek} />
        <Tile icon={Route} label="En parcours" value={inParcours} />
        <Tile icon={PhoneCall} label="Calls sur 7 jours" value={calls7d} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13.5px]">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 text-left">
                {["Client", "Parcours", "Prochain point", "Équipe", "7 derniers jours", "Alertes"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((client) => {
                const reviewOverdue = client.alerts.some((a) => a.kind === "review_overdue");
                return (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/admin/clients/${client.id}`)}
                    className="cursor-pointer border-b border-border align-top transition-colors last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{client.name}</p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {client.accountManager ? `Suivi : ${client.accountManager}` : "Suivi non attribué"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <ParcoursCell client={client} />
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 ${reviewOverdue ? "font-medium text-rose-700" : "text-slate-700"}`}>
                      {formatReview(client.nextReviewAt)}
                      <Link
                        href={`/admin/clients/${client.id}/point`}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 block text-[12px] font-medium text-[color:var(--violet)] hover:underline"
                      >
                        Préparer le point →
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="tabular-nums text-slate-700">
                        {client.members.total} membre{client.members.total > 1 ? "s" : ""}
                      </p>
                      {client.members.pendingInvites > 0 && (
                        <p className="mt-0.5 text-[12px] tabular-nums text-slate-500">dont {client.members.pendingInvites} invité{client.members.pendingInvites > 1 ? "s" : ""}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 tabular-nums text-slate-700">
                      {client.activity7d.calls} call{client.activity7d.calls > 1 ? "s" : ""}
                      <span className="text-slate-500"> · {client.activity7d.briefs} brief{client.activity7d.briefs > 1 ? "s" : ""}</span>
                    </td>
                    <td className="px-4 py-4">
                      {client.alerts.length === 0 ? (
                        <span className="text-[12px] font-medium text-emerald-700">Rien à signaler</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {client.alerts.map((alert) => (
                            <AlertChip key={alert.kind} alert={alert} />
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13.5px] text-slate-500">
                    Aucun client pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageShell>
  );
}
