"use client";

import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, exportToCsv, type Column } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/badge";
import { useClientFetch } from "@/lib/client-fetch";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  status: string;
  client: { name: string };
  ewayBills: { ewbNumber: string }[];
};

export default function InvoicesPage() {
  const { data, loading, error, retry } = useClientFetch<{
    invoices: (InvoiceRow & { total: { toString(): string } })[];
  }>("/api/invoices");

  const invoices: InvoiceRow[] = (data?.invoices ?? []).map((inv) => ({
    ...inv,
    total: Number(inv.total),
  }));

  const columns: Column<InvoiceRow>[] = [
    {
      id: "number",
      header: "Invoice #",
      accessor: (row) => (
        <Link href={`/invoices/${row.id}`} className="font-medium text-[var(--accent)] hover:underline">
          {row.invoiceNumber}
        </Link>
      ),
      sortValue: (row) => row.invoiceNumber,
      filterValue: (row) => `${row.invoiceNumber} ${row.client.name}`,
    },
    {
      id: "client",
      header: "Client",
      accessor: (row) => row.client.name,
      sortValue: (row) => row.client.name,
    },
    {
      id: "date",
      header: "Date",
      accessor: (row) => new Date(row.invoiceDate).toLocaleDateString("en-IN"),
      sortValue: (row) => new Date(row.invoiceDate).getTime(),
    },
    {
      id: "total",
      header: "Total",
      accessor: (row) => (
        <span className="tabular-nums">₹{row.total.toLocaleString("en-IN")}</span>
      ),
      sortValue: (row) => row.total,
    },
    {
      id: "status",
      header: "Payment",
      accessor: (row) => <StatusChip status={row.status} />,
    },
    {
      id: "ewb",
      header: "EWB",
      accessor: (row) => row.ewayBills[0]?.ewbNumber ?? "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Tax invoices, payments, and e-way bills"
        actions={
          <Link href="/invoices/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        }
      />

      {error && (
        <Alert variant="danger" onRetry={retry}>
          {error}
        </Alert>
      )}

      <DataTable
        data={invoices}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search invoices, clients…"
        emptyIcon={FileText}
        emptyTitle="No invoices"
        emptyDescription="Create your first tax invoice for a client."
        emptyActionHref="/invoices/new"
        emptyActionLabel="New invoice"
        rowActions={(row) => [
          { label: "View", href: `/invoices/${row.id}` },
          { label: "Print", href: `/invoices/${row.id}/print` },
        ]}
        onExport={(rows) =>
          exportToCsv(rows, [
            { header: "Number", value: (r) => r.invoiceNumber },
            { header: "Client", value: (r) => r.client.name },
            { header: "Total", value: (r) => String(r.total) },
            { header: "Status", value: (r) => r.status },
          ], "invoices.csv")
        }
      />
    </div>
  );
}
