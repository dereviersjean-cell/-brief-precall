"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, ArrowLeft } from "lucide-react";

type ExtractedDimension = {
  label: string;
  description: string;
  weight: number;
  criteria: string[];
};

type Step = "paste" | "preview";

export default function ImportPlaybookModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paste");
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ExtractedDimension[] | null>(null);

  async function handleExtract() {
    if (!text.trim()) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/playbook/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-2xl shadow-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-900">Importer depuis un document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {step === "paste" ? (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                Collez ici le contenu de votre playbook — extrait de Notion, Google Docs, Word, ou texte brut.
                L&apos;import de fichier PDF arrive prochainement.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                rows={16}
                placeholder="Collez ici votre playbook — extrait de Notion, Google Docs, Word, ou texte brut"
                className="w-full px-3.5 py-3 border border-gray-200 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
              />
            </div>
          ) : dimensions && dimensions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-700 font-medium mb-1">
                Brief n&apos;a pas pu extraire de structure claire de ce document.
              </p>
              <p className="text-sm text-gray-500">Réessayez avec un texte plus détaillé, ou saisissez manuellement.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Voici ce que Brief a extrait de votre document. Vous pourrez affiner ensuite chaque élément.
              </p>
              <div className="space-y-3">
                {(dimensions ?? []).map((dim, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">{dim.label}</h3>
                      <span className="text-xs text-gray-500 shrink-0">Poids : {dim.weight}</span>
                    </div>
                    {dim.description && <p className="text-sm text-gray-500 mt-1">{dim.description}</p>}
                    {dim.criteria.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {dim.criteria.map((q, qi) => (
                          <li key={qi} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-gray-300 shrink-0">•</span>
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

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          {step === "paste" ? (
            <>
              <button
                onClick={onClose}
                className="h-8 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleExtract}
                disabled={!text.trim() || extracting}
                className="h-8 px-4 inline-flex items-center gap-1.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-primary transition-colors duration-200 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {extracting ? "Extraction en cours…" : "Extraire avec Brief"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("paste")}
                className="h-8 px-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Modifier le texte
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="h-8 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                {dimensions && dimensions.length > 0 && (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="h-8 px-4 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
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
