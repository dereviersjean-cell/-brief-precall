"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AUTOFILL_MODES,
  AUTOFILL_OBJECTS,
  OBJECT_LABELS,
  linkId,
  type AutofillConfig,
  type AutofillLink,
  type AutofillMode,
  type AutofillObject,
} from "@/lib/hubspot-autofill";

type Status = { connected: boolean; config: AutofillConfig | null; canWriteCompanies: boolean };

const STEPS = ["Propriétés des deals", "Propriétés des contacts", "Propriétés des entreprises", "Recherche des correspondances"];

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue.");
  return data;
}

// ─── Attente pendant que Brief lit HubSpot ──────────────────────────────────

function Waiting({ step, counts }: { step: number; counts: (string | null)[] }) {
  // Trois lectures courtes, puis la recherche des correspondances, la plus
  // longue : la barre y avance doucement jusqu'à 95 %.
  const width = step < 3 ? `${8 + step * 14}%` : "95%";
  return (
    <div className="mx-auto flex max-w-[620px] flex-col gap-5 rounded-2xl border border-border bg-white px-6 py-8 sm:px-10 sm:py-9" aria-live="polite">
      <style>{`
        @keyframes hsDot{0%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1.15)}}
        @keyframes hsSpin{to{transform:rotate(360deg)}}
        .hs-dot{width:8px;height:8px;border-radius:50%;background:var(--primary);animation:hsDot 1.2s ease-in-out infinite}
        .hs-spin{animation:hsSpin .9s linear infinite}
        @media (prefers-reduced-motion: reduce){.hs-dot,.hs-spin{animation:none}.hs-dot{opacity:.6}}
      `}</style>
      <div className="flex items-center justify-center gap-[18px]">
        <span className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl border border-border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/stack/hubspot.svg" alt="HubSpot" width={34} height={34} />
        </span>
        <span aria-hidden="true" className="flex gap-2">
          {[0, 0.2, 0.4, 0.6].map((d) => (
            <span key={d} className="hs-dot" style={{ animationDelay: `${d}s` }} />
          ))}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="Brief" width={60} height={60} className="h-[60px] w-[60px] rounded-2xl" />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-semibold text-[color:var(--primary)]">HubSpot connecté</p>
        <h2 className="mt-1 text-[26px] font-bold leading-tight text-foreground">Brief lit votre HubSpot</h2>
        <p className="mt-2 text-[15px] text-[color:var(--muted-foreground)]">
          Une vingtaine de secondes. Brief cherche les propriétés qu&apos;il pourra remplir après chaque call.
        </p>
      </div>
      <div role="progressbar" aria-label="Lecture de HubSpot" className="h-2 overflow-hidden rounded-full bg-[#EEF2FD]">
        <div
          className="h-full rounded-full bg-[color:var(--primary)]"
          style={{ width, transition: step < 3 ? "width .5s ease-out" : "width 22s cubic-bezier(.2,.6,.3,1)" }}
        />
      </div>
      <div>
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3.5 py-3.5 text-[15px] ${i < STEPS.length - 1 ? "border-b border-[#EEF0F4]" : ""} ${i > step ? "opacity-35" : ""}`}
          >
            <span className="relative h-6 w-6">
              {i < step ? (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[color:var(--primary)] text-[14px] font-bold text-white">✓</span>
              ) : (
                <span className={`absolute inset-0 rounded-full border-[3px] border-[#E3E5EA] ${i === step ? "hs-spin border-t-[color:var(--primary)]" : ""}`} />
              )}
            </span>
            <strong className="font-semibold text-foreground">{label}</strong>
            <span className="text-[13.5px] text-[color:var(--muted-foreground)]">{counts[i] ?? ""}</span>
          </div>
        ))}
      </div>
      <p className="text-[13.5px] text-[color:var(--muted-foreground)]">
        Rien n&apos;est écrit dans HubSpot à cette étape. Vous validerez la liste juste après.
      </p>
    </div>
  );
}

// ─── Écran ──────────────────────────────────────────────────────────────────

const PRIMARY_BTN =
  "inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--primary)] px-5 text-[14px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const GHOST_BTN =
  "inline-flex h-11 items-center justify-center rounded-full border border-border bg-white px-[18px] text-[13.5px] font-medium text-[color:var(--muted-foreground)] transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";
const COLS = "md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)_minmax(0,1.2fr)_178px_44px] md:items-center md:gap-4";

