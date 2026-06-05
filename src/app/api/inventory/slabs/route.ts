import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auditLog, requirePermission } from "@/lib/auth";
import { nextSlabCode } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";

const listSchema = z.object({
  status: z.string().optional(),
  productId: z.string().uuid().optional(),
  q: z.string().optional(),
});

const batchCreateSchema = z.object({
  productId: z.string().uuid(),
  batchId: z.string().uuid().optional(),
  count: z.number().int().min(1).max(200),
  originalSizeL: z.number().int().optional(),
  originalSizeW: z.number().int().optional(),
  locationPrefix: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.inventory_read);
    const params = listSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams)
    );

    const slabs = await prisma.slab.findMany({
      where: {
        tenantId: session.tenantId,
        ...(params.status ? { status: params.status } : {}),
        ...(params.productId ? { productId: params.productId } : {}),
        ...(params.q
          ? {
              OR: [
                { slabCode: { contains: params.q, mode: "insensitive" } },
                { location: { contains: params.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { product: { select: { name: true, category: true } } },
      orderBy: { slabCode: "desc" },
      take: 100,
    });

    return NextResponse.json({ slabs });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** Create multiple slabs with auto-generated QR codes */
export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.inventory_write);
    const data = batchCreateSchema.parse(await request.json());

    const product = await prisma.product.findFirst({
      where: { id: data.productId, tenantId: session.tenantId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const created = [];
    for (let i = 0; i < data.count; i++) {
      const slabCode = await nextSlabCode(session.tenantId);
      const slab = await prisma.slab.create({
        data: {
          tenantId: session.tenantId,
          productId: data.productId,
          batchId: data.batchId,
          slabCode,
          status: "in_stock",
          originalSizeL: data.originalSizeL ?? product.sizeL ?? undefined,
          originalSizeW: data.originalSizeW ?? product.sizeW ?? undefined,
          remainingSizeL: data.originalSizeL ?? product.sizeL ?? undefined,
          remainingSizeW: data.originalSizeW ?? product.sizeW ?? undefined,
          location: data.locationPrefix
            ? `${data.locationPrefix}-${i + 1}`
            : undefined,
        },
      });
      created.push(slab);
    }

    await auditLog({
      actorId: session.userId,
      tenantId: session.tenantId,
      action: "slabs.batch_created",
      resourceType: "slab",
      afterState: { count: created.length, productId: data.productId },
    });

    return NextResponse.json({ slabs: created }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
