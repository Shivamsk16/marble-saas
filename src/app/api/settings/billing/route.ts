import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";
import { PLANS } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
import { getSeatUsage } from "@/lib/seats";

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.settings_write);
    const [tenant, seats, history] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: session.tenantId } }),
      getSeatUsage(session.tenantId),
      prisma.billingHistory.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

    if (!tenant) throw new Error("NOT_FOUND");

    return NextResponse.json({
      subscription: {
        plan: tenant.plan,
        subscriptionStatus: tenant.subscriptionStatus,
        trialEndsAt: tenant.trialEndsAt,
        renewalDate: tenant.renewalDate,
        seatLimit: tenant.seatLimit,
        seatsUsed: seats.seatsUsed,
        hasStripeCustomer: !!tenant.stripeCustomerId,
      },
      seats,
      plans: PLANS,
      stripeConfigured: !!getStripe(),
      history: history.map((h) => ({
        ...h,
        amount: Number(h.amount),
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
