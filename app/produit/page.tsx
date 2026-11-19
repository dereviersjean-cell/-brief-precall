import { permanentRedirect } from "next/navigation";

// L'ancienne page Produit a laissé la place, le 19/11/2026, aux deux pages par
// public du menu Produit (cadrage GTM d'Hubert). Son contenu s'adressait aux
// commerciaux : les liens et les moteurs qui la connaissent arrivent là.
export default function Page() {
  permanentRedirect("/commerciaux");
}
