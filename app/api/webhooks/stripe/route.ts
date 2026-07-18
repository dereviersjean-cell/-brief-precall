import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { constructWebhookEvent, getSeatSubscriptionItem } from "@/lib/stripe";
import {
  recordBillingEventIfNew,
  updateOrganizationBilling,
  getOrganizationByStripeSubscriptionId,
  type OrganizationBilling,
} from "@/lib/db";

// Statuts Stripe -> billing_status interne. 'past_due' déclenche la fenêtre de
// grâce via invoice.payment_failed (pas ici), donc ce mapping ne le couvre pas
// directement — un customer.subscription.updated à 'past_due' peut arriver
// avant ou après l'invoice.payment_failed correspondant, les deux handlers
// écrivent vers le même état donc l'ordre n'a pas d'importance.
function billingStatusFromStripeStatus(status: Stripe.Subscription.Status): string {
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.client_reference_id;
  if (!organizationId) {
    console.warn("[webhooks/stripe] checkout.session.completed sans organization_id, ignoré");
    return;
  }
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!customerId || !subscriptionId) {
    console.warn("[webhooks/stripe] checkout.session.completed sans customer/subscription, ignoré");
    return;
  }

  const patch: Partial<OrganizationBilling> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  };
  await updateOrganizationBilling(organizationId, patch);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organization_id;
  const org = organizationId
    ? { id: organizationId }
    : await getOrganizationByStripeSubscriptionId(subscription.id);
  if (!org) {
    console.warn(`[webhooks/stripe] subscription.updated pour ${subscription.id} : organisation introuvable, ignoré`);
    return;
  }

  const seatItem = getSeatSubscriptionItem(subscription);
  const patch: Partial<OrganizationBilling> = {
    stripe_seat_item_id: seatItem?.id ?? null,
    // seatItem.price est toujours l'objet Price complet (pas juste un ID),
    // pas besoin d'un appel API séparé pour lire l'intervalle mensuel/annuel.
    billing_interval: seatItem?.price.recurring?.interval ?? null,
    billing_status: billingStatusFromStripeStatus(subscription.status),
    current_period_start: seatItem ? new Date(seatItem.current_period_start * 1000).toISOString() : null,
    current_period_end: seatItem ? new Date(seatItem.current_period_end * 1000).toISOString() : null,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  };
  await updateOrganizationBilling(org.id, patch);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const org = await getOrganizationByStripeSubscriptionId(subscription.id);
  if (!org) return;
  await updateOrganizationBilling(org.id, { billing_status: "canceled" });
}

// Premier échec de paiement : dégradation douce, fenêtre de grâce de 48h.
// Ne réinitialise pas grace_period_ends_at si déjà fixé (échecs répétés dans
// la même fenêtre ne repoussent pas l'échéance).
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === "string"
    ? invoice.parent.subscription_details.subscription
    : invoice.parent?.subscription_details?.subscription?.id;
  if (!subscriptionId) return;

  const org = await getOrganizationByStripeSubscriptionId(subscriptionId);
  if (!org) return;

  if (org.grace_period_ends_at) return; // déjà en grâce, ne pas repousser l'échéance

  await updateOrganizationBilling(org.id, {
    billing_status: "grace_period",
    grace_period_ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  });
}

// Ne doit gérer QUE la sortie de fenêtre de grâce (paiement qui échoue puis
// finit par passer). Stripe émet aussi un invoice.payment_succeeded pour la
// facture à 0€ générée au démarrage d'un essai (rien à payer, "payée"
// automatiquement) — sans le garde ci-dessous, ça écrasait billing_status en
// 'active' dès le début de l'essai, court-circuitant 'trialing' et laissant
// current_period_start/end et billing_interval jamais renseignés puisque
// seul customer.subscription.updated (source de vérité pour le statut de
// l'abonnement) les fixe.
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === "string"
    ? invoice.parent.subscription_details.subscription
    : invoice.parent?.subscription_details?.subscription?.id;
  if (!subscriptionId) return;

  const org = await getOrganizationByStripeSubscriptionId(subscriptionId);
  if (!org) return;
  if (org.billing_status !== "grace_period") return;

  await updateOrganizationBilling(org.id, { billing_status: "active", grace_period_ends_at: null });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error("[webhooks/stripe] invalid signature:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const organizationIdHint =
    "metadata" in event.data.object ? (event.data.object as { metadata?: Record<string, string> }).metadata?.organization_id ?? null : null;
  const isNew = await recordBillingEventIfNew(event.id, event.type, organizationIdHint).catch((err) => {
    console.error("[webhooks/stripe] recordBillingEventIfNew failed (non-blocking, processing anyway):", err);
    return true;
  });
  if (!isNew) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`[webhooks/stripe] handler failed for ${event.type} (non-blocking):`, err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ received: true });
}
