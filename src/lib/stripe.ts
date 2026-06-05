import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { PLANS, type PlanId, type SubscriptionStatus } from "@/lib/billing";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getStripePriceId(plan: PlanId): string | null {
  const map: Record<PlanId, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  };
  return map[plan] ?? null;
}

export function planFromStripePriceId(priceId: string): PlanId | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL) return "professional";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return "enterprise";
  return null;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trial";
    case "active":
      return "active";
    case "canceled":
      return "cancelled";
    case "past_due":
    case "unpaid":
    case "incomplete_expired":
      return "expired";
    default:
      return "expired";
  }
}

export async function getOrCreateStripeCustomer(tenantId: string, email: string) {
  const stripe = getStripe();
  if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("NOT_FOUND");

  if (tenant.stripeCustomerId) {
    return tenant.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    name: tenant.name,
    metadata: { tenantId },
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

function getSubscriptionRenewalDate(subscription: Stripe.Subscription): Date | null {
  const scheduleTs =
    subscription.billing_schedules?.[0]?.bill_until?.computed_timestamp ??
    subscription.billing_schedules?.[0]?.bill_until?.timestamp;
  if (scheduleTs) return new Date(scheduleTs * 1000);

  const legacyPeriodEnd = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  if (legacyPeriodEnd) return new Date(legacyPeriodEnd * 1000);

  if (subscription.trial_end) return new Date(subscription.trial_end * 1000);
  return null;
}

export async function syncSubscriptionFromStripe(
  tenantId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? planFromStripePriceId(priceId) : null;
  const status = mapStripeStatus(subscription.status);
  const renewalDate = getSubscriptionRenewalDate(subscription);

  const seatLimit = plan ? PLANS[plan].seats : undefined;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      ...(plan ? { plan } : {}),
      ...(seatLimit ? { seatLimit } : {}),
      renewalDate,
      ...(status === "active" ? { trialEndsAt: null } : {}),
    },
  });

}

export async function syncTenantSubscriptionStatus(
  tenantId: string,
  subscriptionId: string | null,
  status: SubscriptionStatus
) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: status,
      ...(status === "cancelled" || status === "expired" ? { renewalDate: null } : {}),
    },
  });
}
