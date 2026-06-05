import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const calcSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  workerId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.wages_read);
    const month = new URL(request.url).searchParams.get("month");
    if (!month) {
      return NextResponse.json({ error: "month required YYYY-MM" }, { status: 400 });
    }
    const session = await requirePermission(PERMISSIONS.wages_read);
    const records = await prisma.wageRecord.findMany({
      where: { tenantId: session.tenantId, month },
      include: { worker: { select: { name: true, role: true } } },
    });
    return NextResponse.json({ records });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.wages_write);
    const data = calcSchema.parse(await request.json());
    const [y, m] = data.month.split("-").map(Number);
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0);

    const workers = await prisma.worker.findMany({
      where: {
        tenantId: session.tenantId,
        isActive: true,
        ...(data.workerId ? { id: data.workerId } : {}),
      },
    });

    const created = [];
    for (const worker of workers) {
      const days = await prisma.attendance.count({
        where: {
          workerId: worker.id,
          date: { gte: from, lte: to },
          status: { in: ["present", "half_day"] },
        },
      });
      const halfDays = await prisma.attendance.count({
        where: { workerId: worker.id, date: { gte: from, lte: to }, status: "half_day" },
      });
      const effectiveDays = days - halfDays * 0.5;

      let gross = 0;
      if (worker.monthlySalary) {
        gross = Number(worker.monthlySalary);
      } else if (worker.dailyWage) {
        gross = Number(worker.dailyWage) * effectiveDays;
      }

      const net = gross;
      const record = await prisma.wageRecord.upsert({
        where: { workerId_month: { workerId: worker.id, month: data.month } },
        create: {
          tenantId: session.tenantId,
          workerId: worker.id,
          month: data.month,
          daysPresent: Math.round(effectiveDays),
          grossAmount: gross,
          netAmount: net,
        },
        update: {
          daysPresent: Math.round(effectiveDays),
          grossAmount: gross,
          netAmount: net,
        },
      });
      created.push(record);
    }
    return NextResponse.json({ records: created });
  } catch (e) {
    return apiError(e);
  }
}
