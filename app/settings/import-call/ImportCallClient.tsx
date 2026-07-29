"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical, Upload, X } from "lucide-react";
import { Button, Card } from "@/app/components/ui/ui-bits";
import Dropdown from "@/app/components/ui/Dropdown";

type Person = { id: string; label: string };

type ImportResult = {
  callId: string;
  format: string;
  speakers: string[];
  globalScore: number | null;
  objectionsCount: number;
  warnings: string[];
};

const FORMAT_LABELS: Record<string, string> = {
  vtt: "WebVTT (horodaté)",
  srt: "SubRip (horodaté)",
  json: "JSON (horodaté)",
  timestamped: "Texte horodaté (« 00:45 Nom : … »)",
  text: "Texte brut, sans horodatage",
};

export default function ImportCallClient({
  currentUser,
  commercials,
}: {
  currentUser: Person;
  commercials: Person[];
}) {
  const [mode, setMode] = useState<"paste" | "file">("file");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [ownerId, setOwnerId] = useState(currentUser.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const canSubmit = mode === "paste" ? !!transcript.trim() : !!file;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      let res: Response;
      if (mode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("companyName", companyName);
        formData.append("contactEmail", contactEmail);
        formData.append("meetingTitle", meetingTitle);
        formData.append("userId", ownerId);
        res = await fetch("/api/calls/import-transcript", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/calls/import-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, companyName, contactEmail, meetingTitle, userId: ownerId }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "L'import a échoué.");
      setResult(data as ImportResult);
      setTranscript("");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'import a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border px-3 py-2 text-[13px] text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]";

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--lavender)] text-[color:var(--violet)]">
          <FlaskConical className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900">Tester l&apos;analyse sur un vrai call</h1>
          <p className="mt-0.5 max-w-xl text-[12.5px] text-slate-500">
            Déposez le transcript d&apos;un call existant : Brief le fait passer par exactement le même pipeline que les
            calls enregistrés par le bot — notation sur votre playbook, extraction des objections, rangement dans vos
            catégories et évaluation des réponses apportées.
          </p>
        </div>
      </div>

      <Card className="mb-5 border-amber-200 bg-amber-50">
        <p className="text-[13px] leading-relaxed text-amber-800">
          Le call importé est un <strong>call normal</strong> : il compte dans les statistiques d&apos;équipe, les
          analytics et la bibliothèque d&apos;objections. Pour annuler un essai, supprimez le call depuis son détail.
        </p>
      </Card>

      <Card className="mb-5">
        <div className="mb-4 inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              ["file", "Déposer un fichier"],
              ["paste", "Coller le texte"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "file" ? (
          <div>
            <p className="mb-3 text-[12.5px] text-slate-500">
              Formats acceptés : <strong>.vtt</strong>, <strong>.srt</strong>, <strong>.json</strong> (transcript Recall
              ou export Brief) et <strong>.txt</strong>. Un .txt au format «&nbsp;<code>00:45 Nom : texte</code>&nbsp;»
              — ce que sortent Google Meet, Zoom ou Fathom — est reconnu et débloque lui aussi les métriques
              d&apos;interaction. Sans aucun horodatage, vous aurez la notation et les objections, mais pas les
              métriques d&apos;interaction.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".vtt,.srt,.json,.txt,.md,text/plain"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-4 py-3">
                <Upload className="h-4 w-4 shrink-0 text-[color:var(--violet)]" />
                <p className="flex-1 truncate text-sm font-medium text-slate-700">{file.name}</p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Retirer le fichier"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-10 text-slate-400 transition-colors hover:border-[color:var(--violet)] hover:text-[color:var(--violet)]"
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm font-medium">Choisir un fichier de transcript</span>
              </button>
            )}
          </div>
        ) : (
          <div>
            <p className="mb-3 text-[12.5px] text-slate-500">
              Une ligne par prise de parole, préfixée du nom du locuteur. Si votre export porte les heures de passage
              («&nbsp;<code>00:45 Hubert : Bonjour…</code>&nbsp;»), gardez-les : elles débloquent les métriques
              d&apos;interaction. Les lignes sans horodatage sont rattachées à la prise de parole précédente.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={12}
              placeholder={"00:12 Hubert : Bonjour, merci d'avoir pris le temps.\n00:18 Prospect : Avec plaisir. Alors, concrètement, ça coûte combien ?"}
              className={`${inputClass} resize-y font-mono text-[12.5px]`}
            />
          </div>
        )}
      </Card>

      <Card className="mb-5">
        <p className="mb-4 text-[13px] font-semibold text-slate-900">Contexte du call</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Commercial</label>
            <Dropdown
              className="w-full"
              ariaLabel="Commercial à qui attribuer le call"
              value={ownerId}
              onChange={setOwnerId}
              options={[
                { value: currentUser.id, label: `${currentUser.label} (moi)` },
                ...commercials.map((c) => ({ value: c.id, label: c.label })),
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Titre du RDV <span className="font-normal text-slate-400">— sert à détecter l&apos;étape R1/R2/R3</span>
            </label>
            <input
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="Rencontre Oliverlist <> Acme"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Société du prospect</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Email du contact <span className="font-normal text-slate-400">— relie le call au signal gagné/perdu</span>
            </label>
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@acme.fr"
              className={inputClass}
            />
          </div>
        </div>
      </Card>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit || submitting}>
        {submitting ? "Analyse en cours… (jusqu'à 2 min)" : "Lancer l'analyse"}
      </Button>

      {result && (
        <Card className="mt-6 border-emerald-200 bg-emerald-50">
          <p className="text-[13px] font-semibold text-emerald-900">Analyse terminée</p>
          <ul className="mt-2 space-y-1 text-[13px] text-emerald-800">
            <li>Format détecté : {FORMAT_LABELS[result.format] ?? result.format}</li>
            <li>
              Locuteurs : {result.speakers.length > 0 ? result.speakers.join(", ") : "aucun identifié"}
            </li>
            <li>Score global : {result.globalScore !== null ? `${result.globalScore}/5` : "non calculé"}</li>
            <li>
              {result.objectionsCount} objection{result.objectionsCount > 1 ? "s" : ""} détectée
              {result.objectionsCount > 1 ? "s" : ""} et rangée{result.objectionsCount > 1 ? "s" : ""} dans vos
              catégories
            </li>
          </ul>

          {result.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-emerald-200 pt-3 text-[12.5px] text-amber-700">
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/feedback/${result.callId}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg brand-gradient px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110"
            >
              Voir l&apos;analyse <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/objections"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Voir les objections
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
