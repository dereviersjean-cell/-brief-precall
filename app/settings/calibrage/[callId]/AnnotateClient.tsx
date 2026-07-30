"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, Trash2, Sparkles } from "lucide-react";
import { Button, Card } from "@/app/components/ui/ui-bits";
import Dropdown from "@/app/components/ui/Dropdown";
import type { ExpectedObjectionAnnotation, ObjectionEvalCallDetail } from "@/lib/db";

const UNCLASSIFIED = "__none__";

// Écran d'annotation, conçu pour un directeur commercial : il lit le call à
// gauche, corrige la liste à droite, valide. Aucun JSON, aucun terminal.
//
// Le transcript est affiché en entier et à côté de la liste (et non sur une
// autre page) : l'annotation ne vaut que si l'expert relit vraiment l'échange,
// et lui imposer un aller-retour garantit qu'il ne le fera pas.
export default function AnnotateClient({
  call,
  categories,
}: {
  call: ObjectionEvalCallDetail;
  categories: string[];
}) {
  const router = useRouter();
  const [expected, setExpected] = useState<ExpectedObjectionAnnotation[]>(call.expected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const options = [
    { value: UNCLASSIFIED, label: "Non classée" },
    ...categories.map((label) => ({ value: label, label })),
  ];

  function update(index: number, patch: Partial<ExpectedObjectionAnnotation>) {
    setExpected((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save(reviewed: boolean) {
    setSaving(true);
    setError(null);
    setSavedNote(null);
    try {
      const res = await fetch(`/api/objections/eval/${call.callId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected: expected.filter((e) => e.objection.trim()), reviewed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Enregistrement impossible.");
      }
      if (reviewed) {
        router.push("/settings/calibrage");
        router.refresh();
      } else {
        setSavedNote("Brouillon enregistré — vous pourrez reprendre plus tard.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  // Le transcript arrive en « Nom: phrase » par ligne — on le rend lisible
  // plutôt que de le jeter tel quel dans un <pre>.
  const lines = call.transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^:]{1,40}):\s*(.+)$/);
      return match && !/[.!?]/.test(match[1])
        ? { speaker: match[1], text: match[2] }
        : { speaker: null, text: line };
    });

  return (
    <div className="max-w-6xl">
      <Link
        href="/settings/calibrage"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à la liste
      </Link>

      <h1 className="text-[15px] font-semibold text-slate-900">
        {call.companyName || "Call"} —{" "}
        {new Date(call.occurredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
      </h1>
      <p className="mt-1 max-w-3xl text-[12.5px] text-slate-500">
        Lisez l&apos;échange à gauche, puis corrigez à droite la liste des objections. La liste est pré-remplie avec ce
        que l&apos;IA a trouvé : à vous de retirer ce qui n&apos;en est pas, d&apos;ajouter ce qui manque et de corriger
        les catégories.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card padded={false} className="flex max-h-[70vh] flex-col overflow-hidden">
          <p className="shrink-0 border-b border-slate-100 px-5 py-3 text-[13px] font-semibold text-slate-900">
            L&apos;échange
          </p>
          <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
            {lines.map((line, i) => (
              <p key={i} className="text-[13px] leading-relaxed text-slate-700">
                {line.speaker && <span className="mr-1.5 font-semibold text-slate-900">{line.speaker} :</span>}
                {line.text}
              </p>
            ))}
          </div>
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-slate-900">
              Les vraies objections de ce call
              <span className="ml-2 font-normal text-slate-400">
                {expected.length} retenue{expected.length > 1 ? "s" : ""}
              </span>
            </p>
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setExpected((prev) => [...prev, { objection: "", category: null }])}
            >
              Ajouter
            </Button>
          </div>

          <Card className="mb-4 border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] py-3">
            <p className="text-[12.5px] leading-relaxed text-slate-700">
              <strong>Une objection</strong> = une réticence qui freine la vente, qu&apos;on peut reformuler en «&nbsp;oui
              mais…&nbsp;». Une simple question du prospect («&nbsp;vos équipes sont où&nbsp;?&nbsp;») n&apos;en est pas
              une, même si le commercial y répond longuement.
            </p>
          </Card>

          <div className="space-y-3">
            {expected.length === 0 && (
              <p className="text-sm italic text-slate-400">
                Aucune objection retenue pour ce call. C&apos;est une réponse valable si l&apos;échange n&apos;en
                contenait aucune.
              </p>
            )}

            {expected.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start gap-3">
                  <textarea
                    value={item.objection}
                    onChange={(e) => update(index, { objection: e.target.value })}
                    rows={2}
                    placeholder="Formulez l'objection en une phrase, du point de vue du prospect"
                    className="min-w-0 flex-1 resize-y rounded-lg border border-border px-3 py-2 text-[13px] text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
                  />
                  <button
                    type="button"
                    onClick={() => setExpected((prev) => prev.filter((_, i) => i !== index))}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Retirer cette objection"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2.5">
                  <Dropdown
                    className="w-full"
                    ariaLabel="Catégorie attendue"
                    prefix="Catégorie :"
                    value={item.category ?? UNCLASSIFIED}
                    onChange={(value) => update(index, { category: value === UNCLASSIFIED ? null : value })}
                    options={options}
                  />
                </div>
              </Card>
            ))}
          </div>

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
          {savedNote && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{savedNote}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={() => save(true)} disabled={saving}>
              {saving ? "Enregistrement…" : "Valider ce call"}
            </Button>
            <Button onClick={() => save(false)} disabled={saving}>
              Enregistrer sans valider
            </Button>
          </div>
          <p className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-400">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            Tant qu&apos;un call n&apos;est pas validé, il n&apos;entre pas dans la mesure — sans quoi on comparerait
            l&apos;IA à sa propre copie.
          </p>
        </div>
      </div>
    </div>
  );
}
