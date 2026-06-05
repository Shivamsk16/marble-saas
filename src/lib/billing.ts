export type PlanId = "starter" | "professional" | "enterprise";
export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

export const PLANS: Record<
  PlanId,
  { name: string; price: number; seats: number; description: string }
> = {
  starter: {
    name: "Starter",
    price: 2999,
    seats: 5,
    description: "For small yards getting started with digital operations",
  },
  professional: {
    name: "Professional",
    price: 5999,
    seats: 15,
    description: "For growing businesses with production and labour tracking",
  },
  enterprise: {
    name: "Enterprise",
    price: 12999,
    seats: 50,
    description: "For multi-site operations with advanced reporting",
  },
};

export function planSeatLimit(plan: string): number {
  if (plan in PLANS) return PLANS[plan as PlanId].seats;
  if (plan === "trial") return 5;
  return 5;
}

export function subscriptionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    trial: "Trial",
    active: "Active",
    expired: "Expired",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}
