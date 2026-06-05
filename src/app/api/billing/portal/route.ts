import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await requirePermission(PERMISSIONS.settings_write);
    const stripe = getStripe();
    if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { stripeCustomerId: true },
    });
    if (!tenant?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account yet. Upgrade a plan first." }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (e) {
    return apiError(e);
  }
}
