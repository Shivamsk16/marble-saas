"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Box } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip, Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { stageProgress } from "@/lib/orders";
import { PRODUCTION_STAGES } from "@/components/ui/kanban";
import { fetchJson } from "@/lib/client-fetch";

type OrderDetail = {
  id: string;
  orderNumber: string;
  title: string;
  stage: string;
  priority: string;
  paymentStatus: string;
  delayed: boolean;
  materialNotes: string | null;
  totalAmount: number | null;
  expectedCompletion: string | null;
  deliveryDate: string | null;
  client: { name: string; phone: string | null; address: string | null; gstin: string | null };
  assignedWorker: { name: string; phone: string | null; role: string } | null;
  items: { description: string; material: string | null; quantity: { toString(): string }; unit: string; rate: { toString(): string } | null }[];
  attachments: { fileName: string; fileUrl: string }[];
  stageEvents: { stage: string; enteredAt: string }[];
  reservedSlabs: { slabCode: string; product: { name: string; category: string } }[];
};

type PageStatus = "loading" | "success" | "error" | "not_found";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const load = useCallback(async (id: string) => {
    setStatus("loading");
    setError(null);
    const result = await fetchJson<{ order: OrderDetail }>(`/api/orders/${id}`);
    if (!result.ok) {
      if (result.status === 404) {
        setStatus("not_found");
        setOrder(null);
        return;
      }
      setStatus("error");
      setError(result.error);
      setOrder(null);
      return;
    }
    setOrder(result.data.order);
    setStatus("success");
  }, []);

  useEffect(() => {
    let cancelled = false;
    params.then((p) => {
      if (cancelled) return;
      setOrderId(p.id);
      load(p.id);
    });
    return () => {
      cancelled = true;
    };
  }, [params, load]);

  async function advanceStage() {
    if (!order) return;
    setAdvancing(true);
    const patch = await fetchJson("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, action: "advance" }),
    });
    if (!patch.ok) {
      setAdvancing(false);
      setError(patch.error);
      return;
    }
    await load(order.id);
    setAdvancing(false);
  }

  if (status === "loading") {
    return (
      <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading order">
        <div className="h-8 w-48 bg-[var(--surface-3)] rounded" />
        <div className="h-64 bg-[var(--surface-3)] rounded" />
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div>
        <PageHeader
          title="Order not found"
          description="This order may have been removed or the link is incorrect"
          breadcrumbs={[
            { label: "Orders", href: "/orders" },
            { label: "Not found" },
          ]}
        />
        <EmptyState
          icon={Box}
          title="Order not found"
          description="Check the order number or return to the orders list."
          actionHref="/orders"
          actionLabel="Back to orders"
        />
      </div>
    );
  }

  if (status === "error" || !order) {
    return (
      <div>
        <PageHeader
          title="Order unavailable"
          description="Could not load order details"
          breadcrumbs={[
            { label: "Orders", href: "/orders" },
            { label: "Error" },
          ]}
        />
        <Alert variant="danger" onRetry={() => orderId && load(orderId)}>
          {error ?? "Could not load this order"}
        </Alert>
        <Link href="/orders">
          <Button variant="secondary">Back to orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={order.title}
        description={order.orderNumber}
        breadcrumbs={[
          { label: "Orders", href: "/orders" },
          { label: order.orderNumber },
        ]}
        actions={
          <>
            <Link href="/orders">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            {order.stage !== "delivered" && (
              <Button onClick={advanceStage} loading={advancing}>
                Advance Stage
              </Button>
            )}
          </>
        }
      />

      {error && (
        <Alert variant="danger" onRetry={() => load(order.id)}>
          {error}
        </Alert>
      )}

      {order.delayed && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--danger)]/30 bg-[var(--danger-subtle)] px-4 py-3 text-[var(--text-sm)] text-[var(--danger)]">
          This order is past its expected completion date
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Production Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <StatusChip status={order.stage} />
              {order.delayed && <Badge variant="danger">Delayed</Badge>}
              <StatusChip status={order.priority} />
            </div>
            <Progress value={stageProgress(order.stage)} showLabel />
            <div className="flex flex-wrap gap-1">
              {PRODUCTION_STAGES.map((s) => {
                const idx = PRODUCTION_STAGES.findIndex((x) => x.id === order.stage);
                const current = PRODUCTION_STAGES.findIndex((x) => x.id === s.id);
                return (
                  <span
                    key={s.id}
                    className={`text-[var(--text-xs)] px-2 py-1 rounded-[var(--radius-sm)] ${
                      current <= idx
                        ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                        : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                    }`}
                  >
                    {s.label}
                  </span>
                );
              })}
            </div>
            {order.assignedWorker && (
              <p className="text-[var(--text-sm)]">
                <span className="text-[var(--text-muted)]">Assigned: </span>
                {order.assignedWorker.name} ({order.assignedWorker.role.replace(/_/g, " ")})
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[var(--text-sm)]">
            <p className="font-medium">{order.client.name}</p>
            {order.client.phone && <p className="text-[var(--text-muted)]">{order.client.phone}</p>}
            {order.client.address && <p className="text-[var(--text-muted)]">{order.client.address}</p>}
            {order.client.gstin && <p className="text-[var(--text-muted)]">GSTIN: {order.client.gstin}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Material Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            {order.materialNotes && (
              <p className="text-[var(--text-sm)] text-[var(--text-muted)] mb-4">{order.materialNotes}</p>
            )}
            <table className="w-full text-[var(--text-sm)]">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Rate</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="py-2">
                      <p>{item.description}</p>
                      {item.material && <p className="text-[var(--text-xs)] text-[var(--text-muted)]">{item.material}</p>}
                    </td>
                    <td className="py-2">{Number(item.quantity)} {item.unit}</td>
                    <td className="py-2">{item.rate ? `₹${Number(item.rate)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment & Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[var(--text-sm)]">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Payment</span>
                <StatusChip status={order.paymentStatus} />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Total</span>
                <span className="font-medium">
                  {order.totalAmount ? `₹${order.totalAmount.toLocaleString("en-IN")}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Expected completion</span>
                <span>{order.expectedCompletion ? new Date(order.expectedCompletion).toLocaleDateString("en-IN") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Delivery date</span>
                <span>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString("en-IN") : "—"}</span>
              </div>
            </CardContent>
          </Card>

          {order.reservedSlabs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reserved Slabs</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[var(--text-sm)]">
                  {order.reservedSlabs.map((s, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="font-mono">{s.slabCode}</span>
                      <span className="text-[var(--text-muted)]">{s.product.name}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {order.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Drawings & Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {order.attachments.map((a, i) => (
                    <li key={i}>
                      <a href={a.fileUrl} className="text-[var(--accent)] text-[var(--text-sm)] hover:underline">
                        {a.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
