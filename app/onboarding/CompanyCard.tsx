"use client";

import { BadgeCheck, CalendarDays, MapPin, UserRound, Users } from "lucide-react";
import CompanyLogo from "@/app/components/CompanyLogo";
import type { RegistryCompany } from "@/lib/company-registry";

// Fiche d'identité de l'entreprise à l'inscription (14/10/2026) : logo, date
// de création, dirigeant, ville, effectif — recopiés du registre public
// (lib/company-registry.ts), pas générés. Montrée dès l'écran de chargement,
// puis en tête de la première question.

function leaderVerb(role: string | null): string {
  if (role && /pr[ée]sident/i.test(role)) return "Présidée par";
  if (role && /g[ée]rant/i.test(role)) return "Gérée par";
  return "Dirigée par";
}

function foundedLabel(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return `Créée en ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}`;
}

export default function CompanyCard({ company, website }: { company: RegistryCompany; website: string | null }) {
  const facts = [
    { icon: CalendarDays, text: foundedLabel(company.foundedOn) },
    { icon: UserRound, text: company.leader ? `${leaderVerb(company.leaderRole)} ${company.leader}` : null },
    { icon: MapPin, text: company.city },
    { icon: Users, text: company.headcount },
  ].filter((f): f is { icon: typeof CalendarDays; text: string } => !!f.text);

  return (
    <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-[color:var(--lavender-strong)] shadow-[0_12px_32px_-22px_rgba(42,92,224,0.5)]">
      <div className="flex items-center gap-4 bg-gradient-to-r from-[#F1F4FF] to-[#F6F1FF] px-5 py-4">
        <CompanyLogo
          domain={website || null}
          name={company.legalName}
          alt={company.legalName}
          className="h-14 w-14 shrink-0 rounded-2xl bg-white object-contain p-2 shadow-[0_6px_16px_-10px_rgba(42,92,224,0.6)] ring-1 ring-white"
          fallback={
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2A5CE0] to-[#7B5CFF] text-[22px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(76,63,214,0.8)]">
              {company.legalName.charAt(0).toUpperCase()}
            </span>
          }
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-semibold tracking-[-0.02em] text-slate-900">{company.legalName}</p>
          <p className="text-[12.5px] tabular-nums text-slate-500">SIREN {company.siren.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}</p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700 ring-1 ring-emerald-100 sm:inline-flex">
          <BadgeCheck className="h-3.5 w-3.5" /> Registre officiel
        </span>
      </div>
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {facts.map((f) => (
            <span key={f.text} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 ring-1 ring-slate-100">
              <f.icon className="h-3.5 w-3.5 text-[color:var(--violet)]" />
              {f.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
