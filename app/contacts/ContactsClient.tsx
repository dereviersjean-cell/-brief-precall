"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronUp, ChevronDown, ChevronRight, Users } from "lucide-react";
import type { ContactOverviewItem } from "@/lib/db";
import { formatContactDisplayName } from "@/lib/format";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
      <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
    </svg>
  );
}

type SortKey = "name" | "date" | "visios" | "emails";
type SortDirection = "asc" | "desc";

type Row = {
  contact: ContactOverviewItem;
  displayName: string;
};

function SortHeader({
  label,
  icon,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
  align = "left",
}: {
  label: string;
  icon?: ReactNode;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDirection: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentSort === sortKey;
  return (
    <th className={`px-4 py-2.5 text-${align === "right" ? "right" : "left"}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.07em] transition-colors ${
          active ? "text-[color:var(--violet)]" : "text-slate-500 hover:text-slate-900"
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {icon}
        {label}
        {active &&
          (currentDirection === "asc" ? (
            <ChevronUp className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ))}
      </button>
    </th>
  );
}

export default function ContactsClient({ contacts }: { contacts: ContactOverviewItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const rows: Row[] = useMemo(
    () => contacts.map((contact) => ({ contact, displayName: formatContactDisplayName(contact.company_name, contact.contact_email) })),
    [contacts]
  );

  const filteredRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matching = trimmed
      ? rows.filter(
          (r) => r.displayName.toLowerCase().includes(trimmed) || r.contact.contact_email.toLowerCase().includes(trimmed)
        )
      : rows;

    const sorted = [...matching].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.displayName.localeCompare(b.displayName);
          break;
        case "date":
          cmp = a.contact.last_contact_at.localeCompare(b.contact.last_contact_at);
          break;
        case "visios":
          cmp = a.contact.video_call_count - b.contact.video_call_count;
          break;
        case "emails":
          cmp = a.contact.emails_sent_count - b.contact.emails_sent_count;
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, query, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "date" ? "desc" : "asc");
    }
  }

  const totalVisios = contacts.reduce((n, c) => n + c.video_call_count, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* En-tête */}
      <FadeIn>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">
              <Users className="h-3.5 w-3.5" />
              Vue d&apos;ensemble
            </span>
            <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">Historique</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
              {contacts.length} {contacts.length === 1 ? "contact suivi" : "contacts suivis"}
            </p>
          </div>
          {contacts.length > 0 && (
            <div className="relative w-full sm:w-72 sm:shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un contact, une entreprise…"
                className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]/40"
              />
            </div>
          )}
        </div>
      </FadeIn>

      {/* Stats */}
      {contacts.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <StatTile index={0} accent="indigo" label="Contacts suivis" value={contacts.length} icon={<Users className="w-3.5 h-3.5" />} />
          <StatTile index={1} accent="violet" label="Visios enregistrées" value={totalVisios} icon={<VideoIcon className="w-3.5 h-3.5" />} />
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--lavender)]">
            <svg className="w-6 h-6 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-slate-900">Aucun contact pour l&apos;instant</p>
          <p className="mt-1 text-[13px] text-slate-500">
            Vos contacts apparaîtront ici après vos premiers calls enregistrés.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
          <p className="text-[13px] text-slate-500">Aucun résultat pour « {query} ».</p>
        </div>
      ) : (
        <FadeIn delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse stacked-table sm:min-w-[760px]">
                <thead>
                  <tr className="border-b border-border">
                    <SortHeader label="Contact / Entreprise" sortKey="name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortHeader label="Dernier contact" sortKey="date" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortHeader
                      label="Visios"
                      icon={<VideoIcon className="w-3 h-3" />}
                      sortKey="visios"
                      currentSort={sortKey}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Emails envoyés"
                      icon={<EnvelopeIcon className="w-3 h-3" />}
                      sortKey="emails"
                      currentSort={sortKey}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="w-8 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ contact, displayName }) => (
                    <tr
                      key={contact.contact_email}
                      onClick={() => router.push(`/contacts/${encodeURIComponent(contact.contact_email)}`)}
                      className="group cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="max-w-[280px] px-4 py-3">
                        <Link
                          href={`/contacts/${encodeURIComponent(contact.contact_email)}`}
                          className="flex items-center gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--lavender)]">
                            <span className="text-[12px] font-semibold text-[color:var(--violet)]">{displayName.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-slate-900 transition-colors group-hover:text-[color:var(--violet)]">
                              {displayName}
                            </p>
                            {contact.contact_email !== displayName && (
                              <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{contact.contact_email}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td data-label="Dernier contact" className="whitespace-nowrap px-4 py-3 text-[13px] tabular-nums text-slate-600">
                        {formatDate(contact.last_contact_at)}
                      </td>
                      <td data-label="Visios" className="whitespace-nowrap px-4 py-3">
                        {contact.video_call_count > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-[color:var(--violet)]">
                            <VideoIcon className="w-3 h-3 shrink-0" />
                            {contact.video_call_count}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td data-label="Emails envoyés" className="whitespace-nowrap px-4 py-3">
                        {contact.emails_sent_count > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--success-soft)] px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-emerald-700">
                            <EnvelopeIcon className="w-3 h-3 shrink-0" />
                            {contact.emails_sent_count}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-[color:var(--violet)]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
