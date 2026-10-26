"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEAL_ALERT_RULES,
  DEAL_MEMORY_FIELDS,
  INACTIVITY_DAYS,
  OBJECTION_ALERT_LABEL,
  type DealMemoryItem,
  type DealMemoryFieldKey,
  type DealOverview,
  type HubspotDealSnapshot,
  type QuoteSegment,
  type StoredDealMemory,
} from "@/lib/deal-memory-schema";
import type { DealMemoryObjection, DealMemoryPanel } from "@/lib/db";

// Fiche deal tirée du call — Deal Execution, étape 1, phase « à blanc » :
// seuls les managers des organisations ouvertes la voient, le temps de
// vérifier sur de vrais calls que ce qu'elle retient est juste.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const CARD = "rounded-2xl border border-border bg-white";

const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

const QUALITY_LABELS: Record<NonNullable<DealMemoryObjection["handlingQuality"]>, { label: string; tone: string }> = {
  bien_traitee: { label: "Bien traitée", tone: "bg-emerald-50 text-emerald-700" },
  partiellement: { label: "Partiellement traitée", tone: "bg-amber-50 text-amber-700" },
  non_traitee: { label: "Non traitée", tone: "bg-rose-50 text-rose-700" },
};

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// Le passage cité, avec le nom de qui parle : une citation qui passe d'une
// personne à l'autre se lisait sinon comme venant toute du prospect. Les
// fiches antérieures au 27/10/2026 n'ont que `verbatim`.
function Quote({ verbatim, quote }: { verbatim: string; quote?: QuoteSegment[] }) {
  const segments = quote && quote.length > 0 ? quote : [{ speaker: null, text: verbatim }];
  return (
    <div className="mt-1.5 space-y-1 border-l-2 border-slate-200 pl-3 text-[12.5px] leading-relaxed text-slate-500">
      {segments.map((segment, i) => (
        <p key={i}>
          {segment.speaker && <span className="font-medium not-italic text-slate-600">{segment.speaker} : </span>}
          <span className="italic">« {segment.text} »</span>
        </p>
      ))}
    </div>
  );
}

