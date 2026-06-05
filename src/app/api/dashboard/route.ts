import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getInventorySummary } from "@/lib/inventory";
import { getDashboardStats, getAttentionItems } from "@/lib/reports";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireSession();
    const [inventory, tenant, stats, attention] = await Promise.all([
      getInventorySummary(session.tenantId),
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        include: { settings: true },
      }),
      getDashboardStats(session.tenantId),
      getAttentionItems(session.tenantId),
    ]);

    return NextResponse.json({
      tenant: {
        name: tenant?.name,
        plan: tenant?.plan,
        trialEndsAt: tenant?.trialEndsAt,
      },
      inventory,
      stats,
      attention,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
