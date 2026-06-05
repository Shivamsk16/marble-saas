import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";
import { nextOrderNumber, nextStage, PRODUCTION_STAGES } from "@/lib/orders";
import { isOrderDelayed } from "@/lib/orders";

export async function GET(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.orders_read);
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const clientId = searchParams.get("clientId");

    const orders = await prisma.order.findMany({
      where: {
        tenantId: session.tenantId,
        ...(stage ? { stage } : {}),
        ...(clientId ? { clientId } : {}),
      },
      include: {
        client: { select: { name: true, phone: true } },
        assignedWorker: { select: { name: true } },
        items: true,
        _count: { select: { attachments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = orders.map((o) => ({
      ...o,
      totalAmount: o.totalAmount ? Number(o.totalAmount) : null,
      delayed: isOrderDelayed(o.stage, o.expectedCompletion, o.deliveryDate),
    }));

    return NextResponse.json({ orders: enriched });
  } catch (e) {
    return apiError(e);
  }
}

const createSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]).optional(),
  materialNotes: z.string().optional(),
  expectedCompletion: z.string().optional(),
  deliveryDate: z.string().optional(),
  totalAmount: z.number().optional(),
  assignedWorkerId: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        material: z.string().optional(),
        quantity: z.number(),
        unit: z.string().optional(),
        rate: z.number().optional(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.orders_create);
    const data = createSchema.parse(await request.json());
    const orderNumber = await nextOrderNumber(session.tenantId);

    const order = await prisma.order.create({
      data: {
        tenantId: session.tenantId,
        clientId: data.clientId,
        orderNumber,
        title: data.title,
        priority: data.priority ?? "medium",
        materialNotes: data.materialNotes,
        expectedCompletion: data.expectedCompletion
          ? new Date(data.expectedCompletion)
          : undefined,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        totalAmount: data.totalAmount,
        assignedWorkerId: data.assignedWorkerId,
        items: data.items
          ? {
              create: data.items.map((item) => ({
                description: item.description,
                material: item.material,
                quantity: item.quantity,
                unit: item.unit ?? "sqft",
                rate: item.rate,
              })),
            }
          : undefined,
        stageEvents: {
          create: { stage: "new_order" },
        },
      },
      include: {
        client: { select: { name: true } },
        assignedWorker: { select: { name: true } },
        items: true,
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}

const patchSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(PRODUCTION_STAGES as unknown as [string, ...string[]]).optional(),
  action: z.enum(["advance"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  assignedWorkerId: z.string().uuid().nullable().optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
  expectedCompletion: z.string().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.orders_update);
    const data = patchSchema.parse(await request.json());

    const existing = await prisma.order.findFirst({
      where: { id: data.id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let newStage = data.stage;
    if (data.action === "advance") {
      newStage = nextStage(existing.stage as (typeof PRODUCTION_STAGES)[number]) ?? existing.stage;
    }

    const order = await prisma.order.update({
      where: { id: data.id },
      data: {
        ...(newStage && newStage !== existing.stage
          ? {
              stage: newStage,
              stageEvents: { create: { stage: newStage } },
            }
          : {}),
        ...(data.priority ? { priority: data.priority } : {}),
        ...(data.assignedWorkerId !== undefined
          ? { assignedWorkerId: data.assignedWorkerId }
          : {}),
        ...(data.paymentStatus ? { paymentStatus: data.paymentStatus } : {}),
        ...(data.expectedCompletion !== undefined
          ? {
              expectedCompletion: data.expectedCompletion
                ? new Date(data.expectedCompletion)
                : null,
            }
          : {}),
        ...(data.deliveryDate !== undefined
          ? { deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null }
          : {}),
      },
      include: {
        client: { select: { name: true } },
        assignedWorker: { select: { name: true } },
        items: true,
        attachments: true,
        stageEvents: { orderBy: { enteredAt: "asc" } },
      },
    });

    return NextResponse.json({ order });
  } catch (e) {
    return apiError(e);
  }
}
