import { prisma } from "@/lib/db";

export async function buildMorningDigest(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const settings = await prisma.reminderSetting.findUnique({
    where: { tenantId },
  });
  const escalationDays = settings?.escalationDays ?? 3;

  const [
    incompleteTasks,
    activeCutting,
    attendanceToday,
    workersCount,
    unpaidInvoices,
    expiringEwb,
    escalatedTasks,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        tenantId,
        status: { in: ["not_started", "in_progress", "blocked"] },
        updatedAt: { lt: today },
      },
      take: 20,
      include: { worker: { select: { name: true } } },
    }),
    prisma.cuttingJob.count({
      where: { tenantId, status: "active" },
    }),
    prisma.attendance.count({ where: { tenantId, date: today } }),
    prisma.worker.count({ where: { tenantId, isActive: true } }),
    prisma.invoice.findMany({
      where: { tenantId, status: { in: ["unpaid", "partial"] } },
      take: 10,
      include: { client: { select: { name: true } } },
    }),
    prisma.ewayBill.findMany({
      where: {
        tenantId,
        status: "active",
        validUntil: { lte: new Date(Date.now() + 86400000) },
      },
      take: 10,
    }),
    prisma.task.findMany({
      where: {
        tenantId,
        status: { not: "done" },
        carryForwardDays: { gte: escalationDays },
      },
      take: 10,
    }),
  ]);

  const lines: string[] = [
    "MarblePro — Morning Digest",
    "",
    `Incomplete tasks: ${incompleteTasks.length}`,
    `Active cutting jobs: ${activeCutting}`,
    `Attendance marked: ${attendanceToday}/${workersCount}`,
    `Unpaid invoices: ${unpaidInvoices.length}`,
    `EWBs expiring soon: ${expiringEwb.length}`,
  ];

  if (escalatedTasks.length > 0) {
    lines.push("", "⚠ Escalated tasks:");
    escalatedTasks.forEach((t) =>
      lines.push(`- ${t.title} (${t.carryForwardDays} days)`)
    );
  }

  return { body: lines.join("\n"), incompleteTasks, unpaidInvoices, expiringEwb };
}

export async function carryForwardTasks(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stale = await prisma.task.findMany({
    where: {
      tenantId,
      status: { in: ["not_started", "in_progress", "blocked"] },
      updatedAt: { lt: today },
    },
  });

  for (const task of stale) {
    await prisma.task.update({
      where: { id: task.id },
      data: { carryForwardDays: { increment: 1 } },
    });
  }
  return stale.length;
}

export async function sendReminderLog(
  tenantId: string,
  channel: string,
  recipient: string,
  body: string
) {
  const status =
    channel === "whatsapp" && !process.env.MSG91_AUTH_KEY ? "skipped" : "sent";

  await prisma.reminderLog.create({
    data: { tenantId, channel, recipient, body, status },
  });

  if (process.env.NODE_ENV === "development") {
    console.log(`[reminder:${channel}] ${recipient}\n${body}`);
  }
}
