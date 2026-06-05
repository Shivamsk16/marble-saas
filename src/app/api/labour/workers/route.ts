import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  role: z.enum(["cutter_operator", "loader", "polisher", "helper"]),
  dailyWage: z.number().positive().optional().nullable(),
  monthlySalary: z.number().positive().optional().nullable(),
  joiningDate: z.string().optional(),
});

function serializeWorker(w: {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  emergencyContact: string | null;
  role: string;
  dailyWage: { toString(): string } | null;
  monthlySalary: { toString(): string } | null;
  joiningDate: Date | null;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    ...w,
    dailyWage: w.dailyWage ? Number(w.dailyWage) : null,
    monthlySalary: w.monthlySalary ? Number(w.monthlySalary) : null,
  };
}

export async function GET(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.labour_read);
    const includeInactive = new URL(request.url).searchParams.get("all") === "true";
    const workers = await prisma.worker.findMany({
      where: {
        tenantId: session.tenantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ workers: workers.map(serializeWorker) });
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
        address: data.address,
        emergencyContact: data.emergencyContact,
        role: data.role,
        dailyWage: data.dailyWage,
        monthlySalary: data.monthlySalary,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
      },
    });
    return NextResponse.json({ worker: serializeWorker(worker) }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
