"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import type { ClientDetail } from "@/lib/clients-overview";
import type { OrganizationBilling, OrganizationMember } from "@/lib/db";
import { AdminPageShell, AdminPageHeader } from "@/app/admin/AdminShell";
import ParcoursPanel from "./ParcoursPanel";
import TeamPanel from "./TeamPanel";
import BillingPanel from "./BillingPanel";

// Fiche d'un client dans l'espace « Suivi clients » : tout ce qu'il faut
// pendant et avant le point hebdomadaire, sur une seule page — ce qui
// cloche, le suivi, le parcours et ses modules, l'équipe, la facturation.
// Remplace l'ancienne fiche organisation à onglets (29/09/2026).

const PARIS = "Europe/Paris";

function formatReview(iso: string | null): string {
  if (!iso) return "pas de point planifié";
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: PARIS });
}

// Valeur d'un champ datetime-local (heure de Paris) à partir d'un ISO.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("fr-CA", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function SuiviPanel({ detail }: { detail: ClientDetail }) {
  const router = useRouter();
  const { overview } = detail;
  const [accountManager, setAccountManager] = useState(overview.accountManager ?? "");
  const [nextReview, setNextReview] = useState(toLocalInput(overview.nextReviewAt));
  const [startedAt, setStartedAt] = useState(overview.parcoursStartedAt?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/organizations/${overview.id}/follow-up`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_manager: accountManager,
          // Saisi en heure locale du navigateur (l'account manager est en
          // France) : converti ici en instant absolu.
          next_review_at: nextReview ? new Date(nextReview).toISOString() : "",
          parcours_started_at: startedAt,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Enregistrement impossible.");
      }
      setMessage({ tone: "ok", text: "Enregistré." });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Enregistrement impossible." });
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50";
  const disabled = !detail.followUpAvailable || saving;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Suivi</h2>
      {!detail.followUpAvailable && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          La migration 020 n&apos;est pas passée : ces champs ne peuvent pas encore être enregistrés.
        </p>
      )}
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Account manager</span>
          <input value={accountManager} onChange={(e) => setAccountManager(e.target.value)} placeholder="Qui suit ce client ?" disabled={disabled} className={`${input} mt-1`} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Prochain point</span>
          <input type="datetime-local" value={nextReview} onChange={(e) => setNextReview(e.target.value)} disabled={disabled} className={`${input} mt-1`} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Début du parcours</span>
          <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} disabled={disabled} className={`${input} mt-1`} />
          <span className="text-[11px] text-slate-400">La semaine en cours s&apos;en déduit.</span>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => void save()} disabled={disabled} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && <span className={`text-xs ${message.tone === "ok" ? "text-emerald-600" : "text-red-600"}`}>{message.text}</span>}
      </div>
    </section>
  );
}

function RenameButton({ organizationId, name }: { organizationId: string; name: string }) {
  const router = useRouter();
  async function rename() {
    const next = window.prompt("Nouveau nom du client", name)?.trim();
    if (!next || next === name) return;
    const res = await fetch(`/api/admin/organizations/${organizationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(data.error ?? "Renommage impossible.");
      return;
    }
    router.refresh();
  }
  return (
    <button onClick={() => void rename()} className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
      Renommer
    </button>
  );
}

function DangerZone({ organizationId, name, memberCount }: { organizationId: string; name: string; memberCount: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function remove() {
    if (!window.confirm(`Supprimer définitivement le client « ${name} » ?`)) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/organizations/${organizationId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Suppression impossible.");
      setPending(false);
      return;
    }
    router.push("/admin/clients");
  }
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-sm font-semibold text-slate-900 mb-1">Zone dangereuse</h2>
      <p className="text-xs text-slate-400 mb-4">La suppression est définitive, et impossible tant que le client a des membres.</p>
      <button
        onClick={() => void remove()}
        disabled={memberCount > 0 || pending}
        title={memberCount > 0 ? "Retirez d'abord tous les membres." : undefined}
        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        Supprimer le client
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </section>
  );
}

export default function ClientDetailClient({
  detail,
  availableUsers,
  billing,
}: {
  detail: ClientDetail;
  availableUsers: OrganizationMember[];
  billing: OrganizationBilling | null;
}) {
  const { overview } = detail;
  const { week, finished } = overview.parcours;
  const parcoursLabel = !overview.inParcours
    ? "Hors parcours"
    : week === null
    ? "Parcours non daté"
    : finished
    ? "Parcours terminé"
    : week === 0
    ? "Semaine 0 · mise en route"
    : `Semaine ${week} du parcours`;

  return (
    <AdminPageShell>
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        Clients
      </Link>

      <AdminPageHeader
        icon={Building2}
        eyebrow="Client"
        title={overview.name}
        subtitle={
          <>
            {parcoursLabel} · prochain point : {formatReview(overview.nextReviewAt)}
            {overview.accountManager ? ` · suivi par ${overview.accountManager}` : ""}
          </>
        }
        actions={<RenameButton organizationId={overview.id} name={overview.name} />}
      />

      {overview.alerts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {overview.alerts.map((alert) => (
            <span
              key={alert.kind}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                alert.severity === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {alert.label}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="space-y-6 min-w-0">
          <TeamPanel organizationId={overview.id} members={detail.members} availableUsers={availableUsers} />
          <BillingPanel organizationId={overview.id} billing={billing} />
          <DangerZone organizationId={overview.id} name={overview.name} memberCount={detail.members.length} />
        </div>
        <div className="space-y-6">
          <SuiviPanel detail={detail} />
          <ParcoursPanel
            organizationId={overview.id}
            initialModules={overview.modules}
            inParcours={overview.inParcours}
            available={detail.modulesAvailable}
            currentWeek={overview.parcours.week}
          />
        </div>
      </div>
    </AdminPageShell>
  );
}
