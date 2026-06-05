import { prisma } from "@/lib/db";
import { isOrderDelayed } from "@/lib/orders";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}

export async function getDashboardStats(tenantId: string) {
  const today = startOfDay();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const ewbEnd = new Date(today);
  ewbEnd.setDate(ewbEnd.getDate() + 1);
  const weekAgo = daysAgo(7);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    slabsInStock,
    slabsInCutting,
    machinesActive,
    workersTotal,
    presentToday,
    pendingTasks,
    todaySales,
    overdueInvoices,
    ewbsExpiring,
    ordersInProgress,
    pendingDeliveries,
    todayProduction,
    criticalTasks,
    inventory,
    revenueLast7,
    revenuePrev7,
    productionLast7,
    unreadNotifications,
    invoicesThisMonth,
    collectionsThisMonth,
    gstThisMonth,
  ] = await Promise.all([
    prisma.slab.count({ where: { tenantId, status: "in_stock" } }),
    prisma.slab.count({ where: { tenantId, status: "in_cutting" } }),
    prisma.cutterMachine.count({ where: { tenantId, status: "cutting" } }),
    prisma.worker.count({ where: { tenantId, isActive: true } }),
    prisma.attendance.count({
      where: { tenantId, date: today, status: "present" },
    }),
    prisma.task.count({
      where: {
        tenantId,
        status: { in: ["not_started", "in_progress", "blocked"] },
      },
    }),
    prisma.invoice.aggregate({
      where: {
        tenantId,
        type: "tax",
        invoiceDate: { gte: today, lt: tomorrow },
      },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { tenantId, status: { in: ["unpaid", "partial"] } },
      _sum: { total: true },
    }),
    prisma.ewayBill.count({
      where: {
        tenantId,
        status: "active",
        validUntil: { gte: today, lt: ewbEnd },
      },
    }),
    prisma.order.count({
      where: { tenantId, stage: { not: "delivered" } },
    }),
    prisma.order.count({
      where: {
        tenantId,
        stage: "ready_for_dispatch",
        deliveryDate: { lte: tomorrow },
      },
    }),
    prisma.order.count({
      where: {
        tenantId,
        stage: { in: ["cutting", "polishing", "finishing"] },
        updatedAt: { gte: today },
      },
    }),
    prisma.task.count({
      where: {
        tenantId,
        priority: "high",
        status: { in: ["not_started", "in_progress", "blocked"] },
      },
    }),
    getInventoryAlerts(tenantId),
    getDailyRevenue(tenantId, weekAgo, tomorrow),
    getDailyRevenue(tenantId, daysAgo(14), weekAgo),
    getDailyProduction(tenantId, weekAgo, tomorrow),
    prisma.notification.count({
      where: { tenantId, readAt: null },
    }),
    prisma.invoice.count({
      where: {
        tenantId,
        type: "tax",
        invoiceDate: { gte: monthStart, lt: tomorrow },
      },
    }),
    prisma.payment.aggregate({
      where: {
        invoice: { tenantId },
        paidAt: { gte: monthStart, lt: tomorrow },
      },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        tenantId,
        type: "tax",
        invoiceDate: { gte: monthStart, lt: tomorrow },
      },
      _sum: { cgst: true, sgst: true, igst: true },
    }),
  ]);

  const revenue7Total = revenueLast7.reduce((s, d) => s + d.amount, 0);
  const revenuePrev7Total = revenuePrev7.reduce((s, d) => s + d.amount, 0);
  const revenueTrend =
    revenuePrev7Total > 0
      ? Math.round(((revenue7Total - revenuePrev7Total) / revenuePrev7Total) * 100)
      : 0;

  const delayedOrders = await prisma.order.findMany({
    where: { tenantId, stage: { not: "delivered" } },
    select: { stage: true, expectedCompletion: true, deliveryDate: true },
  });
  const delayedCount = delayedOrders.filter((o) =>
    isOrderDelayed(o.stage, o.expectedCompletion, o.deliveryDate)
  ).length;

  return {
    slabsInStock,
    slabsInCutting,
    machinesActive,
    labourPresent: presentToday,
    labourTotal: workersTotal,
    pendingTasks,
    todaySales: Number(todaySales._sum.total ?? 0),
    overduePayments: Number(overdueInvoices._sum.total ?? 0),
    ewbsExpiringToday: ewbsExpiring,
    lowStockCount: inventory.length,
    ordersInProgress,
    pendingDeliveries,
    todayProduction,
    criticalTasks,
    inventoryAlerts: inventory.length,
    revenueTrend,
    revenueSparkline: revenueLast7.map((d) => d.amount),
    productionSparkline: productionLast7.map((d) => d.count),
    delayedOrders: delayedCount,
    unreadNotifications,
    invoicesThisMonth,
    collectionsThisMonth: Number(collectionsThisMonth._sum.amount ?? 0),
    gstCollectedThisMonth:
      Number(gstThisMonth._sum.cgst ?? 0) +
      Number(gstThisMonth._sum.sgst ?? 0) +
      Number(gstThisMonth._sum.igst ?? 0),
  };
}

