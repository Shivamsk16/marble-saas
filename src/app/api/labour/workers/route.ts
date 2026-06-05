import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["cutter_operator", "loader", "polisher", "helper"]),
  dailyWage: z.number().positive().optional(),
  monthlySalary: z.number().positive().optional(),
});

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.labour_read);
    const workers = await prisma.worker.findMany({
      where: { tenantId: session.tenantId, isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ workers });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.labour_write);
    const data = createSchema.parse(await request.json());
    const worker = await prisma.worker.create({
      data: {
        tenantId: session.tenantId,
        name: data.name,
        phone: data.phone,
        role: data.role,
        dailyWage: data.dailyWage,
        monthlySalary: data.monthlySalary,
        joiningDate: new Date(),
      },
    });
    return NextResponse.json({ worker }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
