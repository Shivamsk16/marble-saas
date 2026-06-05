import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  getProductionReport,
  getSalesReport,
} from "@/lib/reports";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    if (
      !hasPermission(session.permissions, PERMISSIONS.invoice_read) &&
      session.roleName !== "owner"
    ) {
      throw new Error("FORBIDDEN");
    }

    const type = new URL(request.url).searchParams.get("type") ?? "sales";
    const fromStr = new URL(request.url).searchParams.get("from");
    const toStr = new URL(request.url).searchParams.get("to");
    const from = fromStr
      ? new Date(fromStr)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = toStr ? new Date(toStr) : new Date();

    if (type === "sales") {
      const data = await getSalesReport(session.tenantId, from, to);
      return NextResponse.json({ type, from, to, data });
    }

    if (type === "production") {
      const data = await getProductionReport(session.tenantId, from, to);
      return NextResponse.json({ type, from, to, data });
    }

    if (type === "inventory") {
      const slabs = await prisma.slab.groupBy({
        by: ["status"],
        where: { tenantId: session.tenantId },
        _count: true,
      });
      const wastage = await prisma.slab.aggregate({
        where: { tenantId: session.tenantId },
        _sum: { wastageKg: true },
      });
      return NextResponse.json({
        type,
        slabs,
        totalWastageKg: wastage._sum.wastageKg,
      });
    }

    if (type === "labour") {
      const workers = await prisma.worker.findMany({
        where: { tenantId: session.tenantId, isActive: true },
        include: {
          _count: {
            select: {
              tasks: { where: { status: "done" } },
              attendances: true,
            },
          },
        },
      });
      return NextResponse.json({ type, workers });
    }

    if (type === "financial") {
      const [revenue, labourCost] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            tenantId: session.tenantId,
            type: "tax",
            invoiceDate: { gte: from, lte: to },
          },
          _sum: { total: true },
        }),
        prisma.wageRecord.aggregate({
          where: { tenantId: session.tenantId },
          _sum: { netAmount: true },
        }),
      ]);
      return NextResponse.json({
        type,
        revenue: revenue._sum.total,
        labourCost: labourCost._sum.netAmount,
      });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (e) {
    return apiError(e);
  }
}
