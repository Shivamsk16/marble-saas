"use client";

import Link from "next/link";
import { Box, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, exportToCsv, type Column } from "@/components/ui/data-table";
import { StatusChip, Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { stageProgress, stageLabel } from "@/lib/orders";
import { useClientFetch } from "@/lib/client-fetch";
import { usePermissions } from "@/components/permissions-provider";
import { PERMISSIONS } from "@/lib/permissions";
import { useState } from "react";

type OrderRow = {
  id: string;
  orderNumber: string;
  title: string;
  stage: string;
  priority: string;
  paymentStatus: string;
  delayed: boolean;
  totalAmount: number | null;
  expectedCompletion: string | null;
  deliveryDate: string | null;
  client: { name: string };
  assignedWorker: { name: string } | null;
};

export default function OrdersPage() {
  const { can } = usePermissions();
  const [stageFilter, setStageFilter] = useState("all");
  const query = stageFilter !== "all" ? `?stage=${stageFilter}` : "";
  const { data, loading, error, retry } = useClientFetch<{ orders: OrderRow[] }>(
    `/api/orders${query}`,
    { deps: [stageFilter] }
  );
  const orders = data?.orders ?? [];

  const columns: Column<OrderRow>[] = [
    {
      id: "orderNumber",
      header: "Order #",
      accessor: (row) => (
        <Link href={`/orders/${row.id}`} className="font-mono font-medium text-[var(--accent)] hover:underline">
          {row.orderNumber}
        </Link>
      ),
      sortValue: (row) => row.orderNumber,
      filterValue: (row) => `${row.orderNumber} ${row.title}`,
    },
    {
      id: "title",
      header: "Title",
      accessor: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          <p className="text-[var(--text-xs)] text-[var(--text-muted)]">{row.client.name}</p>
        </div>
      ),
      sortValue: (row) => row.title,
    },
    {
      id: "stage",
      header: "Production",
      accessor: (row) => (
        <div className="min-w-[120px]">
          <p className="text-[var(--text-xs)] text-[var(--text-muted)] mb-1 capitalize">{stageLabel(row.stage)}</p>
          <Progress value={stageProgress(row.stage)} />
        </div>
      ),
      sortValue: (row) => row.stage,
    },
    {
      id: "worker",
      header: "Assigned",
      accessor: (row) => row.assignedWorker?.name ?? "—",
    },
    {
      id: "due",
      header: "Due",
      accessor: (row) => {
        const d = row.expectedCompletion ?? row.deliveryDate;
        if (!d) return "—";
        return (
          <span className={row.delayed ? "text-[var(--danger)] font-medium" : ""}>
            {new Date(d).toLocaleDateString("en-IN")}
          </span>
        );
      },
    },
    {
      id: "payment",
      header: "Payment",
      accessor: (row) => <StatusChip status={row.paymentStatus} />,
    },
    {
      id: "priority",
      header: "Priority",
      accessor: (row) =>
        row.delayed ? (
          <Badge variant="danger">Delayed</Badge>
        ) : (
          <StatusChip status={row.priority} />
        ),
    },
    {
      id: "amount",
      header: "Amount",
      accessor: (row) =>
        row.totalAmount ? (
          <span className="tabular-nums">₹{row.totalAmount.toLocaleString("en-IN")}</span>
        ) : (
          "—"
        ),
      sortValue: (row) => row.totalAmount ?? 0,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Customer orders with production status, payments, and delivery schedule"
        actions={
          <>
            {can(PERMISSIONS.orders_read) && (
              <Link href="/production">
                <Button variant="secondary">Production Board</Button>
              </Link>
            )}
            {can(PERMISSIONS.orders_create) && (
              <Link href="/orders/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  New Order
                </Button>
              </Link>
            )}
          </>
        }
        filters={
          <select
            id="orders-stage-filter"
            aria-label="Filter by production stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
          >
            <option value="all">All stages</option>
            <option value="new_order">New Order</option>
            <option value="design_approval">Design Approval</option>
            <option value="cutting">Cutting</option>
            <option value="polishing">Polishing</option>
            <option value="finishing">Finishing</option>
            <option value="quality_check">Quality Check</option>
            <option value="ready_for_dispatch">Ready for Dispatch</option>
            <option value="delivered">Delivered</option>
          </select>
        }
      />

      {error && (
        <Alert variant="danger" onRetry={retry}>
          {error}
        </Alert>
      )}

      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search orders, clients…"
        emptyIcon={Box}
        emptyTitle="No orders"
        emptyDescription="Create your first customer order to start the production workflow."
        emptyActionHref={can(PERMISSIONS.orders_create) ? "/orders/new" : undefined}
        emptyActionLabel="New order"
        rowActions={(row) => [
          { label: "View details", href: `/orders/${row.id}` },
          { label: "Production board", href: "/production" },
        ]}
        onExport={(rows) =>
          exportToCsv(rows, [
            { header: "Order", value: (r) => r.orderNumber },
            { header: "Title", value: (r) => r.title },
            { header: "Client", value: (r) => r.client.name },
            { header: "Stage", value: (r) => r.stage },
            { header: "Payment", value: (r) => r.paymentStatus },
          ], "orders.csv")
        }
      />
    </div>
  );
}
