import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.ewb_read);
    const bills = await prisma.ewayBill.findMany({
      where: { tenantId: session.tenantId },
      include: {
        invoice: {
          select: { invoiceNumber: true, client: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ bills });
  } catch (e) {
    return apiError(e);
  }
}
