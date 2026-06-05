import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const startSchema = z.object({
  machineId: z.string().uuid(),
  slabId: z.string().uuid(),
  operatorName: z.string().min(1),
  customerName: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
});

const completeSchema = z.object({
  jobId: z.string().uuid(),
  piecesProduced: z.number().int().min(0),
  wastageKg: z.number().min(0).optional(),
  damageNotes: z.string().optional(),
  outputs: z
    .array(
      z.object({
        sizeL: z.number().int().optional(),
        sizeW: z.number().int().optional(),
        quantity: z.number().int().default(1),
      })
    )
    .optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.cutter_read);
    const day = new URL(request.url).searchParams.get("day");
    const where: { tenantId: string; startedAt?: { gte: Date; lt: Date } } = {
      tenantId: session.tenantId,
    };
    if (day === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.startedAt = { gte: start, lt: end };
    }
    const jobs = await prisma.cuttingJob.findMany({
      where,
      include: {
        machine: { select: { name: true } },
        slab: { select: { slabCode: true, product: { select: { name: true } } } },
        outputs: true,
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ jobs });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.cutter_write);
    const body = await request.json();

    if (body.action === "complete") {
      const data = completeSchema.parse(body);
      const job = await prisma.cuttingJob.findFirst({
        where: { id: data.jobId, tenantId: session.tenantId, status: "active" },
      });
      if (!job) throw new Error("NOT_FOUND");

      await prisma.$transaction(async (tx) => {
        await tx.cuttingJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            completedAt: new Date(),
            piecesProduced: data.piecesProduced,
            wastageKg: data.wastageKg,
            damageNotes: data.damageNotes,
          },
        });
        if (data.outputs?.length) {
          await tx.cuttingJobOutput.createMany({
            data: data.outputs.map((o) => ({
              jobId: job.id,
              sizeL: o.sizeL,
              sizeW: o.sizeW,
              quantity: o.quantity,
            })),
          });
        }
        await tx.slab.update({
          where: { id: job.slabId },
          data: { status: "cut", wastageKg: data.wastageKg },
        });
        await tx.cutterMachine.update({
          where: { id: job.machineId },
          data: { status: "idle" },
        });
      });
      return NextResponse.json({ ok: true });
    }

    const data = startSchema.parse(body);
    const slab = await prisma.slab.findFirst({
      where: { id: data.slabId, tenantId: session.tenantId, status: "in_stock" },
    });
    if (!slab) {
      return NextResponse.json({ error: "Slab not in stock" }, { status: 400 });
    }

    const estimatedEndAt = data.estimatedMinutes
      ? new Date(Date.now() + data.estimatedMinutes * 60000)
      : undefined;

    const job = await prisma.$transaction(async (tx) => {
      const j = await tx.cuttingJob.create({
        data: {
          tenantId: session.tenantId,
          machineId: data.machineId,
          slabId: data.slabId,
          operatorName: data.operatorName,
          customerName: data.customerName,
          estimatedEndAt,
          status: "active",
        },
      });
      await tx.slab.update({
        where: { id: data.slabId },
        data: { status: "in_cutting" },
      });
      await tx.cutterMachine.update({
        where: { id: data.machineId },
        data: { status: "cutting", operatorName: data.operatorName },
      });
      return j;
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
