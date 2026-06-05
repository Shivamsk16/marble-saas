"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useClientFetch } from "@/lib/client-fetch";

type WorkerDetail = {
  worker: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    emergencyContact: string | null;
    role: string;
    dailyWage: number | null;
    joiningDate: string | null;
    isActive: boolean;
  };
  attendances: { id: string; date: string; status: string; notes: string | null }[];
  tasks: { id: string; title: string; status: string; createdAt: string; slab: { slabCode: string } | null }[];
  wageRecords: { id: string; month: string; daysPresent: number; grossAmount: number; netAmount: number; paidAt: string | null }[];
};

export default function WorkerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, loading, error, retry } = useClientFetch<WorkerDetail>(`/api/labour/workers/${id}`);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[var(--surface-3)] rounded" />
        <div className="h-40 bg-[var(--surface-3)] rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  const worker = data?.worker;
  if (!worker) {
    return error ? <Alert variant="danger" onRetry={retry}>{error}</Alert> : null;
  }

  return (
    <div>
      <PageHeader
        title={worker.name}
        description="Worker profile, attendance, tasks, and wage history"
        breadcrumbs={[
          { label: "Labour", href: "/labour" },
          { label: "Workers", href: "/labour/workers" },
          { label: worker.name },
        ]}
        actions={
          <Link href="/labour/attendance">
            <Button variant="secondary">Mark Attendance</Button>
          </Link>
        }
      />

      {error && <Alert variant="danger" onRetry={retry}>{error}</Alert>}

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={worker.name} size="lg" />
            <div className="flex-1 min-w-0 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-[var(--text-sm)]">
              <div>
                <p className="text-[var(--text-muted)]">Role</p>
                <p className="font-medium capitalize">{worker.role.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Status</p>
                <StatusChip status={worker.isActive ? "active" : "inactive"} />
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Phone</p>
                <p>{worker.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Daily wage</p>
                <p className="tabular-nums font-medium">
                  {worker.dailyWage ? `₹${worker.dailyWage.toLocaleString("en-IN")}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Joining date</p>
                <p>
                  {worker.joiningDate
                    ? new Date(worker.joiningDate).toLocaleDateString("en-IN")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Emergency contact</p>
                <p>{worker.emergencyContact ?? "—"}</p>
              </div>
              {worker.address && (
                <div className="sm:col-span-2">
                  <p className="text-[var(--text-muted)]">Address</p>
                  <p>{worker.address}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {(data?.attendances ?? []).length === 0 ? (
              <p className="text-[var(--text-sm)] text-[var(--text-muted)]">No attendance records</p>
            ) : (
              data?.attendances.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-[var(--text-sm)] py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                  <span>{new Date(a.date).toLocaleDateString("en-IN")}</span>
                  <StatusChip status={a.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {(data?.tasks ?? []).length === 0 ? (
              <p className="text-[var(--text-sm)] text-[var(--text-muted)]">No tasks assigned</p>
            ) : (
              data?.tasks.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-2 text-[var(--text-sm)] py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    {t.slab && (
                      <p className="text-[var(--text-xs)] text-[var(--text-muted)] font-mono">{t.slab.slabCode}</p>
                    )}
                  </div>
                  <Badge variant="neutral" className="capitalize shrink-0">{t.status.replace(/_/g, " ")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Wage History</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.wageRecords ?? []).length === 0 ? (
              <p className="text-[var(--text-sm)] text-[var(--text-muted)]">No wage records yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[var(--text-sm)]">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                      <th className="text-left p-2 font-medium">Month</th>
                      <th className="text-left p-2 font-medium">Days</th>
                      <th className="text-right p-2 font-medium">Gross</th>
                      <th className="text-right p-2 font-medium">Net</th>
                      <th className="text-left p-2 font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.wageRecords.map((w) => (
                      <tr key={w.id} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className="p-2">{w.month}</td>
                        <td className="p-2 tabular-nums">{w.daysPresent}</td>
                        <td className="p-2 text-right tabular-nums">₹{w.grossAmount.toLocaleString("en-IN")}</td>
                        <td className="p-2 text-right tabular-nums font-medium">₹{w.netAmount.toLocaleString("en-IN")}</td>
                        <td className="p-2">
                          {w.paidAt ? (
                            <Badge variant="success">Paid</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
