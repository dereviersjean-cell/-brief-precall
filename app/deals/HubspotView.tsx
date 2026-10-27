"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEAL_MEMORY_FIELDS, type DealMemoryFieldKey } from "@/lib/deal-memory-schema";
import { buildFieldPlans } from "@/lib/hubspot-overview";
import type { HubspotOverview } from "@/lib/hubspot-overview-load";

// Onglet « HubSpot » de Deals de l'équipe (demande de Jean du 27/10/2026) :
// au même endroit, l'automatisation (allumée ou non, avec quel compte, ce qui
// se passe après un call), les propriétés trouvées dans le HubSpot du client
// et ce que Brief écrit dans chacune, un exemple réel et les derniers envois.
// Les réglages s'enregistrent par /api/deal-memory/hubspot-mapping, comme
// depuis la fiche d'un call.

const CARD = "rounded-2xl border border-border bg-white p-5 sm:p-6";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";

function when(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

function rule(key: DealMemoryFieldKey, written: boolean): string {
  if (!written) return "Pas écrite dans une propriété : elle figure dans la note.";
  if (key === "prochaines_etapes") return "Remplacée après chaque call par les prochaines étapes qu'il a fixées.";
  return "Remplacée par ce qu'en a dit le dernier call qui en parle. Si aucun call n'en parle, la valeur saisie reste.";
}

const STEPS = [
  { title: "Le call est enregistré", text: "Analyse et fiche du call, quelques minutes après" },
  { title: "Le deal HubSpot est retrouvé", text: "Par le contact du call, son entreprise ou son nom" },
  { title: "Les propriétés sont mises à jour", text: "Celles reliées ci-dessous, rien d'autre" },
  { title: "Une note de synthèse est posée", text: "Une par call, remplacée si on renvoie" },
];

export default function HubspotView({ initial = null }: { initial?: HubspotOverview | null }) {
  const [data, setData] = useState<HubspotOverview | null>(initial);
  const [draft, setDraft] = useState<Partial<Record<DealMemoryFieldKey, string>>>(initial?.mapping ?? {});
  const [autoPush, setAutoPush] = useState(initial?.autoPush ?? true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    fetch("/api/deals/hubspot")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: HubspotOverview) => {
        if (cancelled) return;
        setData(d);
        setDraft(d.mapping);
        setAutoPush(d.autoPush);
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [initial]);

  if (loadError) return <p className={`${CARD} text-[13.5px] text-rose-700`}>Impossible de lire la configuration HubSpot. Réessayez dans un instant.</p>;
  if (!data) return <p className="text-[13.5px] text-slate-500">Lecture de votre HubSpot…</p>;

  const plans = buildFieldPlans(draft, data.properties);
  const linked = plans.filter((p) => p.property).length;
  const dirty = autoPush !== data.autoPush || DEAL_MEMORY_FIELDS.some((f) => (draft[f.key] ?? "") !== (data.mapping[f.key] ?? ""));
  const set = (key: DealMemoryFieldKey, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus("idle");
  };

  async function save() {
    setStatus("saving");
    const mapping = Object.fromEntries(DEAL_MEMORY_FIELDS.map((f) => [f.key, draft[f.key] ?? ""]));
    const res = await fetch("/api/deal-memory/hubspot-mapping", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping, autoPush }),
    }).catch(() => null);
    if (!res?.ok) return setStatus("error");
    setData((d) => (d ? { ...d, mapping: draft, autoPush } : d));
    setStatus("saved");
  }

  return (
    <div className="space-y-5">
      {/* L'automatisation */}
      <section className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={LABEL}>L&apos;automatisation</h2>
            <p className="mt-2 flex items-center gap-2 text-[17px] font-semibold text-slate-900">
              <span className={`h-2.5 w-2.5 rounded-full ${data.connected && autoPush ? "bg-emerald-500" : "bg-slate-300"}`} />
              {!data.connected ? "HubSpot n'est pas connecté" : autoPush ? "HubSpot est mis à jour après chaque call" : "Mise à jour automatique coupée"}
            </p>
            <p className="mt-1 text-[13px] text-slate-500">
              {data.connected ? (
                <>
                  Connecté avec le compte HubSpot de {data.connectedAs ?? "un membre de l'équipe"}
                  {data.portalId ? ` · portail ${data.portalId}` : ""}. Chaque envoi utilise la connexion du commercial du call quand il en a une.
                </>
              ) : (
                <>
                  Personne n&apos;a connecté HubSpot dans votre équipe :{" "}
                  <Link href="/settings/connexions" className="font-medium text-[color:var(--violet)] hover:underline">
                    Paramètres › Connexions
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
          {data.connected && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-full bg-slate-50 px-3.5 py-2 text-[13px] font-medium text-slate-800">
              <input
                type="checkbox"
                checked={autoPush}
                onChange={(e) => {
                  setAutoPush(e.target.checked);
                  setStatus("idle");
                }}
                className="h-4 w-4"
              />
              Mettre à jour après chaque call
            </label>
          )}
        </div>
        <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className={`rounded-xl px-3.5 py-3 ${autoPush && data.connected ? "bg-slate-50" : "bg-slate-50 opacity-60"}`}>
              <p className="text-[12px] font-semibold text-slate-400">{i + 1}</p>
              <p className="text-[13.5px] font-semibold text-slate-900">{s.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12.5px] text-slate-500">
          Brief ne crée jamais de deal, n&apos;efface jamais ce qu&apos;un commercial a saisi, et n&apos;écrit que dans les propriétés reliées ci-dessous.
        </p>
      </section>

      {/* Les propriétés */}
      <section className={CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={LABEL}>Ce que Brief écrit dans vos deals HubSpot</h2>
          {data.connected && !data.propertiesError && (
            <p className="text-[12.5px] text-slate-500">
              {data.properties.length} propriété{data.properties.length > 1 ? "s" : ""} texte modifiable{data.properties.length > 1 ? "s" : ""} trouvée
              {data.properties.length > 1 ? "s" : ""} dans votre HubSpot · {linked} information{linked > 1 ? "s" : ""} reliée{linked > 1 ? "s" : ""}
            </p>
          )}
        </div>
        {data.propertiesError && <p className="mt-2 text-[13px] text-rose-700">Les propriétés de votre HubSpot n&apos;ont pas pu être lues : les réglages restent ceux enregistrés.</p>}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="text-[12px] text-slate-500">
                <th className="py-2 pr-3 font-medium">Information de la fiche</th>
                <th className="py-2 pr-3 font-medium">Propriété HubSpot</th>
                <th className="py-2 font-medium">Comment elle est mise à jour</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.key} className="border-t border-border align-top">
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${p.property ? "bg-emerald-500" : "bg-slate-300"}`} />
                      {p.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <select
                      value={draft[p.key] ?? ""}
                      disabled={!data.connected || data.propertiesError}
                      onChange={(e) => set(p.key, e.target.value)}
                      className="h-9 w-full max-w-[280px] rounded-lg border border-border bg-white px-2 text-[13px] text-slate-900 disabled:bg-slate-50"
                    >
                      <option value="">Ne pas écrire</option>
                      {p.property && !data.properties.some((x) => x.name === p.property!.name) && <option value={p.property.name}>{p.property.label}</option>}
                      {data.properties.map((x) => (
                        <option key={x.name} value={x.name}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                    {p.suggestion && (
                      <p className="mt-1.5 text-[12px] text-amber-800">
                        Détectée : « {p.suggestion.label} »{" "}
                        <button onClick={() => set(p.key, p.suggestion!.name)} className="font-semibold underline-offset-2 hover:underline">
                          Utiliser
                        </button>
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-[12.5px] leading-snug text-slate-600">{rule(p.key, !!p.property)}</td>
                </tr>
              ))}
              <tr className="border-t border-border align-top">
                <td className="py-3 pr-3">
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    Note de synthèse
                  </span>
                </td>
                <td className="py-3 pr-3 text-slate-700">Une note sur le deal</td>
                <td className="py-3 text-[12.5px] leading-snug text-slate-600">
                  Prochaines étapes, points d&apos;attention, puis tout ce que la fiche a retenu. Une note par call, remplacée si on renvoie la fiche.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {data.connected && !data.propertiesError && plans.some((p) => !p.property && !p.suggestion) && (
          <p className="mt-3 rounded-xl bg-amber-50/60 px-3.5 py-2.5 text-[12.5px] leading-snug text-amber-900">
            Votre HubSpot n&apos;a pas de propriété pour {plans.filter((p) => !p.property && !p.suggestion).length} de ces informations : elles restent dans la
            note. Pour les avoir en propriétés, créez-les dans HubSpot (Paramètres › Propriétés › Deal), elles apparaîtront ici.
          </p>
        )}
        {data.connected && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={save}
              disabled={!dirty || status === "saving"}
              className="inline-flex h-10 items-center rounded-full bg-[color:var(--primary)] px-5 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {status === "saving" ? "Enregistrement…" : "Enregistrer"}
            </button>
            {status === "saved" && <span className="text-[13px] text-emerald-700">Enregistré : le prochain call suivra ces réglages.</span>}
            {status === "error" && <span className="text-[13px] text-rose-700">Enregistrement impossible, réessayez.</span>}
          </div>
        )}
      </section>

      {/* Un exemple réel */}
      {data.example && (
        <section className={CARD}>
          <h2 className={LABEL}>Un exemple réel</h2>
          <p className="mt-2 text-[13.5px] text-slate-700">
            Ce que Brief écrirait aujourd&apos;hui pour le dernier envoi, avec les réglages ci-dessus : le call{" "}
            <span className="font-medium">{data.example.callTitle ?? `du ${data.example.callDay ?? "—"}`}</span>, dans le deal{" "}
            <span className="font-medium">{data.example.dealName ?? "—"}</span>.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div>
              <h3 className="mb-2 text-[12px] font-semibold text-slate-500">Propriétés mises à jour</h3>
              {Object.keys(data.example.properties).length === 0 ? (
                <p className="text-[13px] text-slate-500">Aucune : aucune information n&apos;est reliée à une propriété.</p>
              ) : (
                <dl className="space-y-2.5">
                  {Object.entries(data.example.properties).map(([name, value]) => (
                    <div key={name} className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                      <dt className="text-[12px] font-semibold text-slate-500">{data.properties.find((p) => p.name === name)?.label ?? name}</dt>
                      <dd className="mt-0.5 whitespace-pre-line text-[13px] leading-snug text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-[12px] font-semibold text-slate-500">La note posée sur le deal</h3>
              {/* HTML construit par lib/deal-memory-hubspot.ts, textes échappés. */}
              <div
                className="max-h-[360px] overflow-y-auto rounded-xl border border-border px-4 py-3 text-[13px] leading-snug text-slate-700 [&_li]:ml-4 [&_li]:list-disc [&_p]:mt-2 [&_strong]:text-slate-900 [&_ul]:mt-1"
                dangerouslySetInnerHTML={{ __html: data.example.noteHtml }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Les derniers envois */}
      <section className={CARD}>
        <h2 className={`${LABEL} mb-3`}>Derniers envois dans HubSpot</h2>
        {data.history.length === 0 ? (
          <p className="text-[13px] text-slate-500">Aucune fiche n&apos;a encore été envoyée dans HubSpot.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.history.map((h) => (
              <li key={h.callId} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 text-[13px]">
                <span className="w-28 shrink-0 tabular-nums text-slate-500">{when(h.pushedAt)}</span>
                {h.dealId ? (
                  <Link href={`/deal/${h.dealId}`} className="font-semibold text-slate-900 hover:underline">
                    {h.dealName ?? "Deal"}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-900">{h.dealName ?? "Deal"}</span>
                )}
                <Link href={`/feedback/${h.callId}`} className="min-w-0 truncate text-slate-600 hover:underline">
                  {h.callTitle ?? "Call"}
                </Link>
                {h.ownerName && <span className="text-slate-400">· {h.ownerName}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
