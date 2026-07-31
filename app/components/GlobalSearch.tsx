"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, PhoneCall, Search } from "lucide-react";
import type { SearchResult } from "@/lib/db";

// Recherche globale de la TopBar. Remplace le champ désactivé « bientôt
// disponible », qui était l'élément inachevé le plus visible de l'app.
//
// v1 assumée : contacts et calls de l'utilisateur, recherche par nom. Pas de
// recherche sémantique — ce n'est pas le besoin ici (« retrouver Acme »), et
// elle existe déjà là où elle sert (objections, références clients).

const DEBOUNCE_MS = 200;

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  // Requête à laquelle `results` correspond. Permet de dériver « en cours de
  // chargement » et « résultats périmés » au rendu, plutôt que d'appeler
  // setState en synchrone dans l'effet (règle react-hooks/set-state-in-effect,
  // et source de rendus en cascade).
  const [resultsFor, setResultsFor] = useState("");
  const [open, setOpen] = useState(false);
  // Index survolé au clavier — permet de naviguer sans quitter les mains du
  // clavier, ce qui est tout l'intérêt d'un ⌘K.
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K pour ouvrir, Échap pour fermer — raccourci attendu par défaut
  // sur ce type de champ.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;

    // Débounce : sans lui, chaque frappe déclencherait deux requêtes SQL.
    // `cancelled` évite qu'une réponse lente écrase le résultat d'une frappe
    // plus récente (course classique sur les champs de recherche).
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`).catch(() => null);
      const data = res ? await res.json().catch(() => ({ results: [] })) : { results: [] };
      if (cancelled) return;
      setResults((data as { results: SearchResult[] }).results ?? []);
      setResultsFor(trimmed);
      setHighlighted(0);
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  // Tant que les résultats affichés ne correspondent pas à la saisie courante,
  // on ne les montre pas : afficher ceux de la frappe précédente ferait
  // clignoter des résultats sans rapport.
  const upToDate = resultsFor === trimmed;
  const visibleResults = upToDate ? results : [];
  const loading = trimmed.length >= 2 && !upToDate;

  function go(result: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (visibleResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => (i + 1) % visibleResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => (i - 1 + visibleResults.length) % visibleResults.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = visibleResults[highlighted];
      if (target) go(target);
    }
  }

  const showPanel = open && trimmed.length >= 2;

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onInputKeyDown}
        placeholder="Rechercher un contact, un call…"
        aria-label="Recherche globale"
        className="h-9 w-[280px] rounded-lg border border-border bg-white/60 pl-8 pr-10 text-[12.5px] text-slate-900 outline-none transition-colors focus:border-[color:var(--violet)] focus:bg-white"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
        ⌘K
      </kbd>

      {showPanel && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[380px] overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-md)]">
          {loading ? (
            <p className="px-4 py-3 text-[12.5px] text-slate-400">Recherche…</p>
          ) : visibleResults.length === 0 ? (
            <p className="px-4 py-3 text-[12.5px] text-slate-400">Aucun résultat pour «&nbsp;{trimmed}&nbsp;»</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1">
              {visibleResults.map((result, index) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => go(result)}
                    onMouseEnter={() => setHighlighted(index)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      index === highlighted ? "bg-[color:var(--lavender)]" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      {result.type === "contact" ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : (
                        <PhoneCall className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-900">{result.title}</span>
                      <span className="block truncate text-[11.5px] text-slate-400">
                        {result.type === "contact" ? "Contact" : "Call"}
                        {result.subtitle ? ` · ${result.subtitle}` : ""}
                        {result.ownerName ? ` · ${result.ownerName}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
