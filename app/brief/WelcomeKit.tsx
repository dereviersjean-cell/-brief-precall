"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowRight, CalendarDays, Pencil, Sparkles } from "lucide-react";
import CompanyLogo from "@/app/components/CompanyLogo";
import type { RegistryCompany } from "@/lib/company-registry";

// Accueil personnalisé d'un compte qui n'a pas encore de rendez-vous
// (14/10/2026, demande de Jean) : la page Brief reprend ce que l'inscription
// a appris — la personne, son entreprise, son offre, sa cible — et propose
// tout de suite un premier brief sur un prospect, plutôt qu'un « aucun
// rendez-vous » générique.

export type WelcomeProfile = {
  companyName: string | null;
  offer: string | null;
  icp: string | null;
  sector: string | null;
};

// L'offre enregistrée peut porter « …\nPromesse : … » (onboarding) : on
// sépare les deux pour les présenter chacune à sa place.
function splitOffer(offer: string | null): { offer: string | null; promise: string | null } {
  if (!offer) return { offer: null, promise: null };
  const [main, ...rest] = offer.split(/\n+/);
  const promiseLine = rest.find((l) => /^promesse\s*:/i.test(l));
  return { offer: main.trim() || null, promise: promiseLine ? promiseLine.replace(/^promesse\s*:\s*/i, "").trim() : null };
}

function founded(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : `Créée en ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}`;
}

