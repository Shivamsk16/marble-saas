import { prisma } from "@/lib/db";
import { computeStockValue } from "@/lib/slab-utils";

export async function nextSlabCode(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SL-${year}-`;
  const last = await prisma.slab.findFirst({
    where: { tenantId, slabCode: { startsWith: prefix } },
    orderBy: { slabCode: "desc" },
    select: { slabCode: true },
  });
  const num = last
    ? parseInt(last.slabCode.slice(prefix.length), 10) + 1
    : 1;
  return `${prefix}${String(num).padStart(4, "0")}`;
}

export async function getInventorySummary(tenantId: string) {
  const [productCount, slabCounts, products] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.slab.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),
    prisma.product.findMany({
      where: { tenantId, minStockAlert: { gt: 0 } },
      include: {
        _count: { select: { slabs: { where: { status: "in_stock" } } } },
      },
    }),
  ]);

  const statusMap = Object.fromEntries(
    slabCounts.map((s) => [s.status, s._count])
  );

  const lowStockAlerts = products
    .filter((p) => p._count.slabs < p.minStockAlert)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      inStock: p._count.slabs,
      minStockAlert: p.minStockAlert,
    }));

  return {
    productCount,
    slabsInStock: statusMap.in_stock ?? 0,
    slabsInCutting: statusMap.in_cutting ?? 0,
    slabsSold: statusMap.sold ?? 0,
    lowStockAlerts,
  };
}

export async function getSlabInventory(tenantId: string, filters?: {
  status?: string;
  category?: string;
  search?: string;
}) {
  const slabs = await prisma.slab.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && {
        OR: [
          { slabCode: { contains: filters.search, mode: "insensitive" } },
          { location: { contains: filters.search, mode: "insensitive" } },
          { product: { name: { contains: filters.search, mode: "insensitive" } } },
        ],
      }),
      ...(filters?.category && { product: { category: filters.category } }),
    },
    include: {
      product: {
        select: {
          name: true,
          category: true,
          imageUrl: true,
          thicknessMm: true,
          sizeH: true,
          rateSqft: true,
        },
      },
      reservedForOrder: { select: { orderNumber: true } },
    },
    orderBy: { slabCode: "desc" },
  });

  return slabs.map((s) => ({
    id: s.id,
    slabCode: s.slabCode,
    status: s.status,
    location: s.location,
    dimensions: {
      l: s.remainingSizeL ?? s.originalSizeL,
      w: s.remainingSizeW ?? s.originalSizeW,
      thickness: s.product.thicknessMm ?? s.product.sizeH,
    },
    product: s.product,
    reserved: !!s.reservedForOrderId,
    reservedFor: s.reservedForOrder?.orderNumber ?? null,
    stockValue: computeStockValue(
      s.remainingSizeL ?? s.originalSizeL,
      s.remainingSizeW ?? s.originalSizeW,
      s.product.rateSqft
    ),
  }));
}
