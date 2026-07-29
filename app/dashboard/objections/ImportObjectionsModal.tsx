"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, ArrowLeft, Upload } from "lucide-react";

// Même parcours en deux temps que ImportPlaybookModal (extraire → revoir →
// appliquer), avec une différence délibérée : l'application est ADDITIVE.
// L'import de playbook remplace les dimensions existantes ; ici on complète
// une bibliothèque que le manager enrichit au fil du temps, écraser ce qu'il
// a écrit à la main serait destructeur. Les doublons de nom sont ignorés
// côté serveur.

export type ExtractedCategory = {
  label: string;
  description: string;
  handlingGuidance: string;
  examplePhrasings: string[];
};

type Step = "input" | "preview";
type InputMode = "paste" | "file";

export default function ImportObjectionsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ExtractedCategory[] | null>(null);
  // Le manager décoche ce qu'il ne veut pas importer — l'extraction propose,
  // elle ne décide pas.
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function handleExtract() {
    if (inputMode === "paste" && !text.trim()) return;
    if (inputMode === "file" && !file) return;

    setExtracting(true);
    setError(null);
    try {
      let res: Response;
      if (inputMode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/objections/categories/import", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/objections/categories/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "L'extraction a échoué.");

      const extracted = (data as { categories: ExtractedCategory[] }).categories ?? [];
      setCategories(extracted);
      setSelected(new Set(extracted.map((_, i) => i)));
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'extraction a échoué.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleApply() {
    if (!categories) return;
    const toApply = categories.filter((_, i) => selected.has(i));
    if (toApply.length === 0) return;

    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/objections/categories/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: toApply }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de l'import.");
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import.");
      setApplying(false);
    }
  }

  const canExtract = (inputMode === "paste" && !!text.trim()) || (inputMode === "file" && !!file);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Importer des objections depuis un document</h2>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-600" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "input" ? (
            <div>
              <div className="mb-4 inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(
                  [
                    ["paste", "Coller le texte"],
                    ["file", "Importer un fichier"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setInputMode(mode);
                      setError(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      inputMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {inputMode === "paste" ? (
                <>
                  <p className="mb-3 text-sm text-slate-500">
                    Collez votre argumentaire, votre guide de traitement des objections, ou vos notes d&apos;équipe.
                  </p>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                    rows={14}
                    placeholder="Collez ici le document qui décrit les objections et comment les traiter"
                    className="w-full resize-y rounded-lg border border-border px-3.5 py-3 text-sm text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
                  />
                </>
              ) : (
                <div>
                  <p className="mb-3 text-sm text-slate-500">Formats acceptés : PDF, Word (.doc, .docx).</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <div className="flex items-center gap-3 rounded-lg border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-4 py-3">
                      <Upload className="h-4 w-4 shrink-0 text-[color:var(--violet)]" />
                      <p className="flex-1 truncate text-sm font-medium text-slate-700">{file.name}</p>
                      <button type="button" onClick={() => setFile(null)} className="text-xs text-slate-400 hover:text-slate-600">
                        Changer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-10 text-slate-400 transition-colors hover:border-[color:var(--violet)] hover:text-[color:var(--violet)]"
                    >
                      <Upload className="h-5 w-5" />
                      <span className="text-sm font-medium">Choisir un fichier</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-slate-500">
                {categories && categories.length > 0
                  ? "Décochez ce que vous ne voulez pas importer. Les objections déjà présentes dans votre bibliothèque ne seront pas dupliquées."
                  : "Aucune objection n'a pu être identifiée dans ce document."}
              </p>
              <ul className="space-y-3">
                {(categories ?? []).map((category, index) => (
                  <li key={index} className="rounded-xl border border-border p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(index)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(index);
                          else next.delete(index);
                          setSelected(next);
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--violet)]"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{category.label}</p>
                        {category.description && <p className="mt-1 text-[13px] text-slate-500">{category.description}</p>}
                        {category.handlingGuidance ? (
                          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                            <span className="font-medium text-slate-700">Comment la traiter : </span>
                            {category.handlingGuidance}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs italic text-amber-600">
                            Le document ne dit pas comment la traiter — à compléter à la main pour que les réponses des
                            commerciaux soient évaluées par rapport à votre méthode.
                          </p>
                        )}
                        {category.examplePhrasings.length > 0 && (
                          <p className="mt-2 text-xs text-slate-400">
                            {category.examplePhrasings.map((p) => `« ${p} »`).join("  ·  ")}
                          </p>
                        )}
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          {step === "preview" ? (
            <button
              type="button"
              onClick={() => setStep("input")}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
          ) : (
            <span />
          )}

          {step === "input" ? (
            <button
              type="button"
              onClick={handleExtract}
              disabled={!canExtract || extracting}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg brand-gradient px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {extracting ? "Extraction…" : "Extraire les objections"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || selected.size === 0}
              className="inline-flex h-9 items-center rounded-lg brand-gradient px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying ? "Import…" : `Ajouter ${selected.size} objection${selected.size > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
