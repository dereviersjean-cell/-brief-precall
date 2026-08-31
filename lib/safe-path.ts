// Assainissement d'une destination de retour après connexion.
//
// La page /login accepte un `callbackUrl` pour ramener l'utilisateur là où il
// allait avant d'être renvoyé vers la connexion. Ce paramètre vient de l'URL,
// donc de n'importe qui : un lien `/login?callbackUrl=https://exemple.test`
// envoyé par email transformerait Brief en tremplin de redirection ouverte,
// avec le crédit de confiance du domaine brief-ai.fr.
//
// On n'accepte donc qu'un chemin interne. Trois formes à refuser en
// particulier, toutes interprétées comme externes par au moins un navigateur :
//   //exemple.test        → URL relative au protocole
//   /\exemple.test        → la barre inversée est normalisée en barre
//   https://exemple.test  → absolue, évidemment
//
// Aucune dépendance : importé côté serveur comme côté client (cf. bug #12).
export function safeInternalPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}
