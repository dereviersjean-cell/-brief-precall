// Squelettes de la page des rendez-vous (maquette S2a). Partagés entre
// loading.tsx — la transition quand on arrive d'un autre onglet — et le
// composant client pendant la lecture de l'agenda : les deux ont la même
// forme que la page, donc rien ne saute à l'arrivée du contenu.

// Même silhouette que la vue chargée : en-têtes de jour et cartes.
export function EventsSkeleton() {
  return (
    <div className="animate-pulse space-y-9" aria-hidden>
      {[3, 2].map((n, g) => (
        <div key={g}>
          <div className="flex items-center gap-3 py-2">
            <div className="h-11 w-11 rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 rounded bg-slate-100" />
              <div className="h-3 w-14 rounded bg-slate-100" />
            </div>
          </div>
          <div className="ml-[22px] mt-2 space-y-3 border-l border-dashed border-slate-200 pl-4 sm:pl-[34px]">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="flex items-center gap-5 rounded-[18px] bg-white/70 px-5 py-4 ring-1 ring-slate-100">
                <div className="w-14 space-y-1.5 sm:w-[84px]">
                  <div className="h-4 w-12 rounded bg-slate-100" />
                  <div className="h-3 w-9 rounded bg-slate-100" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
                <div className="hidden h-10 w-36 rounded-full bg-slate-100 sm:block" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// La page entière, pour loading.tsx : même panneau gauche, même liste.
export function BriefPageSkeleton() {
  return (
    <div style={{ background: "linear-gradient(180deg, oklch(0.97 0.02 270) 0px, var(--background) 420px)" }}>
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-4">
            <div>
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.04em] text-slate-900">
                Vos prochains <span className="whitespace-nowrap">rendez-vous</span>
              </h1>
              <div className="mt-2.5 h-3.5 w-48 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="hidden h-[330px] animate-pulse rounded-[24px] bg-white/70 ring-1 ring-[color:var(--lavender-strong)] lg:block" />
            <div className="h-[108px] animate-pulse rounded-[24px] bg-white/70 ring-1 ring-[color:var(--lavender-strong)]" />
            <div className="h-11 rounded-full bg-[color:var(--primary)] opacity-60" />
          </aside>
          <div className="min-w-0">
            <EventsSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
