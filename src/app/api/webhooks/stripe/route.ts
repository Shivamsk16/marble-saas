import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import {
  getStripe,
  syncSubscriptionFromStripe,
  syncTenantSubscriptionStatus,
} from "@/lib/stripe";
import { PLANS } from "@/lib/billing";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkout = event.data.object as Stripe.Checkout.Session;
        const tenantId = checkout.metadata?.tenantId;
        if (tenantId && checkout.subscription && typeof checkout.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(checkout.subscription);
          await syncSubscriptionFromStripe(tenantId, subscription);
          const plan = checkout.metadata?.plan;
          if (plan && plan in PLANS) {
            await prisma.billingHistory.create({
              data: {
                tenantId,
                description: `Subscribed to ${PLANS[plan as keyof typeof PLANS].name}`,
                amount: PLANS[plan as keyof typeof PLANS].price,
                status: "paid",
                plan,
              },
            });
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenantId;
        if (tenantId) {
          await syncSubscriptionFromStripe(tenantId, subscription);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenantId;
        if (tenantId) {
          await syncTenantSubscriptionStatus(tenantId, null, "cancelled");
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          const tenant = await prisma.tenant.findFirst({
            where: { stripeCustomerId: customerId },
          });
          if (tenant) {
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: { subscriptionStatus: "expired" },
            });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Stripe webhook error:", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
