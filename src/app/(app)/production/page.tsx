"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Wrench } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { KanbanBoard, PRODUCTION_STAGES, type KanbanColumn } from "@/components/ui/kanban";
import { stageLabel } from "@/lib/orders";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { fetchJson, useClientFetch } from "@/lib/client-fetch";

type Order = {
  id: string;
  orderNumber: string;
  title: string;
  stage: string;
  priority: string;
  delayed: boolean;
  expectedCompletion: string | null;
  deliveryDate: string | null;
  client: { name: string };
  assignedWorker: { name: string } | null;
};

export default function ProductionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error, retry, setData } = useClientFetch<{ orders: Order[] }>("/api/orders");
  const orders = data?.orders ?? [];

  const refresh = useCallback(() => {
    retry();
  }, [retry]);

  useEffect(() => {
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const columns: KanbanColumn[] = PRODUCTION_STAGES.map((stage) => ({
    id: stage.id,
    title: stage.label,
    items: orders
      .filter((o) => o.stage === stage.id)
      .map((o) => ({
        id: o.id,
        title: o.title,
        subtitle: `${o.orderNumber} · ${o.client.name}`,
        worker: o.assignedWorker?.name,
        dueDate: (o.expectedCompletion ?? o.deliveryDate)
          ? new Date(o.expectedCompletion ?? o.deliveryDate!).toLocaleDateString("en-IN")
          : undefined,
        delayed: o.delayed,
        priority: o.priority as "high" | "medium" | "low",
        meta: stageLabel(o.stage),
      })),
  }));

  async function handleMove(itemId: string, fromCol: string, toCol: string) {
    const prev = data;
    setData((current) =>
      current
        ? {
            ...current,
            orders: current.orders.map((o) =>
              o.id === itemId ? { ...o, stage: toCol } : o
            ),
          }
        : current
    );
    const result = await fetchJson("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, stage: toCol }),
    });
    if (!result.ok) {
      setData(prev);
      toast(result.error, "error");
      return;
    }
    toast("Order moved successfully", "success");
    retry();
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-[var(--surface-3)] rounded" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 w-[280px] bg-[var(--surface-3)] rounded shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  const totalActive = orders.filter((o) => o.stage !== "delivered").length;
  const delayed = orders.filter((o) => o.delayed).length;

  return (
    <div>
      <PageHeader
        title="Production Workflow"
        description={`${totalActive} active orders · ${delayed} delayed`}
        sticky
      />

      {error && (
        <Alert variant="danger" onRetry={retry}>
          {error}
        </Alert>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No production orders"
          description="Create customer orders to track them through cutting, polishing, and delivery."
          actionHref="/orders/new"
          actionLabel="New order"
        />
      ) : (
        <KanbanBoard
          columns={columns}
          onMove={handleMove}
          onCardClick={(item) => router.push(`/orders/${item.id}`)}
        />
      )}
    </div>
  );
}