function Item({ item, date }: { item: DealMemoryItem; date?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="text-[13.5px] leading-relaxed text-slate-800">
      {date && <span className="mr-1.5 text-[12px] font-medium text-slate-400">{formatDay(date)}</span>}
      {item.text}
      {item.verbatim && (
        <>
          {" "}
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[12px] font-medium text-[color:var(--violet)] hover:underline"
          >
            {open ? "Masquer la phrase" : "Voir la phrase"}
          </button>
          {open && <Quote verbatim={item.verbatim} quote={item.quote} />}
        </>
      )}
    </li>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

// Le deal auquel ce call appartient : ses calls dans l'ordre, et l'alerte
// « aucune activité » quand le dernier date de plus de INACTIVITY_DAYS jours.
function DealCard({ deal }: { deal: DealOverview }) {
  const last = deal.calls.reduce<string | null>((max, c) => (c.callAt && (!max || c.callAt > max) ? c.callAt : max), null);
  const idleDays = deal.idleDays;
  return (
    <section className={`${CARD} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-slate-900">{deal.name}</h3>
        <p className="text-[12.5px] text-slate-500">
          {deal.calls.length} call{deal.calls.length > 1 ? "s" : ""} dans ce deal
        </p>
      </div>
      {idleDays !== null && idleDays >= INACTIVITY_DAYS && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[13px] text-amber-800">
          <span className="font-semibold">Aucune activité depuis {idleDays} jours</span> — dernier call le {formatDay(last!)}.
        </p>
      )}
      <HubspotLine snapshot={deal.hubspot} />
      <ol className="mt-3 space-y-1.5">
        {deal.calls.map((c, i) => (
          <li key={c.callId} className="flex flex-wrap items-baseline gap-x-2 text-[13.5px]">
            <span className="w-5 text-right text-[12px] text-slate-400">{i + 1}.</span>
            {c.callAt && <span className="text-[12.5px] text-slate-500">{formatDay(c.callAt)}</span>}
            {c.isCurrent ? (
              <span className="font-medium text-slate-900">{c.title ?? "Ce call"} (ce call)</span>
            ) : (
              <Link href={`/feedback/${c.callId}?tab=deal`} className="font-medium text-[color:var(--violet)] hover:underline">
                {c.title ?? "Call"}
              </Link>
            )}
            {c.alertCount > 0 && (
              <span className="text-[12px] text-amber-700">
                {c.alertCount} alerte{c.alertCount > 1 ? "s" : ""}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

// Le deal HubSpot rattaché (étape 3), tel que lu à la dernière fiche ou au
// dernier envoi.
function HubspotLine({ snapshot }: { snapshot: HubspotDealSnapshot | null }) {
  if (!snapshot) {
    return <p className="mt-2 text-[12.5px] text-slate-400">Aucun deal HubSpot trouvé pour ce prospect.</p>;
  }
  const parts = [
    snapshot.stage && (snapshot.stageIndex && snapshot.stageCount ? `${snapshot.stage} (étape ${snapshot.stageIndex} sur ${snapshot.stageCount})` : snapshot.stage),
    snapshot.amount !== null ? formatAmount(snapshot.amount) : null,
    snapshot.closeDate ? `clôture prévue le ${formatDay(snapshot.closeDate)}` : null,
  ].filter(Boolean);
  return (
    <p className="mt-2 text-[13px] text-slate-600">
      <span className="font-medium text-slate-900">HubSpot</span>
      {snapshot.name ? ` · ${snapshot.name}` : ""}
      {parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}
      {snapshot.url && (
        <>
          {" · "}
          <a href={snapshot.url} target="_blank" rel="noreferrer" className="font-medium text-[color:var(--violet)] hover:underline">
            Ouvrir dans HubSpot
          </a>
        </>
      )}
    </p>
  );
}

type MappingState = {
  connected: boolean;
  properties: { name: string; label: string }[];
  mapping: Partial<Record<DealMemoryFieldKey, string>>;
};

// Où chaque champ de la fiche s'écrit dans HubSpot. Réglé au setup avec le
// manager ; la liste vient des propriétés de deal du HubSpot du client.
function HubspotMapping() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<MappingState | null>(null);
  const [draft, setDraft] = useState<Partial<Record<DealMemoryFieldKey, string>>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!open || state) return;
    let cancelled = false;
    fetch("/api/deal-memory/hubspot-mapping")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: MappingState) => {
        if (cancelled) return;
        setState(data);
        setDraft(data.mapping);
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [open, state]);

  async function save() {
    setStatus("saving");
    const mapping = Object.fromEntries(DEAL_MEMORY_FIELDS.map((f) => [f.key, draft[f.key] ?? ""]));
    const res = await fetch("/api/deal-memory/hubspot-mapping", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping }),
    }).catch(() => null);
    setStatus(res?.ok ? "saved" : "error");
  }

  return (
    <section className={`${CARD} p-5`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-[13.5px] font-semibold text-slate-900">Champs HubSpot</span>
        <span className="text-[12.5px] text-slate-500">{open ? "Masquer" : "Où chaque champ s'écrit dans HubSpot"}</span>
      </button>
      {open && !state && status !== "error" && <p className="mt-3 text-[13px] text-slate-500">Lecture des propriétés HubSpot…</p>}
      {open && status === "error" && <p className="mt-3 text-[13px] text-rose-700">Impossible de lire ou d&apos;enregistrer les champs HubSpot.</p>}
      {open && state && !state.connected && (
        <p className="mt-3 text-[13px] text-slate-500">Personne n&apos;a connecté HubSpot dans votre équipe (Paramètres › Connexions).</p>
      )}
      {open && state?.connected && (
        <div className="mt-4 space-y-2.5">
          {DEAL_MEMORY_FIELDS.map((field) => (
            <label key={field.key} className="grid grid-cols-1 items-center gap-1 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-3">
              <span className="text-[13px] text-slate-700">{field.label}</span>
              <select
                value={draft[field.key] ?? ""}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, [field.key]: e.target.value }));
                  setStatus("idle");
                }}
                className="h-9 rounded-lg border border-border bg-white px-2 text-[13px] text-slate-900"
              >
                <option value="">Ne pas écrire dans HubSpot</option>
                {state.properties.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.label} ({p.name})
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={save}
              disabled={status === "saving"}
              className="inline-flex h-9 items-center rounded-full border border-border bg-white px-4 text-[13px] font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              {status === "saving" ? "Enregistrement…" : "Enregistrer"}
            </button>
            {status === "saved" && <span className="text-[12.5px] text-emerald-700">Enregistré.</span>}
          </div>
        </div>
      )}
    </section>
  );
}

export default function DealMemoryBlock({ callId, panel }: { callId: string; panel: DealMemoryPanel }) {
  const [memory, setMemory] = useState<StoredDealMemory | null>(panel.initial);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<"idle" | "pushing" | "error">("idle");
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushedAt, setPushedAt] = useState<string | null>(panel.initial?.hubspotPushedAt ?? null);
  const router = useRouter();

  async function pushToHubspot() {
    setPushStatus("pushing");
    setPushError(null);
    try {
      const res = await fetch(`/api/feedback/${callId}/deal-memory/hubspot`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { pushedAt?: string; error?: string };
      if (!res.ok || !data.pushedAt) throw new Error(data.error ?? "L'envoi dans HubSpot a échoué.");
      setPushedAt(data.pushedAt);
      setPushStatus("idle");
      router.refresh();
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "L'envoi dans HubSpot a échoué.");
      setPushStatus("error");
    }
  }

  async function generate() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/feedback/${callId}/deal-memory`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { dealMemory?: StoredDealMemory; error?: string };
      if (!res.ok || !data.dealMemory) throw new Error(data.error ?? "La génération de la fiche a échoué.");
      setMemory(data.dealMemory);
      setStatus("idle");
      // Le deal a pu changer avec cette fiche (rattachement, mémoire cumulée) :
      // il est relu côté serveur.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "La génération de la fiche a échoué.");
      setStatus("error");
    }
  }

  const badlyHandled = panel.objections.filter((o) => o.handlingQuality === "non_traitee" || o.handlingQuality === "partiellement");
  const alertCount = (memory?.alerts.length ?? 0) + badlyHandled.length;
  // Dès que le deal compte plusieurs calls, la mémoire montre tout ce qu'ils
  // ont retenu, daté, du plus récent au plus ancien.
  const dealMemory = panel.deal && panel.deal.calls.length > 1 ? panel.deal.memory : null;

  return (
    <div className="mt-8 space-y-6">
      <div className={`${CARD} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900">Fiche deal</h2>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-medium text-amber-700">
              Test · visible des managers seulement
            </span>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            {memory
              ? `Tirée de ce call le ${formatDate(memory.generatedAt)}. Chaque élément renvoie à la phrase prononcée.`
              : "Ce que Brief retient de ce call pour le deal : douleur, décideur, budget, prochaines étapes, alertes."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {memory && panel.deal?.hubspot && (
            <button
              onClick={pushToHubspot}
              disabled={pushStatus === "pushing" || status === "loading"}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-[13px] font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              {pushStatus === "pushing" && <Spinner />}
              {pushStatus === "pushing" ? "Envoi…" : pushedAt ? "Renvoyer dans HubSpot" : "Envoyer dans HubSpot"}
            </button>
          )}
          <button
            onClick={generate}
            disabled={status === "loading"}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-[13px] font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {status === "loading" && <Spinner />}
            {status === "loading" ? "Analyse du call…" : memory ? "Régénérer" : "Générer la fiche"}
          </button>
        </div>
      </div>

      {pushedAt && pushStatus !== "error" && (
        <p className="text-[12.5px] text-slate-500">Envoyée dans HubSpot le {formatDate(pushedAt)} : champs de qualification et note de synthèse.</p>
      )}
      {pushStatus === "error" && pushError && <p className="text-[13px] text-rose-700">{pushError}</p>}

      {status === "loading" && (
        <p className="text-[13px] text-slate-500">Brief relit tout le call : comptez jusqu&apos;à une minute.</p>
      )}
      {status === "error" && error && <p className="text-[13px] text-rose-700">{error}</p>}

      {panel.deal && <DealCard deal={panel.deal} />}

      {memory && (
        <>
          <section>
            <h3 className={`${LABEL} mb-3`}>Alertes{alertCount > 0 ? ` (${alertCount})` : ""}</h3>
            {alertCount === 0 ? (
              <p className={`${CARD} p-5 text-[13.5px] text-slate-500`}>Aucune alerte sur ce call.</p>
            ) : (
              <ul className="space-y-3">
                {memory.alerts.map((alert) => (
                  <li key={alert.rule} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-800">
                      {RULE_LABELS.get(alert.rule) ?? alert.rule}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-slate-800">{alert.text}</p>
                    {alert.verbatim && <Quote verbatim={alert.verbatim} quote={alert.quote} />}
                  </li>
                ))}
                {badlyHandled.map((o, i) => (
                  <li key={`objection-${i}`} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-800">{OBJECTION_ALERT_LABEL}</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-slate-800">
                      {o.objection}
                      {o.handlingComment ? ` — ${o.handlingComment}` : ""}
                    </p>
                    {o.verbatim && <Quote verbatim={o.verbatim} />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className={`${LABEL} mb-3`}>
              Mémoire du deal{dealMemory ? ` · ${panel.deal!.calls.length} calls` : ""}
            </h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {DEAL_MEMORY_FIELDS.map((field) => {
                const items: (DealMemoryItem & { callAt?: string | null })[] = dealMemory
                  ? dealMemory[field.key] ?? []
                  : memory.fields[field.key] ?? [];
                return (
                  <div key={field.key} className={`${CARD} p-4`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold text-slate-900">{field.label}</p>
                      {field.meddic && <span className="text-[11px] text-slate-400">{field.meddic}</span>}
                    </div>
                    {items.length === 0 ? (
                      <p className="mt-1.5 text-[13px] text-slate-400">{dealMemory ? "Rien dans ces calls." : "Rien dans ce call."}</p>
                    ) : (
                      <ul className="mt-1.5 list-disc space-y-1.5 pl-4 marker:text-slate-300">
                        {items.map((item, i) => (
                          <Item key={i} item={item} date={dealMemory ? item.callAt : null} />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              <div className={`${CARD} p-4`}>
                <p className="text-[13px] font-semibold text-slate-900">Objections</p>
                {panel.objections.length === 0 ? (
                  <p className="mt-1.5 text-[13px] text-slate-400">Aucune objection relevée.</p>
                ) : (
                  <ul className="mt-1.5 space-y-2">
                    {panel.objections.map((o, i) => (
                      <li key={i} className="text-[13.5px] leading-relaxed text-slate-800">
                        {o.objection}
                        {o.handlingQuality && (
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${QUALITY_LABELS[o.handlingQuality].tone}`}>
                            {QUALITY_LABELS[o.handlingQuality].label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <HubspotMapping />
        </>
      )}
    </div>
  );
}
