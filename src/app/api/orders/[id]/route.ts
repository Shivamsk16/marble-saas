import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";
import { isOrderDelayed } from "@/lib/orders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.orders_read);
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        client: true,
        assignedWorker: { select: { id: true, name: true, phone: true, role: true } },
        items: true,
        attachments: true,
        stageEvents: { orderBy: { enteredAt: "asc" } },
        reservedSlabs: {
          include: { product: { select: { name: true, category: true } } },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        ...order,
        totalAmount: order.totalAmount ? Number(order.totalAmount) : null,
        delayed: isOrderDelayed(order.stage, order.expectedCompletion, order.deliveryDate),
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.orders_delete);
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!order) throw new Error("NOT_FOUND");

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
