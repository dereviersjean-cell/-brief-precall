// Écran de chargement d'un brief, à sa forme : barre, en-tête, trois parties.
// Sans lui, Next prêtait celui de la liste des rendez-vous (app/brief/
// loading.tsx) — on voyait la liste vide en ouvrant un brief.
export default function Loading() {
  return (
    <div
      className="min-h-screen animate-pulse"
      style={{ background: "linear-gradient(180deg, oklch(0.965 0.022 270) 0px, var(--background) 520px)" }}
      aria-hidden
    >
      <div className="sticky top-14 z-[9] border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="h-3.5 w-40 rounded bg-slate-100" />
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-lg bg-slate-100" />
            <div className="h-8 w-28 rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="h-5 w-56 rounded-full bg-white/80" />
        <div className="mt-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white" />
          <div className="h-8 w-72 max-w-full rounded-lg bg-white/80" />
        </div>
        <div className="mt-10 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[24px] bg-white p-5 ring-1 ring-[color:var(--lavender-strong)] sm:p-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-[color:var(--lavender)]" />
                <div className="h-5 w-44 rounded bg-slate-100" />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                {[0, 1].map((j) => (
                  <div key={j} className="space-y-2.5">
                    <div className="h-3 w-20 rounded bg-slate-100" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                    <div className="h-3 w-5/6 rounded bg-slate-100" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
