// Ce qu'est une invitation « en attente ».
//
// La définition sert des deux côtés : l'écran Équipe décide avec elle s'il
// affiche le badge et les deux boutons, les routes manager décident avec elle
// si elles acceptent d'agir. Deux copies auraient fini par diverger — un
// bouton visible sur une ligne que le serveur refuse, ou l'inverse. Même
// raison que OBJECTION_DEFINITION (bug #56).
//
// Aucune dépendance : importé par un composant client autant que par des
// routes serveur (cf. bug #12).
export type InvitationState = {
  invited_at: string | null;
  has_logged_in: boolean;
};

export function isPendingInvitation(state: InvitationState): boolean {
  return state.invited_at != null && !state.has_logged_in;
}
