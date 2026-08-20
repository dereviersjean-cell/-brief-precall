// Squelette affiché pendant qu'une page serveur se rend.
//
// Pourquoi ça change tout : dans l'App Router, sans `loading.tsx`, un clic sur
// un lien ne produit AUCUN retour visuel tant que le rendu serveur n'est pas
// terminé — l'utilisateur reste sur l'ancienne page et croit que le clic n'a
// pas été pris. Second effet, moins connu : le préchargement de `<Link>` sur
// une route dynamique (toutes les nôtres le sont, `force-dynamic`) ne
// précharge QUE l'état de chargement. Sans `loading.tsx`, il n'y a rien à
// précharger, donc le préchargement de Next ne sert à rien du tout.
//
// L'habillage (sidebar, TopBar, bannières) vit dans le layout de chaque
// section : il reste à l'écran, seul le contenu est remplacé par ce squelette.
export default function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-pulse" aria-hidden>
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-4 h-8 w-72 max-w-full rounded bg-slate-200" />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-slate-100 bg-white">
            <div className="p-5">
              <div className="h-2.5 w-20 rounded bg-slate-100" />
              <div className="mt-4 h-6 w-12 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl border border-slate-100 bg-white">
            <div className="flex items-center gap-4 p-5">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
              <div className="min-w-0 flex-1">
                <div className="h-3.5 w-48 max-w-full rounded bg-slate-200" />
                <div className="mt-2.5 h-2.5 w-32 max-w-full rounded bg-slate-100" />
              </div>
              <div className="hidden sm:block h-8 w-24 shrink-0 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
