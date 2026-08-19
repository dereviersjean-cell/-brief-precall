// Validation d'identifiant avant requête.
//
// Postgres rejette un uuid malformé avec une erreur 22P02, qui remonte en
// erreur serveur 500. Un identifiant absent de la base doit donner un 404 ;
// un identifiant qui n'est même pas un uuid aussi. Sans ce garde-fou, toute
// URL bricolée à la main faisait planter la page — et c'est ce qui est arrivé
// en cliquant un call d'exemple depuis les écrans de démonstration.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
