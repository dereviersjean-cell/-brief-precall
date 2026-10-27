"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plug } from "lucide-react";
import { AdminCard, AdminPageHeader, AdminPageShell } from "@/app/admin/AdminShell";
import type { DealMemoryFieldKey } from "@/lib/deal-memory-schema";
import { WRITE_MODES, type HubspotPropertyType, type PlannedWrite, type WriteMode } from "@/lib/hubspot-mapping";
import { briefPropertyLabel, typeCompatible, typeLabel, type SetupChoice } from "@/lib/hubspot-setup";
import type { HubspotSetupData } from "@/lib/hubspot-setup-load";

// Setup HubSpot d'un client, mené en call par l'équipe Brief (27/10/2026,
// demande de Jean). Dans l'ordre du call : la connexion et ses droits, le
// diagnostic de son HubSpot, la proposition de Brief information par
// information et les choix faits avec le client, une simulation sur un de ses
// vrais calls, puis l'application.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const SELECT = "h-9 w-full rounded-lg border border-border bg-white px-2 text-[13px] text-slate-900";

function percent(rate: number): string {
  return `${Math.round(rate * 100)} %`;
}

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }) : "—";
}

// Une valeur de liste déroulante pour un choix, et l'inverse.
function encode(choice: SetupChoice): string {
  return choice.kind === "existing" ? `p:${choice.property}` : choice.kind;
}

// Les choix partent de la proposition de Brief ; une information déjà réglée
// chez le client garde son réglage.
function initialChoices(json: HubspotSetupData): Partial<Record<DealMemoryFieldKey, SetupChoice>> {
  const out: Partial<Record<DealMemoryFieldKey, SetupChoice>> = {};
  for (const p of json.proposals) {
    const current = json.current.mapping[p.key];
    out[p.key] = current
      ? current.property.startsWith("brief_")
        ? { kind: "create", mode: current.mode }
        : { kind: "existing", property: current.property, type: current.type, mode: current.mode, ...(current.options ? { options: current.options } : {}) }
      : p.choice;
  }
  return out;
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <AdminCard>
      <p className={LABEL}>
        {step} · {title}
      </p>
      <div className="mt-3">{children}</div>
    </AdminCard>
  );
}

