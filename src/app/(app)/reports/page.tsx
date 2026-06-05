"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/tabs";

export default function ReportsPage() {
  const [type, setType] = useState("sales");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/api/reports?type=${type}&from=${from}&to=${to}`);
    setData(await res.json());
    setLoading(false);
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales, production, inventory, labour, and financial summaries"
        actions={<Button onClick={load} loading={loading}>Generate Report</Button>}
        filters={
          <SegmentedControl
            options={[
              { value: "sales", label: "Sales" },
              { value: "production", label: "Production" },
              { value: "inventory", label: "Inventory" },
              { value: "labour", label: "Labour" },
              { value: "financial", label: "Financial" },
            ]}
            value={type}
            onChange={setType}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 capitalize">
            <FileText className="h-4 w-4" />
            {type} Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data ? (
            <pre className="text-[var(--text-xs)] bg-[var(--surface-2)] p-4 rounded-[var(--radius-lg)] overflow-auto max-h-[60vh] font-mono">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : (
            <p className="text-[var(--text-muted)] text-[var(--text-sm)] py-8 text-center">
              Select a report type and click Generate Report
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
