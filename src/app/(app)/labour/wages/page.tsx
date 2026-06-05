"use client";

import { useState } from "react";
import { IndianRupee } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { fetchJson } from "@/lib/client-fetch";

type WageRow = {
  id: string;
  worker: { name: string };
  daysPresent: number;
  netAmount: string;
  grossAmount: string;
};

export default function WagesPage() {
  const month = new Date().toISOString().slice(0, 7);
  const [selected, setSelected] = useState(month);
  const [records, setRecords] = useState<WageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calculate() {
    setLoading(true);
    setError(null);
    const result = await fetchJson<{ records: WageRow[] }>("/api/labour/wages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: selected }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRecords(result.data.records ?? []);
  }

  async function load() {
    setLoading(true);
    setError(null);
    const result = await fetchJson<{ records: WageRow[] }>(`/api/labour/wages?month=${selected}`);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRecords(result.data.records ?? []);
  }

  const totalNet = records.reduce((s, r) => s + Number(r.netAmount), 0);

  const columns: Column<WageRow & { id: string }>[] = [
    {
      id: "worker",
      header: "Worker",
      accessor: (row) => <span className="font-medium">{row.worker?.name}</span>,
      sortValue: (row) => row.worker?.name ?? "",
    },
    {
      id: "days",
      header: "Days Present",
      accessor: (row) => row.daysPresent,
      sortValue: (row) => row.daysPresent,
    },
    {
      id: "gross",
      header: "Gross",
      accessor: (row) => (
        <span className="tabular-nums">₹{Number(row.grossAmount).toLocaleString("en-IN")}</span>
      ),
    },
    {
      id: "net",
      header: "Net Pay",
      accessor: (row) => (
        <span className="tabular-nums font-medium">₹{Number(row.netAmount).toLocaleString("en-IN")}</span>
      ),
      sortValue: (row) => Number(row.netAmount),
    },
  ];

  const tableData = records.map((r, i) => ({ ...r, id: r.id ?? String(i) }));

  return (
    <div>
      <PageHeader
        title="Monthly Wages"
        description="Wage calculations based on attendance and daily rates"
        breadcrumbs={[
          { label: "Labour", href: "/labour" },
          { label: "Wages" },
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
            <Button onClick={calculate} loading={loading}>Calculate</Button>
          </>
        }
        filters={
          <input
            id="wages-month"
            type="month"
            aria-label="Select month"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
          />
        }
      />

      {error && (
        <Alert variant="danger" onRetry={load}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <KpiCard label="Workers" value={records.length} />
        <KpiCard label="Total Payout" value={`₹${totalNet.toLocaleString("en-IN")}`} />
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search workers…"
        emptyIcon={IndianRupee}
        emptyTitle="No wage records"
        emptyDescription="Calculate wages for the selected month based on attendance."
        emptyActionOnClick={calculate}
        emptyActionLabel="Calculate wages"
      />
    </div>
  );
}
