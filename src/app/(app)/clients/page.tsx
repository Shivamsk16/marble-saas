"use client";

import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, exportToCsv, type Column } from "@/components/ui/data-table";
import { useClientFetch } from "@/lib/client-fetch";
import { usePermissions } from "@/components/permissions-provider";
import { PERMISSIONS } from "@/lib/permissions";

type ClientRow = {
  id: string;
  name: string;
  gstin: string | null;
  state: string | null;
  phone: string | null;
  address: string | null;
};

export default function ClientsPage() {
  const { can } = usePermissions();
  const { data, loading, error, retry } = useClientFetch<{ clients: ClientRow[] }>("/api/clients");
  const clients = data?.clients ?? [];

  const columns: Column<ClientRow>[] = [
    {
      id: "name",
      header: "Client",
      accessor: (row) => <span className="font-medium">{row.name}</span>,
      sortValue: (row) => row.name,
      filterValue: (row) => `${row.name} ${row.phone ?? ""}`,
    },
    { id: "gstin", header: "GSTIN", accessor: (row) => row.gstin ?? "—" },
    { id: "state", header: "State", accessor: (row) => row.state ?? "—" },
    { id: "phone", header: "Phone", accessor: (row) => row.phone ?? "—" },
    { id: "address", header: "Address", accessor: (row) => row.address ?? "—", className: "max-w-[200px] truncate" },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Customer directory and contact details"
        actions={
          can(PERMISSIONS.clients_create) ? (
            <Link href="/clients/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add client
              </Button>
            </Link>
          ) : undefined
        }
      />
      {error && (
        <Alert variant="danger" onRetry={retry}>
          {error}
        </Alert>
      )}
      <DataTable
        data={clients}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search clients…"
        emptyIcon={Users}
        emptyTitle="No clients"
        emptyDescription="Add clients to create invoices and orders."
        emptyActionHref="/clients/new"
        emptyActionLabel="Add client"
        onExport={(rows) =>
          exportToCsv(rows, [
            { header: "Name", value: (r) => r.name },
            { header: "GSTIN", value: (r) => r.gstin ?? "" },
            { header: "Phone", value: (r) => r.phone ?? "" },
          ], "clients.csv")
        }
      />
    </div>
  );
}

