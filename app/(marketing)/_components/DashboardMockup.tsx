function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-semibold text-gray-700">{score.toFixed(1)}/5</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(score / 5) * 100}%` }} />
      </div>
    </div>
  );
}

// Purely illustrative — fictional contact/company, no real data. Simulates
// the post-call analysis screen (scores, summary, suggested next steps).
export function DashboardMockup() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
        </div>
        <span className="text-xs text-gray-400 font-mono">brief.app/feedback</span>
        <span className="w-16" />
      </div>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Analyse du call</p>
            <p className="font-semibold text-gray-900">Acme Corp — Marie Lambert</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-indigo-600">3.4</p>
            <p className="text-xs text-gray-400">Score global</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ScoreBar label="Ouverture" score={3} />
          <ScoreBar label="Découverte besoin" score={4} />
          <ScoreBar label="Pitch / démo" score={3} />
          <ScoreBar label="Prochaine étape" score={4} />
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Résumé</p>
          <div className="space-y-1.5">
            <div className="h-2 bg-gray-200 rounded w-full" />
            <div className="h-2 bg-gray-200 rounded w-5/6" />
            <div className="h-2 bg-gray-200 rounded w-2/3" />
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-xs font-medium text-emerald-700 mb-2">Prochaines étapes suggérées</p>
          <div className="space-y-2">
            {["Envoyer la projection ROI personnalisée", "Relancer sous 48h si pas de retour"].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded border border-emerald-300 shrink-0" />
                <span className="text-xs text-gray-600">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
