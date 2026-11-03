// La page d'un deal s'ouvre depuis une liste (Deals, Suivi des deals, brief) :
// trop de liens pour tous les précharger en entier. Ce squelette reprend la
// forme de la vue Deal (en-tête, priorité + engagements, état du deal) pour
// que le clic réponde tout de suite, sans saut à l'arrivée du contenu.
export default function Loading() {
  const card = "rounded-2xl border border-border bg-white p-5 sm:p-6";
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-3 w-40 rounded-full bg-slate-200" />
      <div className="mt-5 flex items-start gap-4">
        <div className="h-[46px] w-[46px] shrink-0 rounded-xl bg-slate-200" />
        <div className="min-w-0 flex-1">
          <div className="h-7 w-56 max-w-full rounded-lg bg-slate-200" />
          <div className="mt-2.5 h-3 w-64 max-w-full rounded-full bg-slate-100" />
          <div className="mt-3 h-7 w-52 max-w-full rounded-lg bg-slate-100" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className={card}>
          <div className="h-4 w-28 rounded-full bg-slate-200" />
          <div className="mt-4 h-6 w-4/5 rounded-lg bg-slate-200" />
          <div className="mt-3 h-3 w-full rounded-full bg-slate-100" />
          <div className="mt-2 h-3 w-3/4 rounded-full bg-slate-100" />
          <div className="mt-4 h-12 w-full rounded-xl bg-slate-100" />
        </div>
        <div className={card}>
          <div className="h-4 w-40 rounded-full bg-slate-200" />
          {[0, 1].map((i) => (
            <div key={i} className="mt-5 flex gap-3">
              <div className="h-[18px] w-[18px] shrink-0 rounded-full bg-slate-200" />
              <div className="flex-1">
                <div className="h-3 w-full rounded-full bg-slate-100" />
                <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={`${card} mt-4`}>
        <div className="h-4 w-32 rounded-full bg-slate-200" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="mt-4 grid grid-cols-[120px_90px_minmax(0,1fr)] gap-4 sm:grid-cols-[180px_120px_minmax(0,1fr)]">
            <div className="h-3.5 w-24 rounded-full bg-slate-200" />
            <div className="h-5 w-20 rounded-md bg-slate-100" />
            <div className="h-3 w-full rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
