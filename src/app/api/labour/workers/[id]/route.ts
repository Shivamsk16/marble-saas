import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  role: z.enum(["cutter_operator", "loader", "polisher", "helper"]).optional(),
  dailyWage: z.number().positive().optional().nullable(),
  monthlySalary: z.number().positive().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.labour_read);
    const { id } = await params;

    const worker = await prisma.worker.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!worker) throw new Error("NOT_FOUND");

    const [attendances, tasks, wageRecords] = await Promise.all([
      prisma.attendance.findMany({
        where: { workerId: id, tenantId: session.tenantId },
        orderBy: { date: "desc" },
        take: 30,
      }),
      prisma.task.findMany({
        where: { assignedWorkerId: id, tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { slab: { select: { slabCode: true } } },
      }),
      prisma.wageRecord.findMany({
        where: { workerId: id, tenantId: session.tenantId },
        orderBy: { month: "desc" },
        take: 12,
      }),
    ]);

    return NextResponse.json({
      worker: {
        ...worker,
        dailyWage: worker.dailyWage ? Number(worker.dailyWage) : null,
        monthlySalary: worker.monthlySalary ? Number(worker.monthlySalary) : null,
      },
      attendances,
      tasks,
      wageRecords: wageRecords.map((w) => ({
        ...w,
        grossAmount: Number(w.grossAmount),
        netAmount: Number(w.netAmount),
        advances: Number(w.advances),
        deductions: Number(w.deductions),
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.labour_write);
    const { id } = await params;
    const data = patchSchema.parse(await request.json());

    const existing = await prisma.worker.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) throw new Error("NOT_FOUND");

    const worker = await prisma.worker.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.emergencyContact !== undefined ? { emergencyContact: data.emergencyContact } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.dailyWage !== undefined ? { dailyWage: data.dailyWage } : {}),
        ...(data.monthlySalary !== undefined ? { monthlySalary: data.monthlySalary } : {}),
        ...(data.joiningDate !== undefined
          ? { joiningDate: data.joiningDate ? new Date(data.joiningDate) : null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return NextResponse.json({
      worker: {
        ...worker,
        dailyWage: worker.dailyWage ? Number(worker.dailyWage) : null,
        monthlySalary: worker.monthlySalary ? Number(worker.monthlySalary) : null,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
