"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, Users } from "lucide-react";
import CompanyCard from "./CompanyCard";
import type { RegistryCompany } from "@/lib/company-registry";

// Deuxième écran d'une inscription libre, juste après la bienvenue (14/10/2026,
// demande de Jean) : le nom de l'entreprise, son site et le rôle de la
// personne. Brief lit alors le site et propose le profil (offre, cible,
// secteur, promesse), que les étapes suivantes font confirmer ou corriger —
// pour montrer dès la première minute ce que l'outil sait faire.

export type CompanyRole = "commercial" | "manager";

export type PrefillResult = {
  found: boolean;
  source?: "web" | "registre" | null;
  // Le site retenu par le serveur quand l'utilisateur n'en a pas donné.
  website?: string | null;
  whatYouSell: string;
  icp: string;
  sector: string;
  valueProposition: string;
};

const FIELD =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow] focus:border-[color:var(--violet)] focus:ring-4 focus:ring-[color:var(--violet)]/10";

const ROLES: { value: CompanyRole; title: string; text: string; icon: typeof Briefcase }[] = [
  { value: "commercial", title: "Commercial(e)", text: "Je mène mes propres rendez-vous", icon: Briefcase },
  { value: "manager", title: "Manager ou dirigeant(e)", text: "J'encadre une équipe commerciale", icon: Users },
];

const LOADING_STEPS = ["Recherche de votre entreprise", "Lecture de votre site", "Rédaction de votre profil"];

