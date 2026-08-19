// Origine publique de l'application, en un seul endroit.
//
// Elle était auparavant recopiée en dur dans 21 fichiers (routes OAuth, liens
// des emails sortants, webhook Recall, manifeste HubSpot). Le passage de
// brief-precall.vercel.app à brief-ai.fr le 19/08/2026 a montré le coût de
// cette duplication : un seul redirect_uri oublié casse une intégration en
// silence, et rien ne le signale avant qu'un utilisateur essaie de connecter
// son CRM.
//
// Deux choix délibérés :
//
// 1. `NEXT_PUBLIC_` — la valeur est de toute façon publique (elle apparaît
//    dans les URL de consentement OAuth), et le préfixe la rend utilisable
//    depuis un composant client si le besoin apparaît. Conséquence à
//    connaître : Next l'inline au build, donc changer la variable sur Vercel
//    demande un redéploiement, pas seulement un restart.
//
// 2. Le repli est le vrai domaine de production, pas localhost ni une erreur.
//    Une variable absente ne doit pas produire des redirect_uri cassés : le
//    défaut sûr, ici, c'est la prod.
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://brief-ai.fr").replace(/\/+$/, "");
