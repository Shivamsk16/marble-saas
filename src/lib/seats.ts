import { prisma } from "@/lib/db";

export type SeatUsage = {
  seatLimit: number;
  seatsUsed: number;
  pendingInvites: number;
  totalCommitted: number;
  available: number;
};

export async function getSeatUsage(tenantId: string): Promise<SeatUsage> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { seatLimit: true },
  });
  if (!tenant) throw new Error("NOT_FOUND");

  const [seatsUsed, pendingInvites] = await Promise.all([
    prisma.tenantMember.count({
      where: { tenantId, status: "active" },
    }),
    prisma.invitation.count({
      where: { tenantId, status: "pending" },
    }),
  ]);

  const totalCommitted = seatsUsed + pendingInvites;
  const available = Math.max(0, tenant.seatLimit - totalCommitted);

  return {
    seatLimit: tenant.seatLimit,
    seatsUsed,
    pendingInvites,
    totalCommitted,
    available,
  };
}

export async function assertSeatAvailable(tenantId: string) {
  const usage = await getSeatUsage(tenantId);
  if (usage.available <= 0) {
    throw new Error("SEAT_LIMIT");
  }
  return usage;
}
