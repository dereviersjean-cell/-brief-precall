// Récupère une URL au plus une fois par chargement de page, quel que soit le
// nombre de fois où le composant appelant est monté.
//
// Pourquoi c'est nécessaire ici : chaque section de l'app a son propre layout
// (app/dashboard/layout.tsx, app/feedback/layout.tsx, …) et chacun remonte
// AppSidebar, ImpersonationBanner et BillingGraceBanner. Changer de section
// démonte donc tout l'habillage et le reconstruit, ce qui relance leurs
// `useEffect` — et donc leurs appels réseau. Mesuré le 20/08/2026 dans les
// outils réseau : cinq requêtes repartaient à chaque navigation, pour des
// données qui ne dépendent pas de la page (nom de l'organisation, statut de
// facturation, impersonation en cours).
//
// Le cache vit dans le module, donc dans l'instance du bundle client : il
// survit aux remontages et aux navigations, et disparaît au rechargement
// complet de la page — ce qui est le bon cycle de vie pour ces trois valeurs.
//
// Un échec n'est pas mis en cache : l'entrée est retirée pour qu'un montage
// ultérieur puisse réessayer, sinon une coupure réseau passagère masquerait
// la bannière de facturation jusqu'au prochain rechargement.
//
// Contrepartie assumée : une valeur qui change côté serveur en cours de
// session n'est pas reprise avant un rechargement. Acceptable pour ces trois
// cas — l'accès reste gouverné par le middleware, pas par la bannière.
const inFlight = new Map<string, Promise<unknown>>();

export function fetchJsonOnce<T>(url: string): Promise<T | null> {
  const cached = inFlight.get(url);
  if (cached) return cached as Promise<T | null>;

  const promise = fetch(url)
    .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
    .catch(() => null)
    .then((value) => {
      if (value === null) inFlight.delete(url);
      return value;
    });

  inFlight.set(url, promise);
  return promise;
}

// À appeler après une action qui rend la valeur périmée — fin d'impersonation,
// changement d'abonnement — pour que le prochain montage la relise.
export function forgetFetchOnce(url: string): void {
  inFlight.delete(url);
}
