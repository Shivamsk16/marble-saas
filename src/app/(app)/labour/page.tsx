"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Progress } from "@/components/ui/progress";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useClientFetch } from "@/lib/client-fetch";
import { usePermissions } from "@/components/permissions-provider";
import { PERMISSIONS } from "@/lib/permissions";

type WorkerStat = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  dailyWage: number | null;
  monthlySalary: number | null;
  presentToday: boolean;
  tasksTotal: number;
  tasksDone: number;
  completionPct: number;
  presentDays: number;
  halfDays: number;
  overtimeHours: number;
  grossWage: number;
};

type LabourData = {
  presentToday: number;
  totalWorkers: number;
  tasksDoneThisMonth: number;
  completionPct: number;
  totalOvertimeHours: number;
  workers: WorkerStat[];
};

export default function LabourPage() {
  const { can } = usePermissions();
  const { data, loading, error, retry } = useClientFetch<LabourData>("/api/labour/productivity");

  const columns: Column<WorkerStat>[] = [
    {
      id: "name",
      header: "Worker",
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-[var(--text-xs)] text-[var(--text-muted)] capitalize">{row.role.replace(/_/g, " ")}</p>
          </div>
        </div>
      ),
      sortValue: (row) => row.name,
      filterValue: (row) => row.name,
    },
    {
      id: "attendance",
      header: "Today",
      accessor: (row) => (
        <StatusChip status={row.presentToday ? "present" : "absent"} />
      ),
    },
    {
      id: "tasks",
      header: "Tasks",
      accessor: (row) => (
        <div className="min-w-[100px]">
          <p className="text-[var(--text-xs)] text-[var(--text-muted)] mb-1">{row.tasksDone}/{row.tasksTotal}</p>
          <Progress value={row.completionPct} />
        </div>
      ),
      sortValue: (row) => row.completionPct,
    },
    {
      id: "overtime",
      header: "Overtime",
      accessor: (row) => `${row.overtimeHours}h`,
      sortValue: (row) => row.overtimeHours,
    },
    {
      id: "wage",
      header: "Est. Wage",
      accessor: (row) => (
        <span className="tabular-nums">₹{Math.round(row.grossWage).toLocaleString("en-IN")}</span>
      ),
      sortValue: (row) => row.grossWage,
    },
    {
      id: "phone",
      header: "Phone",
      accessor: (row) => row.phone ?? "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Labour Management"
        description="Attendance, productivity, wages, and task assignments"
        actions={
          <>
            {can(PERMISSIONS.labour_write) && (
              <Link href="/labour/workers/new">
                <Button>Add Worker</Button>
              </Link>
            )}
            <Link href="/labour/attendance">
              <Button variant="secondary">Attendance</Button>
            </Link>
            <Link href="/labour/tasks">
              <Button variant="secondary">Tasks</Button>
            </Link>
            <Link href="/labour/wages">
              <Button variant="secondary">Wages</Button>
            </Link>
          </>
        }
      />

      {error && (
        <Alert variant="danger" onRetry={retry}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Present Today"
          value={data ? `${data.presentToday}/${data.totalWorkers}` : "—"}
          href="/labour/attendance"
        />
        <KpiCard label="Tasks Completed" value={data?.tasksDoneThisMonth ?? "—"} href="/labour/tasks" />
        <KpiCard label="Completion Rate" value={data ? `${data.completionPct}%` : "—"} />
        <KpiCard label="Overtime (Month)" value={data ? `${data.totalOvertimeHours}h` : "—"} />
      </div>

      <DataTable
        data={data?.workers ?? []}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search workers…"
        emptyIcon={Users}
        emptyTitle="No labour records"
        emptyDescription="Add workers to track attendance, tasks, and wages."
        emptyActionHref={can(PERMISSIONS.labour_write) ? "/labour/workers/new" : undefined}
        emptyActionLabel="Add worker"
      />
    </div>
  );
}
