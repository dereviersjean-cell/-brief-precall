import Stripe from "stripe";

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

export async function syncOrganizationSeats(subscriptionItemId: string, quantity: number): Promise<void> {
  await getStripeClient().subscriptionItems.update(subscriptionItemId, { quantity });
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
