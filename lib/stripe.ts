import Stripe from "stripe";
import {
  getActiveSeatCountForOrganization,
  getOrganizationBillingRow,
  getBillableSecondsForOrganization,
  updateOrganizationBilling,
} from "./db";

// 0,50€/h — refacturation directe du coût Recall.AI (voir CLAUDE.md,
// $0.50/heure de call enregistré), pas une marge produit.
const USAGE_PRICE_CENTS_PER_HOUR = 50;

let cachedClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  cachedClient = new Stripe(key);
  return cachedClient;
}

// Facturation par organisation (pas par user) — un manager souscrit pour son
// équipe entière. Voir CLAUDE.md / docs/BRIEF_CONTEXT.md pour le modèle complet
// (siège récurrent + usage passé au client via Invoice Items, pas Billing
// Meters/Metronome — inutile pour une seule métrique simple).

export async function getSeatPriceInfo(): Promise<{ amountCents: number; currency: string }> {
  const priceId = process.env.STRIPE_PRICE_ID_SEAT;
  if (!priceId) throw new Error("STRIPE_PRICE_ID_SEAT is not set");
  const price = await getStripeClient().prices.retrieve(priceId);
  return { amountCents: price.unit_amount ?? 0, currency: price.currency };
}

export async function createOrganizationCheckoutSession({
  organizationId,
  seatQuantity,
  managerEmail,
  existingCustomerId,
  successUrl,
  cancelUrl,
}: {
  organizationId: string;
  seatQuantity: number;
  managerEmail: string;
  existingCustomerId: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null }> {
  const priceId = process.env.STRIPE_PRICE_ID_SEAT;
  if (!priceId) throw new Error("STRIPE_PRICE_ID_SEAT is not set");

  const session = await getStripeClient().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: seatQuantity }],
    subscription_data: { trial_period_days: 7, metadata: { organization_id: organizationId } },
    payment_method_collection: "always",
    ...(existingCustomerId ? { customer: existingCustomerId } : { customer_email: managerEmail }),
    client_reference_id: organizationId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { url: session.url };
}

async function updateSeatQuantity(subscriptionItemId: string, quantity: number): Promise<void> {
  await getStripeClient().subscriptionItems.update(subscriptionItemId, { quantity });
}

// Recompte les sièges actifs de l'org et pousse la quantité à Stripe. No-op
// silencieux si l'org n'a pas (encore) d'abonnement — appelé en best-effort
// depuis chaque point de mutation de la composition d'une org (ajout/retrait
// de membre, invitation), avant même que la souscription Stripe existe.
export async function syncSeatsForOrganization(organizationId: string): Promise<void> {
  const billing = await getOrganizationBillingRow(organizationId);
  if (!billing?.stripe_seat_item_id) return;

  const seatCount = await getActiveSeatCountForOrganization(organizationId);
  await updateSeatQuantity(billing.stripe_seat_item_id, Math.max(seatCount, 1));
}

// Usage (Phase 3) : on calcule le total nous-mêmes (agrégation duration_seconds
// en base) et on pousse une ligne de facture standard plutôt que de reporter
// des événements à un Meter Stripe — voir le plan pour le raisonnement complet.
export async function createUsageInvoiceItem({
  customerId,
  amountCents,
  description,
}: {
  customerId: string;
  amountCents: number;
  description: string;
}): Promise<void> {
  await getStripeClient().invoiceItems.create({
    customer: customerId,
    amount: amountCents,
    currency: "eur",
    description,
  });
}

// Facture les secondes d'appel accumulées depuis le dernier report (ou depuis
// le début de la période Stripe en cours pour le tout premier report — pas
// depuis toujours, sinon une org qui a des mois de calls avant de souscrire
// se prendrait une facture rétroactive géante). Avance last_usage_reported_at
// même quand il n'y a rien à facturer (pas de calls = curseur avancé quand même,
// rien de perdu puisqu'on repart de "maintenant" au prochain cycle).
export async function reportMonthlyUsageForOrganization(organizationId: string): Promise<{ reportedSeconds: number; amountCents: number }> {
  const billing = await getOrganizationBillingRow(organizationId);
  if (!billing?.stripe_customer_id) return { reportedSeconds: 0, amountCents: 0 };

  const sinceISO = billing.last_usage_reported_at ?? billing.current_period_start ?? new Date().toISOString();
  const nowISO = new Date().toISOString();

  const seconds = await getBillableSecondsForOrganization(organizationId, sinceISO);
  let amountCents = 0;
  if (seconds > 0) {
    const hours = seconds / 3600;
    amountCents = Math.round(hours * USAGE_PRICE_CENTS_PER_HOUR);
    if (amountCents > 0) {
      await createUsageInvoiceItem({
        customerId: billing.stripe_customer_id,
        amountCents,
        description: `Usage enregistrement d'appels — ${hours.toFixed(1)}h`,
      });
    }
  }

  await updateOrganizationBilling(organizationId, { last_usage_reported_at: nowISO });
  return { reportedSeconds: seconds, amountCents };
}

export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
  const session = await getStripeClient().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripeClient().webhooks.constructEvent(rawBody, signature, secret);
}

// Un seul subscription item par abonnement dans ce modèle (le siège) —
// current_period_start/end vivent sur l'item, pas sur la Subscription elle-même
// (déplacé dans une version récente de l'API Stripe, vérifié contre le SDK installé).
export function getSeatSubscriptionItem(subscription: Stripe.Subscription): Stripe.SubscriptionItem | null {
  return subscription.items.data[0] ?? null;
}
