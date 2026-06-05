"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Package, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, exportToCsv, type Column } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { useClientFetch } from "@/lib/client-fetch";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  rateSqft: number | null;
  inStock: number;
  minStockAlert: number;
  imageUrl: string | null;
  thicknessMm: number | null;
};

export default function InventoryPage() {
  const { data, loading, error, retry } = useClientFetch<{
    products: (ProductRow & { _count?: { slabs: number } })[];
  }>("/api/inventory/products");

  const products = useMemo(
    () =>
      (data?.products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        rateSqft: p.rateSqft ? Number(p.rateSqft) : null,
        inStock: p._count?.slabs ?? 0,
        minStockAlert: p.minStockAlert,
        imageUrl: p.imageUrl,
        thicknessMm: p.thicknessMm,
      })),
    [data]
  );

  const totalStock = products.reduce((s, p) => s + p.inStock, 0);
  const lowStock = products.filter((p) => p.minStockAlert > 0 && p.inStock < p.minStockAlert).length;

  const columns: Column<ProductRow>[] = [
    {
      id: "image",
      header: "",
      accessor: (row) =>
        row.imageUrl ? (
          <img src={row.imageUrl} alt="" className="h-10 w-14 rounded object-cover" />
        ) : (
          <div className="h-10 w-14 rounded bg-[var(--surface-3)]" />
        ),
    },
    {
      id: "name",
      header: "Material",
      accessor: (row) => <span className="font-medium">{row.name}</span>,
      sortValue: (row) => row.name,
      filterValue: (row) => row.name,
    },
    {
      id: "category",
      header: "Category",
      accessor: (row) => <span className="capitalize">{row.category}</span>,
      sortValue: (row) => row.category,
    },
    {
      id: "thickness",
      header: "Thickness",
      accessor: (row) => (row.thicknessMm ? `${row.thicknessMm}mm` : "—"),
    },
    {
      id: "rate",
      header: "Rate/sqft",
      accessor: (row) => (row.rateSqft ? `₹${row.rateSqft}` : "—"),
      sortValue: (row) => row.rateSqft ?? 0,
    },
    {
      id: "stock",
      header: "In Stock",
      accessor: (row) => (
        <span className={row.inStock < row.minStockAlert && row.minStockAlert > 0 ? "text-[var(--danger)] font-medium" : ""}>
          {row.inStock}
        </span>
      ),
      sortValue: (row) => row.inStock,
    },
    {
      id: "alert",
      header: "Alert at",
      accessor: (row) => row.minStockAlert || "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Products, stock levels, and material catalog"
        actions={
          <>
            <Link href="/inventory/slabs">
              <Button variant="secondary">View Slabs</Button>
            </Link>
            <Link href="/inventory/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
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
        <KpiCard label="Products" value={products.length} />
        <KpiCard label="Slabs in Stock" value={totalStock} href="/inventory/slabs" />
        <KpiCard label="Low Stock Alerts" value={lowStock} />
        <KpiCard label="Categories" value={new Set(products.map((p) => p.category)).size} />
      </div>

      <DataTable
        data={products}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search materials…"
        emptyIcon={Package}
        emptyTitle="No inventory"
        emptyDescription="Add your first marble or granite product to start tracking stock."
        emptyActionHref="/inventory/new"
        emptyActionLabel="Add product"
        rowActions={() => [
          { label: "View slabs", href: `/inventory/slabs` },
        ]}
        onExport={(rows) =>
          exportToCsv(rows, [
            { header: "Name", value: (r) => r.name },
            { header: "Category", value: (r) => r.category },
            { header: "Rate", value: (r) => String(r.rateSqft ?? "") },
            { header: "In Stock", value: (r) => String(r.inStock) },
          ], "inventory.csv")
        }
      />
    </div>
  );
}
