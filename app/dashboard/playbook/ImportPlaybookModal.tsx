"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, ArrowLeft, Upload } from "lucide-react";

type ExtractedDimension = {
  label: string;
  description: string;
  weight: number;
  criteria: string[];
};

type NotionPage = { id: string; title: string };

type Step = "paste" | "preview";
type InputMode = "paste" | "file" | "notion";

export default function ImportPlaybookModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paste");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ExtractedDimension[] | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Notion tab state — separate from the paste/file flow above since it has
  // its own connect → search → confirm sub-steps before extraction can run.
  const [notionConnected, setNotionConnected] = useState<boolean | null>(null);
  const [notionToken, setNotionToken] = useState("");
  const [notionConnecting, setNotionConnecting] = useState(false);
  const [notionPages, setNotionPages] = useState<NotionPage[] | null>(null);
  const [notionSelectedPageId, setNotionSelectedPageId] = useState<string | null>(null);
  const [notionLoadingPages, setNotionLoadingPages] = useState(false);

  useEffect(() => {
    fetch("/api/playbook/notion/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { connected?: boolean } | null) => setNotionConnected(data?.connected ?? false))
      .catch(() => setNotionConnected(false));
  }, []);

  async function handleNotionFetchPages() {
    setNotionLoadingPages(true);
    setError(null);
    setNotionPages(null);
    setNotionSelectedPageId(null);
    try {
      const res = await fetch("/api/playbook/notion/pages");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Impossible de récupérer les pages Notion.");
      const pages = (data as { pages: NotionPage[] }).pages;
      setNotionPages(pages);
      if (pages.length === 1) setNotionSelectedPageId(pages[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de récupérer les pages Notion.");
    } finally {
      setNotionLoadingPages(false);
    }
  }

  // Auto-search as soon as the tab is selected while already connected — the
  // user just clicks "Depuis Notion" and lands straight on the page
  // confirmation, no separate "search" click needed.
  function selectInputMode(mode: InputMode) {
    setInputMode(mode);
    setError(null);
    if (mode === "notion" && notionConnected && notionPages === null && !notionLoadingPages) {
      handleNotionFetchPages();
    }
  }

  async function handleNotionConnect() {
    if (!notionToken.trim()) return;
    setNotionConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/playbook/notion/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: notionToken.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Connexion à Notion échouée.");
      setNotionConnected(true);
      setNotionToken("");
      handleNotionFetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion à Notion échouée.");
    } finally {
      setNotionConnecting(false);
    }
  }

  async function handleExtract() {
    if (inputMode === "paste" && !text.trim()) return;
    if (inputMode === "file" && !file) return;
    if (inputMode === "notion" && !notionSelectedPageId) return;

    setExtracting(true);
    setError(null);
    try {
      let res: Response;
      if (inputMode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/playbook/import", { method: "POST", body: formData });
      } else if (inputMode === "notion" && notionSelectedPageId) {
        res = await fetch("/api/playbook/notion/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: notionSelectedPageId }),
        });
      } else {
        res = await fetch("/api/playbook/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "L'extraction a échoué.");
      }
      setDimensions((data as { dimensions: ExtractedDimension[] }).dimensions);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'extraction a échoué.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleApply() {
    if (!dimensions || dimensions.length === 0) return;
    if (!window.confirm("Cela va supprimer les dimensions actuelles. Confirmer ?")) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/playbook/apply-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimensions }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de l'application.");
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'application.");
      setApplying(false);
    }
  }

  const canExtract =
    (inputMode === "paste" && !!text.trim()) ||
    (inputMode === "file" && !!file) ||
    (inputMode === "notion" && !!notionSelectedPageId);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-border w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">Importer depuis un document</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {step === "paste" ? (
            <div>
              <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1 mb-4">
                <button
                  type="button"
                  onClick={() => selectInputMode("paste")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    inputMode === "paste" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Coller le texte
                </button>
                <button
                  type="button"
                  onClick={() => selectInputMode("file")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    inputMode === "file" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Importer un fichier
                </button>
                <button
                  type="button"
                  onClick={() => selectInputMode("notion")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    inputMode === "notion" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Depuis Notion
                </button>
              </div>

              {inputMode === "paste" ? (
                <>
                  <p className="text-sm text-slate-500 mb-3">
                    Collez ici le contenu de votre playbook — Google Docs, Word, ou texte brut.
                  </p>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                    rows={16}
                    placeholder="Collez ici votre playbook"
                    className="w-full px-3.5 py-3 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)] resize-y"
                  />
                </>
              ) : inputMode === "file" ? (
                <div>
                  <p className="text-sm text-slate-500 mb-3">Formats acceptés : PDF, Word (.doc, .docx).</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-[color:var(--lavender)] border border-[color:var(--lavender-strong)] rounded-lg">
                      <Upload className="w-4 h-4 text-[color:var(--violet)] shrink-0" />
                      <p className="text-sm text-slate-700 font-medium flex-1 truncate">{file.name}</p>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Changer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        const dropped = e.dataTransfer.files?.[0];
                        if (!dropped) return;
                        const name = dropped.name.toLowerCase();
                        if (!/\.(pdf|docx?)$/i.test(name)) {
                          setError("Formats acceptés : PDF, Word (.doc, .docx).");
                          return;
                        }
                        setError(null);
                        setFile(dropped);
                      }}
                      className={`w-full flex flex-col items-center gap-2 px-4 py-10 border-2 border-dashed rounded-xl transition-all text-sm ${
                        dragActive
                          ? "border-[color:var(--violet)] bg-[color:var(--lavender)] text-[color:var(--violet)]"
                          : "border-border hover:border-[color:var(--lavender-strong)] hover:bg-[color:var(--lavender)] text-slate-500"
                      }`}
                    >
                      <Upload className={`w-6 h-6 ${dragActive ? "text-[color:var(--violet)]" : "text-slate-400"}`} />
                      {dragActive ? "Déposez le fichier ici" : "Glissez-déposez un fichier ou cliquez pour en sélectionner un"}
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {notionConnected === null ? (
                    <p className="text-sm text-slate-400">Chargement…</p>
                  ) : !notionConnected ? (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">
                        Créez une <strong>intégration interne</strong> dans Notion (Settings → Connections →
                        Develop or manage integrations), partagez votre page playbook avec elle (bouton{" "}
                        <strong>Share</strong> sur la page → recherchez le nom de votre intégration), puis collez
                        le token secret ici.
                      </p>
                      <a
                        href="https://www.notion.so/profile/integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[color:var(--violet)] hover:underline"
                      >
                        Ouvrir mes intégrations Notion ↗
                      </a>
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="password"
                          value={notionToken}
                          onChange={(e) => setNotionToken(e.target.value)}
                          placeholder="secret_..."
                          className="flex-1 px-3.5 py-2 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
                        />
                        <button
                          type="button"
                          onClick={handleNotionConnect}
                          disabled={!notionToken.trim() || notionConnecting}
                          className="h-9 px-4 text-sm font-medium text-white brand-gradient rounded-lg hover:brightness-110 transition-colors duration-200 disabled:opacity-50 shrink-0"
                        >
                          {notionConnecting ? "Connexion…" : "Connecter"}
                        </button>
                      </div>
                    </div>
                  ) : notionLoadingPages ? (
                    <p className="text-sm text-slate-400">Recherche de votre page playbook…</p>
                  ) : notionPages === null ? (
                    <button
                      type="button"
                      onClick={handleNotionFetchPages}
                      className="h-9 px-4 text-sm font-medium text-white brand-gradient rounded-lg hover:brightness-110 transition-colors duration-200"
                    >
                      Ajouter mon playbook depuis Notion
                    </button>
                  ) : notionPages.length === 0 ? (
                    <div>
                      <p className="text-sm text-slate-700 font-medium mb-1">Aucune page partagée trouvée.</p>
                      <p className="text-sm text-slate-500">
                        Dans Notion, ouvrez votre page playbook → <strong>Share</strong> → recherchez et ajoutez
                        votre intégration, puis réessayez.
                      </p>
                      <button
                        type="button"
                        onClick={handleNotionFetchPages}
                        className="text-sm text-[color:var(--violet)] hover:underline mt-2"
                      >
                        Réessayer
                      </button>
                    </div>
                  ) : notionPages.length === 1 ? (
                    <div>
                      <p className="text-sm text-slate-700 mb-3">
                        Est-ce bien cette page ? <strong>{notionPages[0].title}</strong>
                      </p>
                      <div className="flex items-center gap-2 px-4 py-3 bg-[color:var(--lavender)] border border-[color:var(--lavender-strong)] rounded-lg">
                        <span className="text-sm text-slate-700 font-medium flex-1 truncate">{notionPages[0].title}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-slate-500 mb-3">Plusieurs pages partagées trouvées — laquelle est votre playbook ?</p>
                      <div className="space-y-1.5">
                        {notionPages.map((page) => (
                          <button
                            key={page.id}
                            type="button"
                            onClick={() => setNotionSelectedPageId(page.id)}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm text-left border transition-colors duration-200 ${
                              notionSelectedPageId === page.id
                                ? "border-[color:var(--violet)] bg-[color:var(--lavender)] text-slate-900 font-medium"
                                : "border-border text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {page.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : dimensions && dimensions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-700 font-medium mb-1">
                Brief n&apos;a pas pu extraire de structure claire de ce document.
              </p>
              <p className="text-sm text-slate-500">Réessayez avec un texte plus détaillé, ou saisissez manuellement.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-4">
                Voici ce que Brief a extrait de votre document. Vous pourrez affiner ensuite chaque élément.
              </p>
              <div className="space-y-3">
                {(dimensions ?? []).map((dim, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">{dim.label}</h3>
                      <span className="text-xs text-slate-500 shrink-0">Poids : {dim.weight}</span>
                    </div>
                    {dim.description && <p className="text-sm text-slate-500 mt-1">{dim.description}</p>}
                    {dim.criteria.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {dim.criteria.map((q, qi) => (
                          <li key={qi} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-slate-300 shrink-0">•</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          {step === "paste" ? (
            <>
              <button
                onClick={onClose}
                className="h-8 px-4 text-sm font-medium text-slate-600 border border-border rounded-lg hover:bg-slate-50 transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleExtract}
                disabled={!canExtract || extracting}
                className="h-8 px-4 inline-flex items-center gap-1.5 text-sm font-medium text-white brand-gradient rounded-lg hover:brightness-110 transition-colors duration-200 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {extracting ? "Extraction en cours…" : "Extraire avec Brief"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("paste")}
                className="h-8 px-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-border rounded-lg hover:bg-slate-50 transition-colors duration-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Modifier le texte
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="h-8 px-4 text-sm font-medium text-slate-600 border border-border rounded-lg hover:bg-slate-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                {dimensions && dimensions.length > 0 && (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="h-8 px-4 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                  >
                    {applying ? "Application…" : "Remplacer mon playbook actuel"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
