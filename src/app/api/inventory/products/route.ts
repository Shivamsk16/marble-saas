import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auditLog, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum([
    "marble",
    "granite",
    "quartzite",
    "imported",
    "tiles",
    "accessories",
  ]),
  origin: z.string().optional(),
  color: z.string().optional(),
  finish: z.string().optional(),
  sizeL: z.number().int().positive().optional(),
  sizeW: z.number().int().positive().optional(),
  sizeH: z.number().int().positive().optional(),
  weightKg: z.number().positive().optional(),
  rateSqft: z.number().positive().optional(),
  minStockAlert: z.number().int().min(0).default(0),
});

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.inventory_read);
    const products = await prisma.product.findMany({
      where: { tenantId: session.tenantId },
      include: {
        _count: { select: { slabs: { where: { status: "in_stock" } } } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ products });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.inventory_write);
    const data = createSchema.parse(await request.json());

    const product = await prisma.product.create({
      data: {
        tenantId: session.tenantId,
        name: data.name,
        category: data.category,
        origin: data.origin,
        color: data.color,
        finish: data.finish,
        sizeL: data.sizeL,
        sizeW: data.sizeW,
        sizeH: data.sizeH,
        weightKg: data.weightKg,
        rateSqft: data.rateSqft,
        minStockAlert: data.minStockAlert,
      },
    });

    await auditLog({
      actorId: session.userId,
      tenantId: session.tenantId,
      action: "product.created",
      resourceType: "product",
      resourceId: product.id,
      afterState: product,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
