import { BriefPageSkeleton } from "./BriefSkeleton";

// Même forme que la page des rendez-vous : le squelette générique (tuiles de
// chiffres) changeait de mise en page sous les yeux à l'arrivée du contenu.
export default function Loading() {
  return <BriefPageSkeleton />;
}
