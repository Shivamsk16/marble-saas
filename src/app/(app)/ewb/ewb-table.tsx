"use client";

import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/badge";
import { Truck } from "lucide-react";

export type EwbRow = {
  id: string;
  ewbNumber: string;
  status: string;
  validUntil: string;
  invoice: { invoiceNumber: string; client: { name: string } };
};

export function EwbTable({ rows }: { rows: EwbRow[] }) {
  const columns: Column<EwbRow>[] = [
    {
      id: "ewb",
      header: "EWB No",
      accessor: (row) => <span className="font-mono font-medium">{row.ewbNumber}</span>,
      sortValue: (row) => row.ewbNumber,
    },
    { id: "invoice", header: "Invoice", accessor: (row) => row.invoice.invoiceNumber },
    { id: "client", header: "Client", accessor: (row) => row.invoice.client.name },
    {
      id: "valid",
      header: "Valid Until",
      accessor: (row) => new Date(row.validUntil).toLocaleDateString("en-IN"),
      sortValue: (row) => new Date(row.validUntil).getTime(),
    },
    { id: "status", header: "Status", accessor: (row) => <StatusChip status={row.status} /> },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      searchPlaceholder="Search EWB, invoices…"
      emptyIcon={Truck}
      emptyTitle="No e-way bills"
      emptyDescription="Generate e-way bills from invoices for transport compliance."
      emptyActionHref="/invoices"
      emptyActionLabel="View invoices"
    />
  );
}