export default function CompanyStep({
  initialCompany,
  initialWebsite,
  onDone,
}: {
  initialCompany: string;
  initialWebsite: string;
  onDone: (result: {
    companyName: string;
    website: string;
    role: CompanyRole;
    prefill: PrefillResult | null;
    registry: RegistryCompany | null;
  }) => void;
}) {
  const [companyName, setCompanyName] = useState(initialCompany);
  const [website, setWebsite] = useState(initialWebsite);
  const [role, setRole] = useState<CompanyRole>("commercial");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // La fiche du registre arrive en une fraction de seconde : on la montre
  // pendant que l'IA lit le site.
  const [registry, setRegistry] = useState<RegistryCompany | null>(null);

  useEffect(() => {
    if (!loading) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, [loading]);

  async function prepare() {
    const name = companyName.trim();
    if (!name) return;
    setElapsed(0);
    setLoading(true);
    let prefill: PrefillResult | null = null;
    const registryPromise = fetch(`/api/onboarding/company?name=${encodeURIComponent(name)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ company: RegistryCompany | null }>) : { company: null }))
      .then((d) => {
        setRegistry(d.company);
        return d.company;
      })
      .catch(() => null);
    try {
      const res = await fetch("/api/onboarding/prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: name, website: website.trim() }),
      });
      if (res.ok) prefill = (await res.json()) as PrefillResult;
    } catch {
      // Sans proposition, l'onboarding continue à la main.
    }
    const found = await registryPromise;
    onDone({ companyName: name, website: website.trim() || prefill?.website || "", role, prefill, registry: found });
  }

  const card =
    "w-full max-w-2xl rounded-[28px] bg-white p-7 shadow-[0_1px_2px_rgba(42,92,224,0.06),0_24px_60px_-30px_rgba(42,92,224,0.45)] ring-1 ring-[color:var(--lavender-strong)] sm:p-10";

  if (loading) {
    // Mêmes repères que l'écran de génération d'un brief : on voit que ça
    // travaille, et sur quoi.
    const current = elapsed < 4 ? 0 : elapsed < 12 ? 1 : 2;
    const pct = Math.min(94, 100 * (1 - Math.exp(-elapsed / 9)));
    return (
      <div className={`${card} text-center`}>
        {/* La fiche trouvée au registre prend la place de l'anneau : on voit
            tout de suite que Brief a reconnu l'entreprise. */}
        {registry ? (
          <div className="text-left">
            <p className="mb-3 text-center text-[12px] font-semibold uppercase tracking-[0.1em] text-emerald-600">Entreprise trouvée</p>
            <CompanyCard company={registry} website={website.trim() || null} />
          </div>
        ) : (
        <div className="mx-auto grid h-20 w-20 place-items-center">
          <span
            className="absolute h-20 w-20 animate-[spin_2.4s_linear_infinite] rounded-full motion-reduce:animate-none"
            style={{
              background: "conic-gradient(from 0deg, #2A5CE0, #7B5CFF, rgba(123,92,255,0) 70%, #2A5CE0)",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
            }}
          />
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[color:var(--lavender)] text-[22px] font-semibold text-[color:var(--violet)]">
            {companyName.trim().charAt(0).toUpperCase()}
          </span>
        </div>
        )}
        <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.03em] text-slate-900">On prépare votre profil</h1>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Brief lit ce qu&apos;on trouve en ligne sur <span className="font-semibold text-slate-700">{companyName.trim()}</span>.
        </p>
        <div className="mx-auto mt-7 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2A5CE0] to-[#7B5CFF] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left">
          {LOADING_STEPS.map((label, i) => (
            <li key={label} className={`flex items-center gap-2.5 text-[14px] ${i <= current ? "text-slate-800" : "text-slate-400"}`}>
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${
                  i < current ? "bg-emerald-500 text-white" : i === current ? "bg-gradient-to-br from-[#2A5CE0] to-[#7B5CFF] text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {i < current ? "✓" : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form
      className={card}
      onSubmit={(e) => {
        e.preventDefault();
        void prepare();
      }}
    >
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[color:var(--violet)]">Avant de commencer</p>
      <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] text-slate-900 sm:text-[34px]">
        Présentez votre entreprise
      </h1>
      <p className="mt-2 text-[15.5px] leading-relaxed text-slate-500">
        Brief s&apos;en sert pour préparer votre profil commercial : vous n&apos;aurez plus qu&apos;à le vérifier.
      </p>

      <div className="mt-7 space-y-5">
        <div>
          <label className="mb-2 block text-[13.5px] font-medium text-slate-700" htmlFor="company-name">
            Nom de votre entreprise
          </label>
          <input
            id="company-name"
            className={FIELD}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoFocus
            maxLength={200}
            placeholder="Ex. : Acme Solutions"
          />
        </div>
        <div>
          <label className="mb-2 block text-[13.5px] font-medium text-slate-700" htmlFor="company-site">
            Site web <span className="font-normal text-slate-400">(facultatif)</span>
          </label>
          <input
            id="company-site"
            className={FIELD}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="acme-solutions.fr"
            inputMode="url"
          />
        </div>
        <div>
          <p className="mb-2 text-[13.5px] font-medium text-slate-700">Votre rôle</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex items-start gap-3 rounded-2xl p-4 text-left transition ${
                  role === r.value ? "bg-[color:var(--lavender)] ring-2 ring-[color:var(--violet)]" : "bg-white ring-1 ring-slate-200 hover:ring-slate-300"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    role === r.value ? "bg-gradient-to-br from-[#2A5CE0] to-[#6A4BE8] text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <r.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[14.5px] font-semibold text-slate-900">{r.title}</span>
                  <span className="block text-[12.5px] text-slate-500">{r.text}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
        <button
          type="button"
          disabled={!companyName.trim()}
          onClick={() => onDone({ companyName: companyName.trim(), website: website.trim(), role, prefill: null, registry: null })}
          className="text-[14px] text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-40"
        >
          Je préfère tout remplir moi-même
        </button>
        <button
          type="submit"
          disabled={!companyName.trim()}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#2A5CE0] to-[#6A4BE8] px-6 text-[15px] font-semibold text-white shadow-[0_12px_28px_-12px_rgba(76,63,214,0.85)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Préparer mon profil
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
