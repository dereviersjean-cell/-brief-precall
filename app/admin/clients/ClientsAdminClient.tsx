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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
        alert.severity === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {alert.label}
    </span>
  );
}

function Tile({ icon: Icon, label, value, tone = "default" }: { icon: typeof Building2; label: string; value: number; tone?: "default" | "danger" }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <Icon className={`w-4 h-4 ${tone === "danger" && value > 0 ? "text-red-500" : "text-slate-300"}`} />
      </div>
      <p className={`mt-2 text-2xl font-semibold ${tone === "danger" && value > 0 ? "text-red-600" : "text-slate-900"}`}>{value}</p>
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
        className="flex items-center gap-2 px-4 py-2 brand-gradient text-white rounded-lg text-sm font-medium hover:brightness-110 transition-colors"
      >
        <Plus className="w-4 h-4" />
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
        className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]/20 w-56"
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="px-4 py-2 brand-gradient text-white rounded-lg text-sm font-medium hover:brightness-110 transition-colors disabled:opacity-50"
      >
        {loading ? "Création…" : "Créer"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
        Annuler
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

function ParcoursCell({ client }: { client: ClientOverview }) {
  if (client.accessLevel === "briefs") {
    return (
      <div>
        <p className="text-sm text-slate-700">Inscription libre</p>
        <p className="text-xs text-slate-400 mt-0.5">Briefs uniquement · à passer en accès complet</p>
      </div>
    );
  }
  if (!client.inParcours) {
    return (
      <div>
        <p className="text-sm text-slate-700">Hors parcours</p>
        <p className="text-xs text-slate-400 mt-0.5">Tous les modules ouverts</p>
      </div>
    );
  }
  const { week, finished, nextModule, late, openCount, totalCount } = client.parcours;
  return (
    <div>
      <p className="text-sm text-slate-700">
        {week === null ? "Début non daté" : finished ? "Parcours terminé" : week === 0 ? "Semaine 0 · mise en route" : `Semaine ${week}`}
        <span className="text-slate-400"> · {openCount}/{totalCount} modules</span>
      </p>
      <p className={`text-xs mt-0.5 ${late ? "text-red-600 font-medium" : "text-slate-400"}`}>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tile icon={AlertTriangle} label="À surveiller" value={criticalClients} tone="danger" />
        <Tile icon={CalendarClock} label="Points sous 7 jours" value={reviewsThisWeek} />
        <Tile icon={Route} label="En parcours" value={inParcours} />
        <Tile icon={PhoneCall} label="Calls sur 7 jours" value={calls7d} />
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 text-left">
                {["Client", "Parcours", "Prochain point", "Équipe", "7 derniers jours", "Alertes"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
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
                    className="border-b border-slate-100 last:border-b-0 hover:bg-[color:var(--lavender)] cursor-pointer align-top"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{client.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {client.accountManager ? `Suivi : ${client.accountManager}` : "Suivi non attribué"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <ParcoursCell client={client} />
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap ${reviewOverdue ? "text-red-600 font-medium" : "text-slate-700"}`}>
                      {formatReview(client.nextReviewAt)}
                      <Link
                        href={`/admin/clients/${client.id}/point`}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 block text-xs font-medium text-[color:var(--violet)] hover:text-[color:var(--violet)]"
                      >
                        Préparer le point →
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-slate-700">
                        {client.members.total} membre{client.members.total > 1 ? "s" : ""}
                      </p>
                      {client.members.pendingInvites > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">dont {client.members.pendingInvites} invité{client.members.pendingInvites > 1 ? "s" : ""}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-700">
                      {client.activity7d.calls} call{client.activity7d.calls > 1 ? "s" : ""}
                      <span className="text-slate-400"> · {client.activity7d.briefs} brief{client.activity7d.briefs > 1 ? "s" : ""}</span>
                    </td>
                    <td className="px-4 py-4">
                      {client.alerts.length === 0 ? (
                        <span className="text-xs font-medium text-emerald-600">Rien à signaler</span>
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
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
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
