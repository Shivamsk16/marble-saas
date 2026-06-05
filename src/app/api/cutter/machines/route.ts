import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const createSchema = z.object({
  name: z.string().min(1),
  operatorName: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.cutter_read);
    const machines = await prisma.cutterMachine.findMany({
      where: { tenantId: session.tenantId },
      include: {
        jobs: {
          where: { status: "active" },
          take: 1,
          include: { slab: { select: { slabCode: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ machines });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.cutter_write);
    const data = createSchema.parse(await request.json());
    const machine = await prisma.cutterMachine.create({
      data: {
        tenantId: session.tenantId,
        name: data.name,
        operatorName: data.operatorName,
      },
    });
    return NextResponse.json({ machine }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
