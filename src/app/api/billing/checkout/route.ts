import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";
import { getOrCreateStripeCustomer, getStripe, getStripePriceId } from "@/lib/stripe";
import type { PlanId } from "@/lib/billing";

const bodySchema = z.object({
  plan: z.enum(["starter", "professional", "enterprise"]),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.settings_write);
    const { plan } = bodySchema.parse(await request.json());

    const stripe = getStripe();
    if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

    const priceId = getStripePriceId(plan as PlanId);
    if (!priceId) {
      return NextResponse.json({ error: "Stripe price not configured for this plan" }, { status: 503 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    if (!user) throw new Error("NOT_FOUND");

    const customerId = await getOrCreateStripeCustomer(session.tenantId, user.email);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=cancelled`,
      metadata: {
        tenantId: session.tenantId,
        plan,
      },
      subscription_data: {
        metadata: {
          tenantId: session.tenantId,
          plan,
        },
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    return apiError(e);
  }
}