export default function WelcomeKit({
  firstName,
  profile,
  showCalendarStep,
}: {
  firstName: string | null;
  profile: WelcomeProfile | null;
  // Compte email sans agenda relié : l'étape agenda fait partie de l'accueil.
  showCalendarStep: boolean;
}) {
  const router = useRouter();
  const company = profile?.companyName?.trim() || null;
  const { offer, promise } = splitOffer(profile?.offer ?? null);
  const [registry, setRegistry] = useState<RegistryCompany | null>(null);
  const [prospect, setProspect] = useState("");
  const [contact, setContact] = useState("");
  const [going, setGoing] = useState(false);

  // La fiche du registre (création, dirigeant) : rapide, chargée à
  // l'affichage, seulement pour cet accueil.
  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    fetch(`/api/onboarding/company?name=${encodeURIComponent(company)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ company: RegistryCompany | null }>) : { company: null }))
      .then((d) => {
        if (!cancelled) setRegistry(d.company);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [company]);

  // Premier brief sans rendez-vous : la page du brief génère à partir du seul
  // nom d'entreprise. Identifiant « essai-… » : le brief s'enregistre et
  // réapparaît dans les briefs récents.
  function tryBrief(e: React.FormEvent) {
    e.preventDefault();
    const name = prospect.trim();
    if (!name) return;
    setGoing(true);
    const contactValue = contact.trim();
    const contactParam = contactValue
      ? contactValue.includes("@")
        ? `&contactEmail=${encodeURIComponent(contactValue)}`
        : `&contactName=${encodeURIComponent(contactValue)}`
      : "";
    router.push(
      `/brief/essai-${Date.now()}?company=${encodeURIComponent(name)}&title=${encodeURIComponent(`Découverte ${name}`)}${contactParam}`
    );
  }

  const facts = [founded(registry?.foundedOn ?? null), registry?.city ?? null].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      {/* Bonjour + ce que Brief sait de l'entreprise */}
      {/* En-tête clair : le bleu plein partout rendait la page difficile à lire
          (retour de Jean, 14/10/2026). Un seul bouton de couleur sur la page :
          « Préparer le brief ». */}
      <section className="relative overflow-hidden rounded-[26px] bg-white p-6 shadow-[0_1px_2px_rgba(42,92,224,0.06),0_16px_40px_-26px_rgba(42,92,224,0.35)] ring-1 ring-[color:var(--lavender-strong)] sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[color:var(--lavender)] blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-5">
          {company && (
            <CompanyLogo
              name={company}
              alt={company}
              className="relative h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-2.5 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.45)] ring-1 ring-slate-100"
              fallback={
                <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[color:var(--lavender)] text-[26px] font-semibold text-[color:var(--violet)]">
                  {company.charAt(0).toUpperCase()}
                </span>
              }
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-slate-500">Bonjour{firstName ? ` ${firstName}` : ""} 👋</p>
            <h2 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-slate-900 sm:text-[30px]">
              {company ? `Brief est prêt pour ${company}.` : "Brief est prêt."}
            </h2>
            {facts.length > 0 && <p className="mt-1.5 text-[13.5px] text-slate-500">{facts.join(" · ")}</p>}
          </div>
        </div>

        {(offer || profile?.icp || promise) && (
          <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
            {offer && (
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:col-span-2">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">Ce que vous vendez</p>
                <p className="mt-1 line-clamp-3 text-[14.5px] leading-relaxed text-slate-800">{offer}</p>
              </div>
            )}
            {profile?.icp && (
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">Votre cible</p>
                <p className="mt-1 line-clamp-3 text-[14px] leading-relaxed text-slate-800">{profile.icp}</p>
              </div>
            )}
            {promise && (
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">Votre promesse</p>
                <p className="mt-1 line-clamp-3 text-[14px] leading-relaxed text-slate-800">{promise}</p>
              </div>
            )}
          </div>
        )}
        <Link
          href="/settings/general"
          className="relative mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
        >
          <Pencil className="h-3.5 w-3.5" /> Ajuster mon profil
        </Link>
      </section>

      {/* Premier brief, tout de suite */}
      <form
        onSubmit={tryBrief}
        className="rounded-[24px] bg-white p-6 shadow-[0_1px_2px_rgba(42,92,224,0.06),0_16px_40px_-26px_rgba(42,92,224,0.45)] ring-1 ring-[color:var(--lavender-strong)] sm:p-7"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--lavender)] text-[color:var(--violet)]">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">Préparez votre premier brief</h3>
            <p className="mt-0.5 text-[14px] text-slate-500">
              Une entreprise que vous prospectez{profile?.icp ? " — idéalement dans votre cible" : ""} : Brief prépare le dossier en
              moins d&apos;une minute.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]">
          <input
            value={prospect}
            onChange={(e) => setProspect(e.target.value)}
            placeholder="Entreprise prospect (ex. : Doctolib)"
            aria-label="Entreprise prospect"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] outline-none transition focus:border-[color:var(--violet)] focus:ring-4 focus:ring-[color:var(--violet)]/10"
          />
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Contact (facultatif)"
            aria-label="Contact, nom ou email (facultatif)"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] outline-none transition focus:border-[color:var(--violet)] focus:ring-4 focus:ring-[color:var(--violet)]/10"
          />
          <button
            type="submit"
            disabled={!prospect.trim() || going}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2A5CE0] to-[#6A4BE8] px-6 text-[15px] font-semibold text-white shadow-[0_12px_28px_-12px_rgba(76,63,214,0.85)] transition hover:brightness-110 disabled:opacity-50"
          >
            {going ? "Préparation…" : "Préparer le brief"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      {showCalendarStep && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-white p-6 ring-1 ring-[color:var(--lavender-strong)] sm:p-7">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--lavender)] text-[color:var(--violet)]">
              <CalendarDays className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[16px] font-semibold text-slate-900">Ensuite : reliez votre agenda</h3>
              <p className="mt-0.5 text-[13.5px] text-slate-500">Vos rendez-vous apparaîtront ici, et leur brief se préparera tout seul.</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => signIn("google", { callbackUrl: "/brief" })}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[13.5px] font-medium text-slate-800 ring-1 ring-slate-200 hover:ring-slate-400"
            >
              Google Agenda
            </button>
            <button
              onClick={() => signIn("azure-ad", { callbackUrl: "/brief" })}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[13.5px] font-medium text-slate-800 ring-1 ring-slate-200 hover:ring-slate-400"
            >
              Outlook
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