async function getInventoryAlerts(tenantId: string) {
  const products = await prisma.product.findMany({
    where: { tenantId, minStockAlert: { gt: 0 } },
    include: {
      _count: { select: { slabs: { where: { status: "in_stock" } } } },
    },
  });
  return products.filter((p) => p._count.slabs < p.minStockAlert);
}

async function getDailyRevenue(tenantId: string, from: Date, to: Date) {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      type: "tax",
      invoiceDate: { gte: from, lt: to },
    },
    select: { invoiceDate: true, total: true },
  });
  const days: { date: string; amount: number }[] = [];
  const cursor = new Date(from);
  while (cursor < to) {
    const key = cursor.toISOString().slice(0, 10);
    const amount = invoices
      .filter((i) => i.invoiceDate.toISOString().slice(0, 10) === key)
      .reduce((s, i) => s + Number(i.total), 0);
    days.push({ date: key, amount });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

async function getDailyProduction(tenantId: string, from: Date, to: Date) {
  const events = await prisma.orderStageEvent.findMany({
    where: {
      order: { tenantId },
      enteredAt: { gte: from, lt: to },
      stage: "delivered",
    },
    select: { enteredAt: true },
  });
  const days: { date: string; count: number }[] = [];
  const cursor = new Date(from);
  while (cursor < to) {
    const key = cursor.toISOString().slice(0, 10);
    const count = events.filter(
      (e) => e.enteredAt.toISOString().slice(0, 10) === key
    ).length;
    days.push({ date: key, count });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export async function getAttentionItems(tenantId: string) {
  const today = startOfDay();
  const items: { type: string; title: string; link: string; severity: string }[] = [];

  const [lowStock, delayedOrders, overdueInvoices, expiringEwbs, absentWorkers] =
    await Promise.all([
      prisma.product.findMany({
        where: { tenantId, minStockAlert: { gt: 0 } },
        include: { _count: { select: { slabs: { where: { status: "in_stock" } } } } },
      }),
      prisma.order.findMany({
        where: { tenantId, stage: { not: "delivered" } },
        include: { client: { select: { name: true } } },
        take: 20,
      }),
      prisma.invoice.findMany({
        where: { tenantId, status: { in: ["unpaid", "partial"] } },
        include: { client: { select: { name: true } } },
        take: 5,
        orderBy: { invoiceDate: "asc" },
      }),
      prisma.ewayBill.findMany({
        where: { tenantId, status: "active", validUntil: { lte: new Date(today.getTime() + 86400000) } },
        take: 5,
      }),
      prisma.worker.findMany({
        where: { tenantId, isActive: true },
        include: {
          attendances: { where: { date: today }, take: 1 },
        },
      }),
    ]);

  lowStock
    .filter((p) => p._count.slabs < p.minStockAlert)
    .forEach((p) =>
      items.push({
        type: "inventory",
        title: `Low stock: ${p.name} (${p._count.slabs} slabs)`,
        link: "/inventory",
        severity: "warning",
      })
    );

  delayedOrders
    .filter((o) => isOrderDelayed(o.stage, o.expectedCompletion, o.deliveryDate))
    .forEach((o) =>
      items.push({
        type: "production",
        title: `Delayed: ${o.orderNumber} — ${o.client.name}`,
        link: `/orders/${o.id}`,
        severity: "danger",
      })
    );

  overdueInvoices.forEach((inv) =>
    items.push({
      type: "payment",
      title: `Unpaid: ${inv.invoiceNumber} — ₹${Number(inv.total).toLocaleString("en-IN")}`,
      link: `/invoices/${inv.id}`,
      severity: "warning",
    })
  );

  expiringEwbs.forEach((ewb) =>
    items.push({
      type: "ewb",
      title: `EWB expiring: ${ewb.ewbNumber}`,
      link: "/ewb",
      severity: "warning",
    })
  );

  absentWorkers
    .filter((w) => !w.attendances.length || w.attendances[0].status === "absent")
    .slice(0, 3)
    .forEach((w) =>
      items.push({
        type: "labour",
        title: `Absent: ${w.name}`,
        link: "/labour/attendance",
        severity: "info",
      })
    );

  return items;
}

export async function getSalesReport(
  tenantId: string,
  from: Date,
  to: Date
) {
  return prisma.invoice.findMany({
    where: {
      tenantId,
      type: "tax",
      invoiceDate: { gte: from, lte: to },
    },
    include: { client: { select: { name: true } }, payments: true },
    orderBy: { invoiceDate: "desc" },
  });
}

export async function getProductionReport(tenantId: string, from: Date, to: Date) {
  return prisma.cuttingJob.findMany({
    where: {
      tenantId,
      status: "completed",
      completedAt: { gte: from, lte: to },
    },
    include: {
      machine: { select: { name: true } },
      slab: { select: { slabCode: true } },
    },
  });
}

export async function getLabourProductivity(tenantId: string) {
  const today = startOfDay();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [workers, tasksDone, attendances, workLogs] = await Promise.all([
    prisma.worker.findMany({
      where: { tenantId, isActive: true },
      include: {
        tasks: {
          where: { status: { in: ["not_started", "in_progress", "done"] } },
        },
        attendances: { where: { date: { gte: monthStart } } },
        workLogs: { where: { date: { gte: monthStart } } },
      },
    }),
    prisma.task.count({
      where: { tenantId, status: "done", completedAt: { gte: monthStart } },
    }),
    prisma.attendance.count({
      where: { tenantId, date: today, status: "present" },
    }),
    prisma.dailyWorkLog.aggregate({
      where: { tenantId, date: { gte: monthStart } },
      _sum: { hoursSpent: true },
    }),
  ]);

  const totalTasks = workers.reduce((s, w) => s + w.tasks.length, 0);
  const doneTasks = workers.reduce(
    (s, w) => s + w.tasks.filter((t) => t.status === "done").length,
    0
  );
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const workerStats = workers.map((w) => {
    const wTasks = w.tasks;
    const wDone = wTasks.filter((t) => t.status === "done").length;
    const presentDays = w.attendances.filter((a) => a.status === "present").length;
    const halfDays = w.attendances.filter((a) => a.status === "half_day").length;
    const overtimeHours = w.workLogs.reduce(
      (s, l) => s + Math.max(0, Number(l.hoursSpent ?? 0) - 8),
      0
    );
    return {
      id: w.id,
      name: w.name,
      role: w.role,
      phone: w.phone,
      dailyWage: w.dailyWage ? Number(w.dailyWage) : null,
      monthlySalary: w.monthlySalary ? Number(w.monthlySalary) : null,
      presentToday: w.attendances.some(
        (a) => a.date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10) && a.status === "present"
      ),
      tasksTotal: wTasks.length,
      tasksDone: wDone,
      completionPct: wTasks.length > 0 ? Math.round((wDone / wTasks.length) * 100) : 0,
      presentDays,
      halfDays,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      grossWage: w.dailyWage
        ? Number(w.dailyWage) * (presentDays + halfDays * 0.5)
        : w.monthlySalary
          ? Number(w.monthlySalary)
          : 0,
    };
  });

  return {
    presentToday: attendances,
    totalWorkers: workers.length,
    tasksDoneThisMonth: tasksDone,
    completionPct,
    totalOvertimeHours: Number(workLogs._sum.hoursSpent ?? 0),
    workers: workerStats,
  };
}
