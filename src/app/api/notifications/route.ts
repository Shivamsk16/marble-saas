import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requireSession();
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { tenantId: session.tenantId, readAt: null },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (e) {
    return apiError(e);
  }
}

const patchSchema = z.object({
  id: z.string().uuid().optional(),
  markAllRead: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const data = patchSchema.parse(await request.json());

    if (data.markAllRead) {
      await prisma.notification.updateMany({
        where: { tenantId: session.tenantId, readAt: null },
        data: { readAt: new Date() },
      });
    } else if (data.id) {
      await prisma.notification.updateMany({
        where: { id: data.id, tenantId: session.tenantId },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
