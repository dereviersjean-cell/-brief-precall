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

  const input = "w-full rounded-xl border border-border bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)] disabled:bg-slate-50";
  const disabled = !detail.followUpAvailable || saving;

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-slate-900">Suivi</h2>
      {!detail.followUpAvailable && (
        <p className="mb-4 rounded-xl bg-[color:var(--warning-soft)] px-3.5 py-2.5 text-[12.5px] text-amber-800">
          La migration 020 n&apos;est pas passée : ces champs ne peuvent pas encore être enregistrés.
        </p>
      )}
      <div className="space-y-3">
        <label className="block">
          <span className="text-[12px] font-medium text-slate-700">Account manager</span>
          <input value={accountManager} onChange={(e) => setAccountManager(e.target.value)} placeholder="Qui suit ce client ?" disabled={disabled} className={`${input} mt-1`} />
        </label>
        <label className="block">
          <span className="text-[12px] font-medium text-slate-700">Prochain point</span>
          <input type="datetime-local" value={nextReview} onChange={(e) => setNextReview(e.target.value)} disabled={disabled} className={`${input} mt-1`} />
        </label>
        <label className="block">
          <span className="text-[12px] font-medium text-slate-700">Début du parcours</span>
          <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} disabled={disabled} className={`${input} mt-1`} />
          <span className="mt-1 block text-[11.5px] text-slate-500">La semaine en cours s&apos;en déduit.</span>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => void save()} disabled={disabled} className="inline-flex h-9 items-center rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && <span className={`text-[12px] font-medium ${message.tone === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{message.text}</span>}
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
    <button onClick={() => void rename()} className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900">
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
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="mb-1 text-[15px] font-semibold tracking-tight text-slate-900">Zone dangereuse</h2>
      <p className="mb-4 text-[12.5px] text-slate-500">La suppression est définitive, et impossible tant que le client a des membres.</p>
      <button
        onClick={() => void remove()}
        disabled={memberCount > 0 || pending}
        title={memberCount > 0 ? "Retirez d'abord tous les membres." : undefined}
        className="inline-flex h-9 items-center rounded-lg border border-[color:var(--danger-soft)] bg-white px-3.5 text-[13px] font-medium text-rose-700 transition-colors hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        Supprimer le client
      </button>
      {error && <p className="mt-2 text-[12px] text-rose-700">{error}</p>}
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
      <Link href="/admin/clients" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
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
        actions={
          <div className="flex items-center gap-2">
            <RenameButton organizationId={overview.id} name={overview.name} />
            <Link
              href={`/admin/clients/${overview.id}/point`}
              className="inline-flex h-9 items-center rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110"
            >
              Préparer le point
            </Link>
          </div>
        }
      />

      {overview.alerts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {overview.alerts.map((alert) => (
            <span
              key={alert.kind}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                alert.severity === "danger" ? "bg-[color:var(--danger-soft)] text-rose-700" : "bg-[color:var(--warning-soft)] text-amber-700"
              }`}
            >
              {alert.label}
            </span>
          ))}
        </div>
      )}

      {/* Deux colonnes sur grand écran seulement : en dessous, la colonne
          Équipe devenait trop étroite pour son tableau. Empilé, l'ordre suit
          l'usage pendant un point — l'équipe, puis le suivi et le parcours,
          puis la facturation, la zone dangereuse en dernier. */}
      <div className="grid gap-6 items-start 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 2xl:col-start-1 2xl:row-start-1">
          <TeamPanel organizationId={overview.id} members={detail.members} availableUsers={availableUsers} />
        </div>
        <div className="space-y-6 2xl:col-start-2 2xl:row-start-1 2xl:row-span-3">
          <SuiviPanel detail={detail} />
          <ParcoursPanel
            organizationId={overview.id}
            initialModules={overview.modules}
            inParcours={overview.inParcours}
            available={detail.modulesAvailable}
            currentWeek={overview.parcours.week}
            initialAccessLevel={overview.accessLevel}
          />
        </div>
        <div className="min-w-0 2xl:col-start-1">
          <BillingPanel organizationId={overview.id} billing={billing} />
        </div>
        <div className="min-w-0 2xl:col-start-1">
          <DangerZone organizationId={overview.id} name={overview.name} memberCount={detail.members.length} />
        </div>
      </div>
    </AdminPageShell>
  );
}
