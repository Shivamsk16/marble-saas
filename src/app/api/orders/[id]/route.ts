import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { isOrderDelayed } from "@/lib/orders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
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
