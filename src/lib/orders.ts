import { prisma } from "@/lib/db";

export const PRODUCTION_STAGES = [
  "new_order",
  "design_approval",
  "cutting",
  "polishing",
  "finishing",
  "quality_check",
  "ready_for_dispatch",
  "delivered",
] as const;

export type ProductionStage = (typeof PRODUCTION_STAGES)[number];

export function nextStage(stage: ProductionStage): ProductionStage | null {
  const idx = PRODUCTION_STAGES.indexOf(stage);
  if (idx < 0 || idx >= PRODUCTION_STAGES.length - 1) return null;
  return PRODUCTION_STAGES[idx + 1];
}

export function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function nextOrderNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const last = await prisma.order.findFirst({
    where: { tenantId, orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const num = last ? parseInt(last.orderNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(num).padStart(4, "0")}`;
}

export function isOrderDelayed(
  stage: string,
  expectedCompletion: Date | null,
  deliveryDate: Date | null
): boolean {
  if (stage === "delivered") return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = expectedCompletion ?? deliveryDate;
  if (!target) return false;
  const d = new Date(target);
  d.setHours(0, 0, 0, 0);
  return d < now;
}

export function stageProgress(stage: string): number {
  const idx = PRODUCTION_STAGES.indexOf(stage as ProductionStage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / PRODUCTION_STAGES.length) * 100);
}
