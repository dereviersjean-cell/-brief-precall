// Règles de décision de la facturation, extraites du webhook Stripe pour être
// testables sans simuler ni Stripe ni la base.
//
// Ce sont les seules décisions du webhook qui touchent à l'argent et à
// l'accès : elles ont déjà produit deux incidents en production (bugs #15
// et #16), et un webhook n'a pas d'utilisateur pour signaler qu'il s'est
// trompé. Elles méritent donc d'être isolées et couvertes par des tests.
//
// Sans dépendance (pas même le SDK Stripe) : le statut arrive en chaîne.

export type BillingStatus = "none" | "trialing" | "active" | "grace_period" | "blocked" | "canceled";

// Correspondance statut Stripe → statut Brief. `default` volontairement
// fermant (`blocked`) : un statut Stripe inconnu ou nouveau ne doit pas ouvrir
// l'accès par accident — on préfère bloquer à tort, ce qui se voit et se
// corrige, plutôt que laisser passer, ce qui ne se voit pas.
export function billingStatusFromStripeStatus(status: string): BillingStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "grace_period";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "blocked";
  }
}

// BUG #15, reproduit ici pour qu'il ne revienne pas : Stripe émet
// `invoice.payment_succeeded` AUSSI pour la facture à 0 € générée au démarrage
// d'un essai. Le handler passait alors `billing_status` à « active » sans
// condition, court-circuitant l'essai dès le premier jour. Ce webhook n'a
// qu'un seul cas d'usage légitime : la sortie de période de grâce après un
// paiement qui finit par passer.
export function shouldActivateOnPaymentSucceeded(currentStatus: string): boolean {
  return currentStatus === "grace_period";
}

// Un devis ne peut être accepté ou refusé qu'une fois. La page publique est
// accessible par simple lien : sans cette règle, un prospect qui recharge ou
// renvoie le formulaire déclencherait une seconde acceptation, et donc un
// second signal win/loss faussant les statistiques d'objections.
export function canTransitionQuote(currentStatus: string): boolean {
  return currentStatus !== "accepted" && currentStatus !== "rejected";
}
