import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedWorkerId: z.string().uuid().optional(),
  relatedSlabId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z
    .enum(["not_started", "in_progress", "done", "blocked"])
    .optional(),
  blockedReason: z.string().optional(),
  photoUrl: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");

    const mine = new URL(request.url).searchParams.get("mine") === "true";
    const where: {
      tenantId: string;
      assignedWorkerId?: string;
      status?: { not: string };
    } = { tenantId: session.tenantId };

    if (mine && session.roleName === "labour") {
      const worker = await prisma.worker.findFirst({
        where: { tenantId: session.tenantId, userId: session.userId },
      });
      if (!worker) return NextResponse.json({ tasks: [] });
      where.assignedWorkerId = worker.id;
    } else {
      await requirePermission(PERMISSIONS.tasks_read);
    }

    const status = new URL(request.url).searchParams.get("status");
    if (status === "open") {
      where.status = { not: "done" };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        worker: { select: { name: true } },
        slab: { select: { slabCode: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
      take: 100,
    });
    return NextResponse.json({ tasks });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const body = await request.json();

    if (body.status !== undefined || body.photoUrl !== undefined) {
      const data = patchSchema.parse(body);
      const task = await prisma.task.findFirst({
        where: { id: data.id, tenantId: session.tenantId },
      });
      if (!task) throw new Error("NOT_FOUND");

      const isOwnTask =
        session.roleName === "labour" &&
        task.assignedWorkerId &&
        (await prisma.worker.findFirst({
          where: { userId: session.userId, tenantId: session.tenantId, id: task.assignedWorkerId },
        }));

      if (!isOwnTask) {
        await requirePermission(PERMISSIONS.tasks_write);
      }

      const updated = await prisma.task.update({
        where: { id: data.id },
        data: {
          status: data.status,
          blockedReason: data.blockedReason,
          photoUrl: data.photoUrl,
          completedAt: data.status === "done" ? new Date() : undefined,
        },
      });
      return NextResponse.json({ task: updated });
    }

    await requirePermission(PERMISSIONS.tasks_write);
    const data = createSchema.parse(body);
    const task = await prisma.task.create({
      data: {
        tenantId: session.tenantId,
        title: data.title,
        description: data.description,
        assignedWorkerId: data.assignedWorkerId,
        relatedSlabId: data.relatedSlabId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority,
        assignedByUserId: session.userId,
      },
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
