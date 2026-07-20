"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronUp, ChevronDown, ChevronRight, Users, TrendingUp } from "lucide-react";
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

type SortKey = "name" | "date" | "visios" | "emails" | "replies";
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
    <th className={`px-4 py-3 text-${align === "right" ? "right" : "left"}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
          active ? "text-[color:var(--violet)]" : "text-slate-400 hover:text-slate-600"
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
        case "replies":
          cmp = a.contact.replies_count - b.contact.replies_count;
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
  const totalEmails = contacts.reduce((n, c) => n + c.emails_sent_count, 0);
  const totalReplies = contacts.reduce((n, c) => n + c.replies_count, 0);
  const replyRate = totalEmails > 0 ? Math.round((totalReplies / totalEmails) * 100) : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-sm)] bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-blue-100/40 to-transparent blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--violet)] bg-[color:var(--lavender)] px-2.5 py-1 rounded-full mb-3">
                <Users className="w-3 h-3" />
                Vue d&apos;ensemble
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Historique</h1>
              <p className="text-slate-500 text-sm mt-1">
                {contacts.length} {contacts.length === 1 ? "contact suivi" : "contacts suivis"}
              </p>
            </div>
            {contacts.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un contact, une entreprise…"
                  className="pl-9 pr-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white w-72 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
                />
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatTile index={0} accent="indigo" label="Contacts suivis" value={contacts.length} icon={<Users className="w-3.5 h-3.5" />} />
          <StatTile index={1} accent="violet" label="Visios enregistrées" value={totalVisios} icon={<VideoIcon className="w-3.5 h-3.5" />} />
          <StatTile
            index={2}
            accent="emerald"
            label="Taux de réponse"
            value={replyRate}
            suffix={replyRate !== null ? "%" : undefined}
            icon={<TrendingUp className="w-3.5 h-3.5" />}
          />
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
          <div className="w-12 h-12 bg-[color:var(--lavender)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium">Aucun contact pour l&apos;instant</p>
          <p className="text-slate-400 text-sm mt-1">
            Vos contacts apparaîtront ici après vos premiers calls enregistrés.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
          <p className="text-slate-500 text-sm">Aucun résultat pour « {query} ».</p>
        </div>
      ) : (
        <FadeIn delay={0.1}>
          <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60">
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
                    <SortHeader
                      label="Réponses"
                      icon={<CheckIcon className="w-3 h-3" />}
                      sortKey="replies"
                      currentSort={sortKey}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ contact, displayName }) => (
                    <tr
                      key={contact.contact_email}
                      onClick={() => router.push(`/contacts/${encodeURIComponent(contact.contact_email)}`)}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-[color:var(--lavender)]/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <Link
                          href={`/contacts/${encodeURIComponent(contact.contact_email)}`}
                          className="flex items-center gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br brand-gradient flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 text-sm truncate group-hover:text-[color:var(--violet)] transition-colors">
                              {displayName}
                            </p>
                            {contact.contact_email !== displayName && (
                              <p className="text-slate-400 text-xs truncate mt-0.5">{contact.contact_email}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(contact.last_contact_at)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {contact.video_call_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--lavender)] text-[color:var(--violet)]">
                            <VideoIcon className="w-3 h-3 shrink-0" />
                            {contact.video_call_count}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {contact.emails_sent_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                            <EnvelopeIcon className="w-3 h-3 shrink-0" />
                            {contact.emails_sent_count}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {contact.replies_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                            <CheckIcon className="w-3 h-3 shrink-0" />
                            {contact.replies_count}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[color:var(--violet)] transition-colors" />
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
