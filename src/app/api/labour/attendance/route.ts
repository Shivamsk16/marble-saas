import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const bulkSchema = z.object({
  date: z.string(),
  entries: z.array(
    z.object({
      workerId: z.string().uuid(),
      status: z.enum(["present", "absent", "half_day", "leave"]),
      lateAt: z.string().optional(),
    })
  ),
});

export async function GET(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.labour_read);
    const dateStr = new URL(request.url).searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);

    const [workers, records] = await Promise.all([
      prisma.worker.findMany({
        where: { tenantId: session.tenantId, isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.attendance.findMany({
        where: { tenantId: session.tenantId, date },
      }),
    ]);

    return NextResponse.json({ workers, records, date: date.toISOString() });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.labour_write);
    const data = bulkSchema.parse(await request.json());
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    for (const entry of data.entries) {
      await prisma.attendance.upsert({
        where: {
          workerId_date: { workerId: entry.workerId, date },
        },
        create: {
          tenantId: session.tenantId,
          workerId: entry.workerId,
          date,
          status: entry.status,
          lateAt: entry.lateAt,
        },
        update: { status: entry.status, lateAt: entry.lateAt },
      });
    }
    return NextResponse.json({ ok: true, count: data.entries.length });
  } catch (e) {
    return apiError(e);
  }
}
