"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, exportToCsv, type Column } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { formatDimensions } from "@/lib/slab-utils";
import { useClientFetch } from "@/lib/client-fetch";

type SlabRow = {
  id: string;
  slabCode: string;
  status: string;
  location: string | null;
  dimensions: { l: number | null; w: number | null; thickness: number | null };
  product: {
    name: string;
    category: string;
    imageUrl: string | null;
    rateSqft: { toString(): string } | null;
  };
  reserved: boolean;
  reservedFor: string | null;
  stockValue: number;
};

export default function InventorySlabsPage() {
  const { data, loading, error, retry } = useClientFetch<{ slabs: SlabRow[] }>(
    "/api/inventory/slabs/enriched"
  );
  const slabs = data?.slabs ?? [];
  const [view, setView] = useState("table");
  const [category, setCategory] = useState("all");

  const filtered = category === "all" ? slabs : slabs.filter((s) => s.product.category === category);

  const columns: Column<SlabRow>[] = [
    {
      id: "image",
      header: "",
      accessor: (row) =>
        row.product.imageUrl ? (
          <Image src={row.product.imageUrl} alt="" width={56} height={40} className="h-10 w-14 rounded object-cover" />
        ) : (
          <div className="h-10 w-14 rounded bg-[var(--surface-3)]" />
        ),
    },
    {
      id: "slabCode",
      header: "Slab ID",
      accessor: (row) => <span className="font-mono font-medium">{row.slabCode}</span>,
      sortValue: (row) => row.slabCode,
      filterValue: (row) => row.slabCode,
    },
    {
      id: "material",
      header: "Material",
      accessor: (row) => (
        <div>
          <p className="font-medium">{row.product.name}</p>
          <p className="text-[var(--text-xs)] text-[var(--text-muted)] capitalize">{row.product.category}</p>
        </div>
      ),
      sortValue: (row) => row.product.name,
      filterValue: (row) => `${row.product.name} ${row.product.category}`,
    },
    {
      id: "dimensions",
      header: "Dimensions",
      accessor: (row) => formatDimensions(row.dimensions.l, row.dimensions.w, row.dimensions.thickness),
      sortValue: (row) => row.dimensions.l ?? 0,
    },
    {
      id: "location",
      header: "Location",
      accessor: (row) => row.location ?? "—",
      sortValue: (row) => row.location ?? "",
    },
    {
      id: "reserved",
      header: "Reserved",
      accessor: (row) =>
        row.reserved ? (
          <span className="text-[var(--warning)] text-[var(--text-xs)]">{row.reservedFor ?? "Yes"}</span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    {
      id: "value",
      header: "Stock Value",
      accessor: (row) => `₹${row.stockValue.toLocaleString("en-IN")}`,
      sortValue: (row) => row.stockValue,
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => <StatusChip status={row.status} />,
      sortValue: (row) => row.status,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Slab Inventory"
        description="Individual slab tracking with location, value, and reservation status"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory" },
          { label: "Slabs" },
        ]}
        actions={
          <Link href="/inventory/slabs/generate">
            <Button>
              <Plus className="h-4 w-4" />
              Generate Slab IDs
            </Button>
          </Link>
        }
        filters={
          <>
            <SegmentedControl
              options={[
                { value: "table", label: "Table" },
                { value: "grid", label: "Grid" },
              ]}
              value={view}
              onChange={setView}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
            >
              <option value="all">All categories</option>
              <option value="granite">Granite</option>
              <option value="marble">Marble</option>
            </select>
          </>
        }
      />

      {error && (
        <Alert variant="danger" onRetry={retry}>
          {error}
        </Alert>
      )}

      {view === "table" ? (
        <DataTable
          data={filtered}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search slabs, materials, locations…"
          emptyIcon={Package}
          emptyTitle="No inventory"
          emptyDescription="Receive a batch and generate QR-coded slab IDs to start tracking."
          emptyActionHref="/inventory/slabs/generate"
          emptyActionLabel="Generate slabs"
          bulkActions={[
            { label: "Export selected", onClick: (ids) => {
              const rows = filtered.filter((r) => ids.includes(r.id));
              exportToCsv(rows, [
                { header: "Slab ID", value: (r) => r.slabCode },
                { header: "Material", value: (r) => r.product.name },
                { header: "Category", value: (r) => r.product.category },
                { header: "Location", value: (r) => r.location ?? "" },
                { header: "Status", value: (r) => r.status },
                { header: "Value", value: (r) => String(r.stockValue) },
              ], "slabs.csv");
            }},
          ]}
          onExport={(rows) =>
            exportToCsv(rows, [
              { header: "Slab ID", value: (r) => r.slabCode },
              { header: "Material", value: (r) => r.product.name },
              { header: "Location", value: (r) => r.location ?? "" },
              { header: "Status", value: (r) => r.status },
              { header: "Value", value: (r) => String(r.stockValue) },
            ], "slabs-export.csv")
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="h-64 animate-pulse bg-[var(--surface-3)]" />
              ))
            : filtered.map((slab) => (
                <Card key={slab.id} className="overflow-hidden">
                  {slab.product.imageUrl ? (
                    <Image
                      src={slab.product.imageUrl}
                      alt={slab.product.name}
                      width={400}
                      height={128}
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="h-32 bg-[var(--surface-3)]" />
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[var(--text-sm)] font-medium">{slab.slabCode}</span>
                      <StatusChip status={slab.status} />
                    </div>
                    <p className="font-medium">{slab.product.name}</p>
                    <p className="text-[var(--text-xs)] text-[var(--text-muted)] capitalize">
                      {slab.product.category} · {formatDimensions(slab.dimensions.l, slab.dimensions.w, slab.dimensions.thickness)}
                    </p>
                    <div className="flex justify-between text-[var(--text-sm)]">
                      <span className="text-[var(--text-muted)]">{slab.location ?? "No location"}</span>
                      <span className="font-medium">₹{slab.stockValue.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </Card>
              ))}
        </div>
      )}
    </div>
  );
}
