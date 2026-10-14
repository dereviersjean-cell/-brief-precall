// Durée pendant laquelle le navigateur garde en mémoire une page déjà visitée
// (experimental.staleTimes.dynamic, next.config.ts). Partagée avec
// RouterFreshness, qui relit la page en arrière-plan quand elle est servie
// depuis ce cache. Sans dépendance : importé par next.config.ts et par un
// composant client.
export const ROUTER_STALE_SECONDS = 300;
