"use client";

import { useState } from "react";
import { RECEPTION_CHANNELS, RECEPTION_EVENTS } from "@/lib/reception";

// La grille de réception : une ligne par information, une colonne par canal.
// Chaque case s'enregistre au clic, pour toute l'équipe.
export default function ReceptionClient({
  initial,
  members,
  slack,
  partial,
  inactive,
}: {
  initial: Record<string, boolean>;
  members: number;
  slack: boolean;
  partial: boolean;
  // Les informations pas encore envoyées sur ce compte : cases grisées.
  inactive: string[];
}) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channels = RECEPTION_CHANNELS.filter((c) => c.key !== "slack" || slack);

  async function toggle(event: string, channel: string) {
    const key = `${event}:${channel}`;
    const next = !enabled[key];
    setBusy(key);
    setError(null);
    setEnabled((prev) => ({ ...prev, [key]: next }));
    const res = await fetch("/api/notification-preferences/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: event, channel, enabled: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setEnabled((prev) => ({ ...prev, [key]: !next }));
      setError("Le réglage n'a pas pu être enregistré. Réessayez.");
    }
    setBusy(null);
  }

  const cols = { gridTemplateColumns: `minmax(0, 1fr) repeat(${channels.length + 1}, 96px)` };
  const head = "justify-self-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";

  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6" aria-labelledby="reception">
      <h2 id="reception" className="text-[17px] font-semibold text-slate-900">
        Où recevoir Brief
      </h2>
      <p className="mt-1 text-[13.5px] text-slate-500">
        Réglé pour toute l&apos;équipe ({members} personne{members > 1 ? "s" : ""}).
      </p>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[440px]">
          <div className="grid items-center gap-3 border-b border-border pb-2" style={cols}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Information</span>
            <span className={head}>Application</span>
            {channels.map((c) => (
              <span key={c.key} className={head}>
                {c.label}
              </span>
            ))}
          </div>
          {RECEPTION_EVENTS.map((e) => (
            <div key={e.key} className="grid items-center gap-3 border-b border-border py-3 last:border-0" style={cols}>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold text-slate-900">{e.label}</span>
                <span className="block text-[13px] text-slate-500">{inactive.includes(e.key) ? "Pas encore activées sur ce compte." : e.detail}</span>
              </span>
              <input type="checkbox" checked disabled aria-label={`${e.label} dans l'application`} className="h-[18px] w-[18px] justify-self-center" />
              {channels.map((c) => {
                const key = `${e.key}:${c.key}`;
                return (
                  <input
                    key={c.key}
                    type="checkbox"
                    checked={!!enabled[key]}
                    disabled={busy === key || inactive.includes(e.key)}
                    onChange={() => toggle(e.key, c.key)}
                    aria-label={`${e.label} par ${c.label}`}
                    className="h-[18px] w-[18px] justify-self-center"
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-[13px] text-rose-700">{error}</p>}
      {partial && <p className="mt-3 text-[13px] text-slate-500">Une case décochée peut être active chez une partie de l&apos;équipe : la cocher l&apos;active pour tous.</p>}
      {slack && <p className="mt-3 text-[13px] text-slate-500">Slack : chaque personne doit avoir connecté son compte dans Connexions.</p>}
    </section>
  );
}
