"use client";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { fetchJson, useClientFetch } from "@/lib/client-fetch";
import { subscriptionStatusLabel, type PlanId } from "@/lib/billing";
import { useState } from "react";

type BillingData = {
  subscription: {
    plan: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
    renewalDate: string | null;
    seatLimit: number;
    seatsUsed: number;
    hasStripeCustomer: boolean;
  };
  seats: {
    seatLimit: number;
    seatsUsed: number;
    pendingInvites: number;
    available: number;
  };
  plans: Record<PlanId, { name: string; price: number; seats: number; description: string }>;
  stripeConfigured: boolean;
  history: { id: string; description: string; amount: number; status: string; plan: string | null; createdAt: string }[];
};

const statusVariant = (s: string) =>
  s === "active" || s === "paid" ? "success" : s === "trial" || s === "pending" ? "warning" : "danger";

export function BillingView() {
  const { toast } = useToast();
  const { data, loading, error, retry } = useClientFetch<BillingData>("/api/settings/billing");
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function upgradePlan(plan: PlanId) {
    if (!data?.stripeConfigured) {
      toast("Stripe billing is not configured", "error");
      return;
    }
    setUpgrading(plan);
    const result = await fetchJson<{ url: string }>("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    setUpgrading(null);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    if (result.data.url) {
      window.location.href = result.data.url;
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    const result = await fetchJson<{ url: string }>("/api/billing/portal", { method: "POST" });
    setPortalLoading(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    if (result.data.url) {
      window.location.href = result.data.url;
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[var(--surface-3)] rounded" />
        <div className="h-32 bg-[var(--surface-3)] rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  const sub = data?.subscription;

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Subscription, seats, and billing history"
        breadcrumbs={[{ label: "Settings", href: "/settings/profile" }, { label: "Billing" }]}
        actions={
          sub?.hasStripeCustomer && data?.stripeConfigured ? (
            <Button variant="outline" loading={portalLoading} onClick={openBillingPortal}>
              Manage billing
            </Button>
          ) : undefined
        }
      />

      {error && <Alert variant="danger" onRetry={retry}>{error}</Alert>}

      {sub && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[var(--text-sm)]">
              <div>
                <p className="text-[var(--text-muted)] mb-1">Current plan</p>
                <p className="text-h3 capitalize">{sub.plan}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] mb-1">Status</p>
                <Badge variant={statusVariant(sub.subscriptionStatus)}>
                  {subscriptionStatusLabel(sub.subscriptionStatus)}
                </Badge>
              </div>
              <div>
                <p className="text-[var(--text-muted)] mb-1">Seats used</p>
                <p className="font-medium tabular-nums">
                  {data?.seats.seatsUsed ?? sub.seatsUsed} / {sub.seatLimit}
                  {data?.seats.pendingInvites ? (
                    <span className="text-[var(--text-muted)] font-normal">
                      {" "}({data.seats.pendingInvites} pending)
                    </span>
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] mb-1">
                  {sub.subscriptionStatus === "trial" ? "Trial ends" : "Renewal date"}
                </p>
                <p>
                  {sub.subscriptionStatus === "trial" && sub.trialEndsAt
                    ? new Date(sub.trialEndsAt).toLocaleDateString("en-IN")
                    : sub.renewalDate
                      ? new Date(sub.renewalDate).toLocaleDateString("en-IN")
                      : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="mb-8">
        <h2 className="text-h3 mb-3">Upgrade plan</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {data &&
            (Object.entries(data.plans) as [PlanId, BillingData["plans"][PlanId]][]).map(([id, plan]) => (
              <Card key={id} className={sub?.plan === id ? "border-[var(--accent)]/40" : ""}>
                <CardContent className="p-5">
                  <p className="font-semibold text-h3">{plan.name}</p>
                  <p className="text-[var(--text-sm)] text-[var(--text-muted)] mt-1 mb-3">{plan.description}</p>
                  <p className="text-h2 tabular-nums mb-1">₹{plan.price.toLocaleString("en-IN")}<span className="text-[var(--text-sm)] text-[var(--text-muted)] font-normal">/mo</span></p>
                  <p className="text-[var(--text-xs)] text-[var(--text-muted)] mb-4">Up to {plan.seats} seats</p>
                  <Button
                    className="w-full"
                    variant={sub?.plan === id ? "secondary" : "primary"}
                    disabled={sub?.plan === id || !data.stripeConfigured}
                    loading={upgrading === id}
                    onClick={() => upgradePlan(id)}
                  >
                    {sub?.plan === id ? "Current plan" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
        {!data?.stripeConfigured && (
          <p className="text-[var(--text-xs)] text-[var(--text-muted)] mt-3">
            Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs to enable checkout.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-h3 mb-3">Billing history</h2>
        <Card>
          <CardContent className="p-0">
            {(data?.history ?? []).length === 0 ? (
              <p className="p-6 text-center text-[var(--text-sm)] text-[var(--text-muted)]">No billing history yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[var(--text-sm)]">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.history.map((h) => (
                      <tr key={h.id} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className="p-3">{new Date(h.createdAt).toLocaleDateString("en-IN")}</td>
                        <td className="p-3">{h.description}</td>
                        <td className="p-3 text-right tabular-nums">₹{h.amount.toLocaleString("en-IN")}</td>
                        <td className="p-3">
                          <Badge variant={statusVariant(h.status)} className="capitalize">{h.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