export default function HubspotSetupClient({
  organizationId,
  organizationName,
  initial = null,
}: {
  organizationId: string;
  organizationName: string;
  // Données déjà lues (aperçu local) : pas de lecture au premier affichage.
  initial?: HubspotSetupData | null;
}) {
  const [data, setData] = useState<HubspotSetupData | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Partial<Record<DealMemoryFieldKey, SetupChoice>>>(() => (initial ? initialChoices(initial) : {}));
  const [showAll, setShowAll] = useState(false);
  const [callId, setCallId] = useState<string>(initial?.calls[0]?.id ?? "");
  const [simulation, setSimulation] = useState<{ plans: PlannedWrite[]; noteHtml: string } | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [autoPush, setAutoPush] = useState(initial?.current.autoPush ?? true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{ created: string[] } | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Lit le diagnostic du HubSpot du client.
  async function fetchSetup(): Promise<HubspotSetupData | string> {
    const res = await fetch(`/api/admin/organizations/${organizationId}/hubspot-setup`).catch(() => null);
    const json = (await res?.json().catch(() => null)) as (HubspotSetupData & { error?: string }) | null;
    return !res?.ok || !json || json.error ? json?.error ?? "Analyse impossible." : json;
  }

  function accept(result: HubspotSetupData | string) {
    if (typeof result === "string") return setError(result);
    setData(result);
    setAutoPush(result.current.autoPush);
    setCallId(result.calls[0]?.id ?? "");
    setChoices(initialChoices(result));
  }

  function reload() {
    setData(null);
    setError(null);
    void fetchSetup().then(accept);
  }

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    fetchSetup().then((result) => !cancelled && accept(result));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const byName = useMemo(() => new Map((data?.properties ?? []).map((p) => [p.name, p])), [data]);
  const labelOf = (name: string) => (name.startsWith("brief_") ? `Brief · ${name}` : byName.get(name)?.label ?? name);

  function setChoice(key: DealMemoryFieldKey, value: string) {
    setSimulation(null);
    setApplied(null);
    const mode: WriteMode = choices[key] && choices[key]!.kind !== "note" ? (choices[key] as { mode: WriteMode }).mode : key === "prochaines_etapes" ? "update_unless_edited" : "fill_if_empty";
    if (value === "note") return setChoices((c) => ({ ...c, [key]: { kind: "note" } }));
    if (value === "create") return setChoices((c) => ({ ...c, [key]: { kind: "create", mode } }));
    const name = value.slice(2);
    const def = byName.get(name);
    if (!def) return;
    const yes = def.type === "bool" ? "true" : def.options.find((o) => /^(oui|yes|true|confirm|identifi|valid)/i.test(o.label))?.value;
    setChoices((c) => ({
      ...c,
      [key]: {
        kind: "existing",
        property: name,
        type: def.type as HubspotPropertyType,
        mode,
        ...(def.type === "enumeration" || def.type === "bool" ? { options: yes ? { confirme: yes } : {} } : {}),
      },
    }));
  }

  function patchChoice(key: DealMemoryFieldKey, patch: Partial<{ mode: WriteMode; confirme: string; evoque: string }>) {
    setSimulation(null);
    setApplied(null);
    setChoices((c) => {
      const choice = c[key];
      if (!choice || choice.kind === "note") return c;
      if (choice.kind === "create") return { ...c, [key]: { ...choice, ...(patch.mode ? { mode: patch.mode } : {}) } };
      const options = { ...(choice.options ?? {}) };
      if ("confirme" in patch) options.confirme = patch.confirme || undefined;
      if ("evoque" in patch) options.evoque = patch.evoque || undefined;
      return { ...c, [key]: { ...choice, ...(patch.mode ? { mode: patch.mode } : {}), options } };
    });
  }

  async function simulate() {
    setSimulating(true);
    setSimError(null);
    const res = await fetch(`/api/admin/organizations/${organizationId}/hubspot-setup/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, choices }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { plans?: PlannedWrite[]; noteHtml?: string; error?: string } | null;
    setSimulating(false);
    if (!res?.ok || !json?.plans) return setSimError(json?.error ?? "Simulation impossible.");
    setSimulation({ plans: json.plans, noteHtml: json.noteHtml ?? "" });
  }

  async function apply() {
    setApplying(true);
    setApplyError(null);
    const res = await fetch(`/api/admin/organizations/${organizationId}/hubspot-setup`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choices, autoPush }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { created?: string[]; error?: string } | null;
    setApplying(false);
    if (!res?.ok) return setApplyError(json?.error ?? "Application impossible.");
    setApplied({ created: json?.created ?? [] });
  }

  const toCreate = Object.entries(choices).filter(([key, c]) => c?.kind === "create" && !byName.has(`brief_${key}`));

  return (
    <AdminPageShell maxWidth="max-w-6xl">
      <Link href={`/admin/clients/${organizationId}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        {organizationName}
      </Link>
      <AdminPageHeader icon={Plug} eyebrow="Setup HubSpot" title={organizationName} subtitle="À mener en call avec le client, écran partagé : ce que Brief écrira dans son HubSpot, et comment." />

      {error && (
        <AdminCard>
          <p className="text-[13.5px] text-rose-700">{error}</p>
          <button onClick={reload} className="mt-3 text-[13px] font-medium text-[color:var(--violet)] hover:underline">
            Relancer l&apos;analyse
          </button>
        </AdminCard>
      )}
      {!data && !error && <p className="text-[13.5px] text-slate-500">Analyse du HubSpot du client : propriétés, pipelines et derniers deals…</p>}

      {data && (
        <div className="space-y-6">
          <Section step={1} title="La connexion">
            {data.connected ? (
              <div className="space-y-1.5 text-[13.5px] text-slate-700">
                <p>
                  HubSpot connecté par <span className="font-semibold text-slate-900">{data.connectedAs ?? "un membre de l'équipe"}</span>
                  {data.portalId ? ` · portail ${data.portalId}` : ""}.
                </p>
                <p className={data.canCreateProperties ? "text-emerald-700" : "text-amber-800"}>
                  {data.canCreateProperties
                    ? "Brief peut créer des propriétés dans ce HubSpot."
                    : "Brief ne peut pas encore créer de propriétés : le client doit reconnecter HubSpot (Paramètres › Connexions) pour accorder ce droit. Ses propriétés existantes restent utilisables."}
                </p>
              </div>
            ) : (
              <div className="text-[13.5px] text-slate-700">
                <p>Personne n&apos;a connecté HubSpot chez ce client. Première étape du call : son manager se connecte à Brief et va dans Paramètres › Connexions › HubSpot.</p>
                <button onClick={reload} className="mt-3 inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium hover:bg-slate-50">
                  C&apos;est fait, relancer l&apos;analyse
                </button>
              </div>
            )}
          </Section>

          {data.connected && (
            <>
              <Section step={2} title="Le diagnostic de son HubSpot">
                <div className="flex flex-wrap gap-2 text-[12.5px]">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{data.dealsAnalyzed} derniers deals analysés</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                    {data.properties.filter((p) => p.custom).length} propriétés créées par le client
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">{data.verdict}</span>
                </div>

                <div className="mt-5 space-y-3">
                  {data.pipelines.map((p) => (
                    <div key={p.id}>
                      <p className="text-[13px] font-semibold text-slate-900">Pipeline « {p.label} »</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {p.stages.map((s, i) => (
                          <span key={s.id} className={`rounded-lg px-2.5 py-1 text-[12px] ${s.closed ? "bg-slate-50 text-slate-400" : "bg-slate-100 text-slate-700"}`}>
                            {i + 1}. {s.label} · <span className="font-semibold tabular-nums">{s.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[13px]">
                    <thead>
                      <tr className="text-[12px] text-slate-500">
                        <th className="py-2 pr-3 font-medium">Propriété de deal</th>
                        <th className="py-2 pr-3 font-medium">Type</th>
                        <th className="py-2 pr-3 font-medium">Remplie</th>
                        <th className="py-2 font-medium">Exemples réels</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAll ? data.properties : data.properties.slice(0, 15)).map((p) => (
                        <tr key={p.name} className="border-t border-border align-top">
                          <td className="py-2 pr-3">
                            <span className="font-medium text-slate-900">{p.label}</span>
                            <span className="block text-[11.5px] text-slate-400">
                              {p.name}
                              {p.custom ? "" : " · standard"}
                              {p.readOnly ? " · lecture seule" : ""}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-slate-600">{typeLabel(p.type)}</td>
                          <td className="py-2 pr-3 tabular-nums text-slate-700">{percent(p.fillRate)}</td>
                          <td className="py-2 text-slate-600">{p.samples.length ? p.samples.map((s) => `« ${s} »`).join(" · ") : <span className="text-slate-400">vide</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.properties.length > 15 && (
                  <button onClick={() => setShowAll((v) => !v)} className="mt-2 text-[13px] font-medium text-[color:var(--violet)] hover:underline">
                    {showAll ? "Réduire" : `Voir les ${data.properties.length} propriétés`}
                  </button>
                )}
              </Section>

              <Section step={3} title="Ce que Brief propose, et vos choix avec le client">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-[13px]">
                    <thead>
                      <tr className="text-[12px] text-slate-500">
                        <th className="w-[170px] py-2 pr-3 font-medium">Information</th>
                        <th className="py-2 pr-3 font-medium">Proposition de Brief</th>
                        <th className="w-[230px] py-2 pr-3 font-medium">Choix</th>
                        <th className="w-[230px] py-2 font-medium">Règle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.proposals.map((p) => {
                        const choice = choices[p.key] ?? p.choice;
                        const compatible = data.properties.filter((x) => !x.readOnly && typeCompatible(p.key, x.type) && !x.name.startsWith("brief_"));
                        const def = choice.kind === "existing" ? byName.get(choice.property) : undefined;
                        const isList = choice.kind === "existing" && (choice.type === "enumeration" || choice.type === "bool");
                        const listOptions = def?.type === "bool" ? [{ label: "Oui", value: "true" }, { label: "Non", value: "false" }] : def?.options ?? [];
                        return (
                          <tr key={p.key} className="border-t border-border align-top">
                            <td className="py-3 pr-3 font-medium text-slate-900">{p.label}</td>
                            <td className="py-3 pr-3 text-[12.5px] leading-snug text-slate-600">{p.reason}</td>
                            <td className="py-2.5 pr-3">
                              <select value={encode(choice)} onChange={(e) => setChoice(p.key, e.target.value)} className={SELECT}>
                                <option value="create">Créer « {briefPropertyLabel(p.key)} »</option>
                                <option value="note">Note seulement</option>
                                {compatible.map((x) => (
                                  <option key={x.name} value={`p:${x.name}`}>
                                    {x.label} ({typeLabel(x.type)}, {percent(x.fillRate)})
                                  </option>
                                ))}
                              </select>
                              {choice.kind === "create" && byName.has(`brief_${p.key}`) && <p className="mt-1 text-[11.5px] text-slate-500">Déjà créée chez le client.</p>}
                              {data.current.mapping[p.key] && (
                                <p className="mt-1 text-[11.5px] text-slate-500">Réglage actuel : {labelOf(data.current.mapping[p.key]!.property)}</p>
                              )}
                            </td>
                            <td className="py-2.5">
                              {choice.kind === "note" ? (
                                <span className="text-[12.5px] text-slate-500">Dans la note de synthèse seulement.</span>
                              ) : (
                                <div className="space-y-1.5">
                                  <select value={choice.mode} onChange={(e) => patchChoice(p.key, { mode: e.target.value as WriteMode })} className={SELECT}>
                                    {(Object.keys(WRITE_MODES) as WriteMode[]).map((m) => (
                                      <option key={m} value={m}>
                                        {m === "fill_if_empty" ? "Remplir si vide" : "Mettre à jour sauf saisie à la main"}
                                      </option>
                                    ))}
                                  </select>
                                  {isList && choice.kind === "existing" && (
                                    <>
                                      <label className="block text-[11.5px] text-slate-500">
                                        Si confirmé, écrire
                                        <select value={choice.options?.confirme ?? ""} onChange={(e) => patchChoice(p.key, { confirme: e.target.value })} className={`${SELECT} mt-0.5`}>
                                          <option value="">Rien</option>
                                          {listOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                              {o.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label className="block text-[11.5px] text-slate-500">
                                        Si seulement évoqué, écrire
                                        <select value={choice.options?.evoque ?? ""} onChange={(e) => patchChoice(p.key, { evoque: e.target.value })} className={`${SELECT} mt-0.5`}>
                                          <option value="">Rien</option>
                                          {listOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                              {o.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[12.5px] text-slate-500">
                  Dans tous les cas, seule l&apos;information confirmée par le prospect part dans une propriété, au format de la propriété ; le reste va dans la note
                  de synthèse posée sur le deal après chaque call.
                </p>
              </Section>

              <Section step={4} title="Simuler sur un vrai call">
                {data.calls.length === 0 ? (
                  <p className="text-[13.5px] text-slate-600">
                    Aucun call de ce client n&apos;est encore relié à un deal HubSpot. Pour montrer le résultat, importez le transcript d&apos;un de ses calls
                    (Paramètres › Tester un call, depuis son compte manager), puis relancez l&apos;analyse.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={callId} onChange={(e) => setCallId(e.target.value)} className={`${SELECT} max-w-md`}>
                        {data.calls.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.dealName ?? "Deal"} · {c.meeting_title ?? "Call"} · {day(c.started_at ?? c.created_at)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={simulate}
                        disabled={simulating || !callId}
                        className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-60"
                      >
                        {simulating ? "Simulation…" : "Simuler avec ces choix"}
                      </button>
                    </div>
                    {simError && <p className="mt-2 text-[13px] text-rose-700">{simError}</p>}
                    {simulation && (
                      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                        <ul className="space-y-2">
                          {simulation.plans.length === 0 && <li className="text-[13px] text-slate-500">Aucune propriété reliée : tout part dans la note.</li>}
                          {simulation.plans.map((p) => (
                            <li key={p.property} className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                              <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-slate-500">
                                {labelOf(p.property)}
                                <span className={`rounded-full px-2 py-0.5 text-[11px] ${p.action === "write" ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
                                  {p.action === "write" ? "Serait écrite" : `Pas écrite : ${p.reason?.toLowerCase()}`}
                                </span>
                              </p>
                              {p.value && <p className="mt-1 whitespace-pre-line text-[13px] text-slate-800">{p.value}</p>}
                              {p.current && p.reason !== "Déjà à jour" && <p className="mt-1 text-[12px] text-slate-400">Valeur actuelle : {p.current}</p>}
                            </li>
                          ))}
                        </ul>
                        <div
                          className="max-h-[360px] overflow-y-auto rounded-xl border border-border px-4 py-3 text-[13px] leading-snug text-slate-700 [&_li]:ml-4 [&_li]:list-disc [&_p]:mt-2 [&_strong]:text-slate-900 [&_ul]:mt-1"
                          dangerouslySetInnerHTML={{ __html: simulation.noteHtml }}
                        />
                      </div>
                    )}
                  </>
                )}
              </Section>

              <Section step={5} title="Appliquer">
                <div className="space-y-3 text-[13.5px] text-slate-700">
                  {toCreate.length > 0 && (
                    <p>
                      Brief va créer {toCreate.length} propriété{toCreate.length > 1 ? "s" : ""} dans le groupe « Brief » de son HubSpot :{" "}
                      {toCreate.map(([key]) => briefPropertyLabel(key as DealMemoryFieldKey)).join(", ")}.
                      {!data.canCreateProperties && <span className="text-amber-800"> Il faut d&apos;abord que le client reconnecte HubSpot.</span>}
                    </p>
                  )}
                  <label className="flex items-center gap-2.5">
                    <input type="checkbox" checked={autoPush} onChange={(e) => setAutoPush(e.target.checked)} className="h-4 w-4" />
                    Mettre à jour HubSpot automatiquement après chaque call
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={apply}
                      disabled={applying}
                      className="inline-flex h-10 items-center rounded-lg bg-[color:var(--primary)] px-4 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
                    >
                      {applying ? "Application…" : "Appliquer au HubSpot du client"}
                    </button>
                    {applied && (
                      <span className="text-[13px] text-emerald-700">
                        Appliqué.{applied.created.length > 0 ? ` Propriétés créées : ${applied.created.join(", ")}.` : ""} Le prochain call suivra ce réglage.
                      </span>
                    )}
                    {applyError && <span className="text-[13px] text-rose-700">{applyError}</span>}
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>
      )}
    </AdminPageShell>
  );
}
