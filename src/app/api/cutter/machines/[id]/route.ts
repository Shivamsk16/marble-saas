import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const patchSchema = z.object({
  status: z.enum(["idle", "cutting", "maintenance"]).optional(),
  operatorName: z.string().optional(),
  maintenanceReason: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.cutter_write);
    const { id } = await params;
    const data = patchSchema.parse(await request.json());
    const machine = await prisma.cutterMachine.updateMany({
      where: { id, tenantId: session.tenantId },
      data: {
        status: data.status,
        operatorName: data.operatorName,
        notes: data.maintenanceReason,
      },
    });
    if (machine.count === 0) throw new Error("NOT_FOUND");
    const updated = await prisma.cutterMachine.findUnique({ where: { id } });
    return NextResponse.json({ machine: updated });
  } catch (e) {
    return apiError(e);
  }
}
