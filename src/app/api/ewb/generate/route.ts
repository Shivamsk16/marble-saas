import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auditLog, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";
import { generateEwayBillMock } from "@/lib/ewb";

const schema = z.object({
  invoiceId: z.string().uuid(),
  distanceKm: z.number().int().positive().optional(),
  vehicleNumber: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.ewb_write);
    const data = schema.parse(await request.json());

    const existing = await prisma.ewayBill.findFirst({
      where: {
        invoiceId: data.invoiceId,
        tenantId: session.tenantId,
        status: "active",
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Active EWB already exists", ewb: existing },
        { status: 409 }
      );
    }

    const ewb = await generateEwayBillMock({
      tenantId: session.tenantId,
      invoiceId: data.invoiceId,
      distanceKm: data.distanceKm,
      vehicleNumber: data.vehicleNumber,
    });

    await auditLog({
      actorId: session.userId,
      tenantId: session.tenantId,
      action: "ewb.generated",
      resourceType: "eway_bill",
      resourceId: ewb.id,
      afterState: { ewbNumber: ewb.ewbNumber },
    });

    return NextResponse.json({ ewb }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
