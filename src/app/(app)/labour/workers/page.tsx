"use client";

import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { usePermissions } from "@/components/permissions-provider";
import { PERMISSIONS } from "@/lib/permissions";
import { useClientFetch } from "@/lib/client-fetch";

type WorkerRow = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  dailyWage: number | null;
  joiningDate: string | null;
  isActive: boolean;
};

export default function WorkersPage() {
  const { can } = usePermissions();
  const { data, loading, error, retry } = useClientFetch<{ workers: WorkerRow[] }>(
    "/api/labour/workers?all=true"
  );
  const workers = data?.workers ?? [];

  const columns: Column<WorkerRow>[] = [
    {
      id: "name",
      header: "Worker",
      accessor: (row) => (
        <Link href={`/labour/workers/${row.id}`} className="flex items-center gap-3 hover:opacity-80">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-medium text-[var(--accent)]">{row.name}</p>
            <p className="text-[var(--text-xs)] text-[var(--text-muted)] capitalize">
              {row.role.replace(/_/g, " ")}
            </p>
          </div>
        </Link>
      ),
      sortValue: (row) => row.name,
      filterValue: (row) => `${row.name} ${row.phone ?? ""}`,
    },
    {
      id: "phone",
      header: "Phone",
      accessor: (row) => row.phone ?? "—",
    },
    {
      id: "wage",
      header: "Daily Wage",
      accessor: (row) =>
        row.dailyWage ? (
          <span className="tabular-nums">₹{row.dailyWage.toLocaleString("en-IN")}</span>
        ) : (
          "—"
        ),
      sortValue: (row) => row.dailyWage ?? 0,
    },
    {
      id: "joined",
      header: "Joined",
      accessor: (row) =>
        row.joiningDate ? new Date(row.joiningDate).toLocaleDateString("en-IN") : "—",
      sortValue: (row) => row.joiningDate ?? "",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => <StatusChip status={row.isActive ? "active" : "inactive"} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Workers"
        description="Manage your workforce — profiles, wages, and employment status"
        breadcrumbs={[
          { label: "Labour", href: "/labour" },
          { label: "Workers" },
        ]}
        actions={
          can(PERMISSIONS.labour_write) ? (
            <Link href="/labour/workers/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add Worker
              </Button>
            </Link>
          ) : undefined
        }
      />

      {error && <Alert variant="danger" onRetry={retry}>{error}</Alert>}

      <DataTable
        data={workers}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search workers…"
        emptyIcon={Users}
        emptyTitle="No workers yet"
        emptyDescription="Add your first worker to track attendance, tasks, and wages."
        emptyActionHref={can(PERMISSIONS.labour_write) ? "/labour/workers/new" : undefined}
        emptyActionLabel="Add worker"
        rowActions={(row) => [
          { label: "View profile", href: `/labour/workers/${row.id}` },
        ]}
      />
    </div>
  );
}
