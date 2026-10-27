"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import CompanyLogo from "@/app/components/CompanyLogo";
import { adviceFor } from "@/lib/deal-advice";
import type { DealProgress, FocusStatus } from "@/lib/deal-progress";

// Vue commercial « Mes deals », version D3 « coach » (choisie par Jean le
// 27/10/2026 parmi les propositions, avec la consigne de rester en posture de
// conseil actionnable). À gauche, les deals groupés par urgence ; à droite,
// le deal choisi : le conseil de Brief (quoi, pourquoi avec la phrase du call,
// ce que vous pouvez dire, pour quand), ce que vous savez, les calls. Le
// conseil est construit par lib/deal-advice.ts.

const STATUS: Record<FocusStatus, { label: string; group: string; text: string; soft: string }> = {
  relancer: { label: "À relancer", group: "À faire aujourd'hui", text: "#BE123C", soft: "#FFF1F2" },
  traiter: { label: "À traiter", group: "Cette semaine", text: "#B45309", soft: "#FFFBEB" },
  bonne_voie: { label: "En bonne voie", group: "En bonne voie", text: "#047857", soft: "#ECFDF5" },
};
const ORDER: FocusStatus[] = ["relancer", "traiter", "bonne_voie"];

function longDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

function hue(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// Le logo de l'entreprise (trouvé par le serveur, app/api/company-logo),
// sinon son initiale sur une teinte propre au deal.
function Avatar({ d, size }: { d: DealProgress; size: 34 | 46 }) {
  const h = hue(d.name);
  return (
    <CompanyLogo
      domain={d.domain}
      name={d.name}
      alt={d.name}
      className={`${size > 40 ? "h-[46px] w-[46px]" : "h-[34px] w-[34px]"} shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-stone-200`}
      fallback={
        <span
          className="grid shrink-0 place-items-center rounded-xl font-semibold"
          style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${h} 70% 94%)`, color: `hsl(${h} 55% 32%)` }}
        >
          {d.name.charAt(0).toUpperCase()}
        </span>
      }
    />
  );
}

function Ring({ value, total }: { value: number; total: number }) {
  const size = 58;
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value} informations clés sur ${total}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7e5e4" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#059669"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(value / total) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#1c1917">
        {value}/{total}
      </text>
    </svg>
  );
}

// Une phrase prête à dire, copiable d'un clic.
function Line({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const quoted = /^«.*»$/.test(text.trim());
  return (
    <li className="group flex gap-2.5 text-[14px] leading-relaxed text-stone-800">
      <span className="mt-0.5 text-emerald-600">→</span>
      <span className="min-w-0 flex-1">{text}</span>
      {quoted && (
        <button
          onClick={() => {
            navigator.clipboard
              ?.writeText(text.replace(/^«\s*|\s*»$/g, ""))
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => {});
          }}
          className="shrink-0 self-start rounded-md px-2 py-0.5 text-[12px] font-medium text-stone-400 hover:bg-white hover:text-stone-700"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      )}
    </li>
  );
}

function Detail({ d }: { d: DealProgress }) {
  const a = adviceFor(d);
  const st = STATUS[d.focus.status];
  return (
    <article className="rounded-2xl bg-white p-5 ring-1 ring-stone-200 sm:p-7">
      <div className="flex items-center gap-3.5">
        <Avatar d={d} size={46} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium" style={{ color: st.text }}>
            {st.label} · {d.hubspot?.stage ?? "Hors HubSpot"} · R{d.steps.length}
          </p>
          <h2 className="truncate text-[22px] font-semibold tracking-[-0.025em] text-stone-900">{d.name}</h2>
        </div>
        <Ring value={d.known} total={d.total} />
      </div>

      <div className="mt-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-emerald-700">Le conseil de Brief</p>
        <p className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-stone-900">{a.title}</p>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-stone-600">{a.why}</p>
      </div>

      {a.quote && (
        <blockquote className="mt-4 border-l-[3px] border-emerald-500 pl-4 text-[14px] italic leading-relaxed text-stone-700">
          « {a.quote.text} »{a.quote.speaker && <span className="block pt-1 text-[12px] not-italic text-stone-400">{a.quote.speaker}</span>}
        </blockquote>
      )}

      <div className="mt-6 rounded-2xl bg-stone-50 p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-500">Ce que vous pouvez dire · {a.when}</p>
        <ul className="mt-2.5 space-y-2.5">
          {a.how.map((h) => (
            <Line key={h} text={h} />
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/deal/${d.id}`} className="inline-flex h-9 items-center rounded-full bg-stone-900 px-4 text-[13px] font-semibold text-white hover:bg-stone-800">
          Ouvrir le deal
        </Link>
        <Link
          href={`/feedback/${d.lastCall.id}`}
          className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
        >
          Revoir le dernier call
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 border-t border-stone-100 pt-5 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[12px] font-semibold text-stone-500">Ce que vous savez</h3>
          <ul className="space-y-1.5 text-[13px]">
            {d.checklist.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                <span
                  className="grid h-4 w-4 place-items-center rounded text-[10px] font-bold text-white"
                  style={c.known ? { background: "#059669" } : { boxShadow: "inset 0 0 0 1.5px #d6d3d1" }}
                >
                  {c.known ? "✓" : ""}
                </span>
                <span className={c.known ? "text-stone-800" : "font-medium text-stone-900"}>{c.label}</span>
                {!c.known && <span className="text-[11px] font-semibold text-amber-700">à obtenir</span>}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-[12px] font-semibold text-stone-500">Les calls</h3>
          <ol className="space-y-2.5">
            {d.steps.map((s, i) => (
              <li key={s.callId}>
                <Link href={`/feedback/${s.callId}`} className="flex items-start gap-2.5 text-[13px] hover:opacity-80">
                  <span
                    className={`mt-0.5 grid h-6 w-7 shrink-0 place-items-center rounded-md text-[11px] font-bold ${
                      s.alertCount > 2 ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    R{i + 1}
                  </span>
                  <span>
                    <span className="text-stone-800">{longDay(s.callAt)}</span>
                    <span className="block text-[12px] text-stone-500">
                      {s.known}/{d.total} infos{s.learned.length > 0 && i > 0 ? ` · +${s.learned.length}` : ""}
                      {s.alertCount ? ` · ${s.alertCount} alerte${s.alertCount > 1 ? "s" : ""}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}

export default function MesDealsView({ deals, closed }: { deals: DealProgress[]; closed: number }) {
  const [selectedId, setSelectedId] = useState<string | null>(deals[0]?.id ?? null);
  const detailRef = useRef<HTMLDivElement>(null);

  if (deals.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-5 text-[13.5px] text-stone-500 ring-1 ring-stone-200">
        Aucun deal suivi pour l&apos;instant : chaque call enregistré crée ou complète le deal de son prospect.
      </p>
    );
  }
  const selected = deals.find((d) => d.id === selectedId) ?? deals[0];

  function select(id: string) {
    setSelectedId(id);
    // Sur téléphone, le détail est sous la liste : on y descend.
    if (window.matchMedia("(max-width: 1023px)").matches) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 text-[12.5px]">
        {ORDER.map((s) => (
          <span key={s} className="rounded-full px-2.5 py-1 font-semibold" style={{ background: STATUS[s].soft, color: STATUS[s].text }}>
            {deals.filter((d) => d.focus.status === s).length} {STATUS[s].label.toLowerCase()}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          {ORDER.map((status) => {
            const list = deals.filter((d) => d.focus.status === status);
            if (list.length === 0) return null;
            return (
              <section key={status}>
                <h3 className="mb-2 px-1 text-[12px] font-semibold text-stone-500">
                  {STATUS[status].group} · {list.length}
                </h3>
                <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
                  {list.map((d) => (
                    <li key={d.id} className="border-b border-stone-100 last:border-0">
                      <button
                        onClick={() => select(d.id)}
                        aria-current={d.id === selected.id}
                        className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${d.id === selected.id ? "bg-emerald-50/70" : "hover:bg-stone-50"}`}
                      >
                        <Avatar d={d} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold text-stone-900">{d.name}</p>
                          <p className="truncate text-[12px] text-stone-500">{d.focus.action}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {closed > 0 && (
            <p className="px-1 text-[12px] text-stone-400">
              {closed} deal{closed > 1 ? "s" : ""} clos dans HubSpot, non affiché{closed > 1 ? "s" : ""}.
            </p>
          )}
        </div>
        <div ref={detailRef} className="min-w-0 scroll-mt-20">
          <Detail d={selected} />
        </div>
      </div>
    </div>
  );
}