export default function HubspotAutofillClient() {
  const [status, setStatus] = useState<Status | null>(null);
  const [links, setLinks] = useState<AutofillLink[]>([]);
  const [active, setActive] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<AutofillObject>("deal");
  const [scan, setScan] = useState<{ step: number; counts: (string | null)[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const started = useRef(false);

  const runScan = useCallback(async () => {
    const counts: (string | null)[] = [null, null, null, null];
    setMessage(null);
    setScan({ step: 0, counts });
    try {
      for (let i = 0; i < AUTOFILL_OBJECTS.length; i++) {
        const r = await json<{ total: number }>(`/api/hubspot-autofill/scan?object=${AUTOFILL_OBJECTS[i]}`);
        counts[i] = `${r.total} lue${r.total > 1 ? "s" : ""}`;
        setScan({ step: i + 1, counts: [...counts] });
      }
      const r = await json<{ links: AutofillLink[] }>("/api/hubspot-autofill/propose", { method: "POST" });
      counts[3] = `${r.links.length} trouvée${r.links.length > 1 ? "s" : ""}`;
      setScan({ step: 4, counts: [...counts] });
      await new Promise((resolve) => setTimeout(resolve, 700));
      setLinks(r.links);
      setDirty(true);
      setTab("deal");
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "La lecture de HubSpot a échoué." });
    } finally {
      setScan(null);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    json<Status>("/api/hubspot-autofill")
      .then((s) => {
        setStatus(s);
        if (s.config && s.config.links.length > 0) {
          setLinks(s.config.links);
          setActive(s.config.active);
        } else if (s.connected) {
          void runScan();
        }
      })
      .catch(() => setMessage({ kind: "error", text: "Chargement impossible. Rechargez la page." }));
  }, [runScan]);

  function patch(id: string, change: Partial<AutofillLink>) {
    setLinks((all) => all.map((l) => (linkId(l) === id ? { ...l, ...change } : l)));
    setDirty(true);
    setMessage(null);
  }

  async function save(nextActive: boolean, ok: string) {
    setSaving(true);
    setMessage(null);
    try {
      const r = await json<{ config: AutofillConfig }>("/api/hubspot-autofill", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links, active: nextActive }),
      });
      setLinks(r.config.links);
      setActive(r.config.active);
      setDirty(false);
      setMessage({ kind: "ok", text: ok });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Enregistrement impossible." });
    } finally {
      setSaving(false);
    }
  }

  const back = (
    <Link href="/settings/connexions" className="text-[13px] font-medium text-[color:var(--muted-foreground)] hover:text-foreground">
      ← Connexions
    </Link>
  );

  if (scan) return <Waiting step={scan.step} counts={scan.counts} />;

  if (!status) {
    return (
      <div className="space-y-4">
        {back}
        {message ? <p className="text-[14px] text-rose-700">{message.text}</p> : <div className="h-40 animate-pulse rounded-2xl bg-[color:var(--muted)]" />}
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="space-y-4">
        {back}
        <div className="rounded-2xl border border-border bg-white p-6">
          <h2 className="text-[20px] font-bold text-foreground">Connectez d&apos;abord HubSpot</h2>
          <p className="mt-2 text-[14.5px] text-[color:var(--muted-foreground)]">
            Brief lira ensuite vos propriétés et vous proposera celles qu&apos;il peut remplir après chaque call.
          </p>
          <a href="/api/crm/hubspot/start" className={`${PRIMARY_BTN} mt-4`}>
            Connecter HubSpot
          </a>
        </div>
      </div>
    );
  }

  const enabled = links.filter((l) => l.enabled);
  const toCheck = enabled.filter((l) => l.check !== null).length;
  const shown = links.filter((l) => l.object === tab);
  const companyBlocked = !status.canWriteCompanies && enabled.some((l) => l.object === "company");

  return (
    <div className="flex flex-col gap-[18px]">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-[color:var(--primary)]">Paramètres · HubSpot</p>
          <h2 className="mt-1 text-[26px] font-bold leading-tight text-foreground">Ce que Brief remplit après chaque call</h2>
        </div>
        {links.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {active ? (
              <>
                <button className={GHOST_BTN} disabled={saving} onClick={() => save(false, "Mise à jour automatique désactivée. Brief n'écrit plus dans ces propriétés.")}>
                  Désactiver
                </button>
                <button className={PRIMARY_BTN} disabled={saving || !dirty} onClick={() => save(true, "Liste enregistrée. Elle s'applique dès le prochain call.")}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </>
            ) : (
              <button
                className={PRIMARY_BTN}
                disabled={saving || enabled.length === 0}
                onClick={() => save(true, "C'est activé. Après chaque call, Brief remplit ces propriétés tout seul.")}
              >
                {saving ? "Activation…" : "Activer la mise à jour automatique"}
              </button>
            )}
          </div>
        )}
      </div>

      {message && (
        <p role="status" className={`rounded-2xl px-5 py-3 text-[14px] font-medium ${message.kind === "ok" ? "bg-[color:var(--success-soft)] text-emerald-700" : "bg-[color:var(--danger-soft)] text-rose-700"}`}>
          {message.text}
        </p>
      )}

      {links.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-6">
          <p className="text-[14.5px] text-[color:var(--muted-foreground)]">Brief n&apos;a pas encore lu votre HubSpot.</p>
          <button className={`${PRIMARY_BTN} mt-4`} onClick={() => void runScan()}>
            Lire mon HubSpot
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-[#EEF2FD] px-5 py-4 text-[14.5px] text-foreground sm:px-6">
            <span>
              {active ? (
                <>
                  <strong>La mise à jour automatique est active.</strong> Après chaque call, Brief remplit {enabled.length} propriété{enabled.length > 1 ? "s" : ""} de votre HubSpot.
                </>
              ) : (
                <>
                  <strong>
                    Brief a relié {enabled.length} propriété{enabled.length > 1 ? "s" : ""} de votre HubSpot.
                  </strong>{" "}
                  Vérifiez la liste, décochez ce que vous ne voulez pas, puis activez.
                </>
              )}
            </span>
            {toCheck > 0 && <span className="font-semibold text-[#7A4A00]">{toCheck} à vérifier</span>}
          </div>

          {companyBlocked && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F3D6A6] bg-white px-5 py-4 text-[14px] text-[#7A4A00] sm:px-6">
              <span>Brief n&apos;a pas encore le droit d&apos;écrire sur les entreprises de votre HubSpot. Reconnectez HubSpot pour l&apos;autoriser.</span>
              <a href="/api/crm/hubspot/start" className="font-semibold underline">
                Reconnecter HubSpot
              </a>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Objet HubSpot">
            {AUTOFILL_OBJECTS.map((o) => {
              const n = links.filter((l) => l.object === o && l.enabled).length;
              const on = o === tab;
              return (
                <button
                  key={o}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(o)}
                  className={`h-11 rounded-full border px-[18px] text-[13.5px] transition-colors ${on ? "border-[color:var(--primary)] bg-[#EEF2FD] font-semibold text-[#1E46B4]" : "border-border bg-white font-medium text-[color:var(--muted-foreground)] hover:text-foreground"}`}
                >
                  {OBJECT_LABELS[o]} · {n}
                </button>
              );
            })}
            <button className="ml-auto h-11 px-2 text-[13.5px] font-semibold text-[color:var(--primary)] hover:underline" onClick={() => void runScan()}>
              Relire mon HubSpot
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-white px-5 pb-2 pt-1.5 sm:px-6">
            <div className={`hidden border-b border-border py-3 text-[12.5px] font-semibold text-[color:var(--muted-foreground)] ${COLS}`}>
              <span>Propriété HubSpot</span>
              <span>Ce que Brief y écrit</span>
              <span>Exemple, déjà dans votre HubSpot</span>
              <span>Quand</span>
              <span>Active</span>
            </div>
            {shown.length === 0 && (
              <p className="py-6 text-[14px] text-[color:var(--muted-foreground)]">
                Brief n&apos;a trouvé aucune propriété à remplir sur cet objet.
              </p>
            )}
            {shown.map((l, i) => {
              const id = linkId(l);
              return (
                <div key={id} className={`relative flex flex-col gap-1.5 py-3 pr-10 text-[14px] md:py-2 md:pr-0 ${COLS} ${i < shown.length - 1 ? "border-b border-[#EEF0F4]" : ""} ${l.enabled ? "" : "text-[color:var(--muted-foreground)]"}`}>
                  <span className="min-w-0">
                    <strong className="break-words font-semibold text-foreground">{l.label}</strong>
                    {l.check !== null && (
                      <span className="block text-[12.5px] font-semibold text-[#7A4A00]">À vérifier{l.check ? ` · ${l.check}` : ""}</span>
                    )}
                  </span>
                  <span className="min-w-0 break-words text-[color:var(--muted-foreground)]">{l.what}</span>
                  <span className="min-w-0 break-words text-[color:var(--muted-foreground)]">
                    <span className="md:hidden">Exemple : </span>
                    {l.example ?? "Aucun exemple"}
                  </span>
                  <select
                    aria-label={`Quand écrire ${l.label}`}
                    value={l.mode}
                    disabled={!l.enabled}
                    onChange={(e) => patch(id, { mode: e.target.value as AutofillMode })}
                    className="h-9 w-full min-w-0 max-w-[260px] truncate rounded-lg border border-border bg-white px-2 text-[13px] text-foreground disabled:opacity-50 md:max-w-none"
                  >
                    {AUTOFILL_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="checkbox"
                    checked={l.enabled}
                    aria-label={`Activer ${l.label}`}
                    onChange={(e) => patch(id, { enabled: e.target.checked })}
                    className="absolute right-0 top-3.5 h-5 w-5 accent-[color:var(--primary)] md:static"
                  />
                </div>
              );
            })}
          </div>

          <p className="text-[13.5px] text-[color:var(--muted-foreground)]">
            Brief n&apos;écrit que ce que le prospect a confirmé et ne remplace jamais une valeur saisie à la main, sauf si vous choisissez « même si elle est remplie ». Montant, date de clôture et étape du deal sont proposés comme le reste : décochez-les si vous préférez les garder à la main.
          </p>
        </>
      )}
    </div>
  );
}
