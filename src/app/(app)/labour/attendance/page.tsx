"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Users, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/client-fetch";
import { cn } from "@/lib/utils";

type Worker = { id: string; name: string };
type AttendanceRecord = { workerId: string; status: string };

const STATUSES = [
  { value: "present", label: "Present", icon: Check, color: "success" },
  { value: "absent", label: "Absent", icon: X, color: "danger" },
  { value: "half_day", label: "Half Day", color: "warning" },
  { value: "leave", label: "Leave", color: "neutral" },
] as const;

export default function AttendancePage() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await fetchJson<{
      workers: Worker[];
      records: AttendanceRecord[];
    }>(`/api/labour/attendance?date=${date}`);

    setLoading(false);
    if (!result.ok) {
      setLoadError(result.error);
      return;
    }

    const map: Record<string, string> = {};
    (result.data.records ?? []).forEach((rec) => {
      map[rec.workerId] = rec.status;
    });
    result.data.workers?.forEach((w) => {
      if (!map[w.id]) map[w.id] = "present";
    });
    setWorkers(result.data.workers ?? []);
    setStatuses(map);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    const entries = Object.entries(statuses).map(([workerId, status]) => ({
      workerId,
      status,
    }));
    const result = await fetchJson("/api/labour/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, entries }),
    });
    setSaving(false);

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Attendance saved", "success");
  }

  function quickMark(workerId: string, status: string) {
    setStatuses((s) => ({ ...s, [workerId]: status }));
  }

  const presentCount = Object.values(statuses).filter((s) => s === "present").length;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Attendance"
        description={`${presentCount}/${workers.length} present · Mark in under 10 seconds`}
        breadcrumbs={[
          { label: "Labour", href: "/labour" },
          { label: "Attendance" },
        ]}
      />

      {loadError && (
        <Alert variant="danger" onRetry={load}>
          {loadError}
        </Alert>
      )}

      <div className="mb-6">
        <label htmlFor="attendance-date" className="block text-[var(--text-sm)] font-medium mb-1.5">
          Date
        </label>
        <input
          id="attendance-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 text-[var(--text-body)]"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-[var(--radius-lg)] bg-[var(--surface-3)] animate-pulse" />
          ))}
        </div>
      ) : workers.length === 0 && !loadError ? (
        <EmptyState
          icon={Users}
          title="No workers"
          description="Add workers in your workspace to start marking daily attendance."
          actionHref="/labour"
          actionLabel="Go to labour"
        />
      ) : (
        <div className="space-y-3">
          {workers.map((w) => (
            <div
              key={w.id}
              className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
            >
              <p className="text-lg font-medium mb-3">{w.name}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUSES.map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => quickMark(w.id, st.value)}
                    className={cn(
                      "h-12 rounded-[var(--radius-md)] text-[var(--text-sm)] font-medium border transition-colors",
                      statuses[w.id] === st.value
                        ? st.color === "success"
                          ? "bg-[var(--success-subtle)] border-[var(--success)] text-[var(--success)]"
                          : st.color === "danger"
                            ? "bg-[var(--danger-subtle)] border-[var(--danger)] text-[var(--danger)]"
                            : st.color === "warning"
                              ? "bg-[var(--warning-subtle)] border-[var(--warning)] text-[var(--warning)]"
                              : "bg-[var(--surface-2)] border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--border-subtle)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {workers.length > 0 && !loadError && (
        <Button className="w-full mt-6 h-14 text-lg" onClick={save} loading={saving}>
          Save All Attendance
        </Button>
      )}
    </div>
  );
}
