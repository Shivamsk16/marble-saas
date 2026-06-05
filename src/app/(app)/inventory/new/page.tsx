"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";

const categories = [
  "marble",
  "granite",
  "quartzite",
  "imported",
  "tiles",
  "accessories",
] as const;

export default function NewProductPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/inventory/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        category: fd.get("category"),
        origin: fd.get("origin") || undefined,
        color: fd.get("color") || undefined,
        finish: fd.get("finish") || undefined,
        sizeL: fd.get("sizeL") ? Number(fd.get("sizeL")) : undefined,
        sizeW: fd.get("sizeW") ? Number(fd.get("sizeW")) : undefined,
        rateSqft: fd.get("rateSqft") ? Number(fd.get("rateSqft")) : undefined,
        minStockAlert: Number(fd.get("minStockAlert") || 0),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Could not save product");
      return;
    }
    router.push("/inventory");
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Add product"
        description="Add a product to your inventory catalog"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory" },
          { label: "Add product" },
        ]}
      />
      {error && (
        <div className="text-[var(--text-sm)] text-[var(--danger)] mb-4 bg-[var(--danger-subtle)] rounded-[var(--radius-md)] p-3">
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="product-name" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Name *
          </label>
          <Input id="product-name" name="name" required />
        </div>
        <div>
          <label htmlFor="product-category" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Category *
          </label>
          <Select id="product-category" name="category" required defaultValue={categories[0]}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="product-origin" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Origin
          </label>
          <Input id="product-origin" name="origin" placeholder="Rajasthan, Italy…" />
        </div>
        <div>
          <label htmlFor="product-color" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Color
          </label>
          <Input id="product-color" name="color" />
        </div>
        <div>
          <label htmlFor="product-finish" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Finish
          </label>
          <Input id="product-finish" name="finish" placeholder="polished, honed…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="product-size-l" className="block text-[var(--text-sm)] font-medium mb-1.5">
              Length (mm)
            </label>
            <Input id="product-size-l" name="sizeL" type="number" />
          </div>
          <div>
            <label htmlFor="product-size-w" className="block text-[var(--text-sm)] font-medium mb-1.5">
              Width (mm)
            </label>
            <Input id="product-size-w" name="sizeW" type="number" />
          </div>
        </div>
        <div>
          <label htmlFor="product-rate" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Rate per sqft (₹)
          </label>
          <Input id="product-rate" name="rateSqft" type="number" step="0.01" />
        </div>
        <div>
          <label htmlFor="product-min-stock" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Min stock alert (slab count)
          </label>
          <Input id="product-min-stock" name="minStockAlert" type="number" defaultValue={0} />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" disabled={loading} loading={loading}>
            Save product
          </Button>
          <Link href="/inventory">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
