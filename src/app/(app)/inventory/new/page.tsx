"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { fetchJson } from "@/lib/client-fetch";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const category = String(fd.get("category") ?? "").trim();
    const sizeL = fd.get("sizeL") ? Number(fd.get("sizeL")) : undefined;
    const sizeW = fd.get("sizeW") ? Number(fd.get("sizeW")) : undefined;
    const rateSqft = fd.get("rateSqft") ? Number(fd.get("rateSqft")) : undefined;
    const minStockAlert = Number(fd.get("minStockAlert") || 0);

    const nextErrors: Record<string, string> = {};
    if (!name) nextErrors["product-name"] = "Product name is required";
    if (!category) nextErrors["product-category"] = "Category is required";
    if (sizeL !== undefined && (Number.isNaN(sizeL) || sizeL <= 0)) {
      nextErrors["product-size-l"] = "Length must be a positive number";
    }
    if (sizeW !== undefined && (Number.isNaN(sizeW) || sizeW <= 0)) {
      nextErrors["product-size-w"] = "Width must be a positive number";
    }
    if (rateSqft !== undefined && (Number.isNaN(rateSqft) || rateSqft <= 0)) {
      nextErrors["product-rate"] = "Rate must be a positive number";
    }
    if (Number.isNaN(minStockAlert) || minStockAlert < 0) {
      nextErrors["product-min-stock"] = "Min stock alert cannot be negative";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const result = await fetchJson("/api/inventory/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        origin: fd.get("origin") || undefined,
        color: fd.get("color") || undefined,
        finish: fd.get("finish") || undefined,
        sizeL,
        sizeW,
        rateSqft,
        minStockAlert,
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
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
      {error && <Alert variant="danger">{error}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Name" htmlFor="product-name" required error={fieldErrors["product-name"]}>
          <Input name="name" />
        </FormField>
        <FormField label="Category" htmlFor="product-category" required error={fieldErrors["product-category"]}>
          <Select name="category" defaultValue={categories[0]}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Origin" htmlFor="product-origin">
          <Input name="origin" placeholder="Rajasthan, Italy…" />
        </FormField>
        <FormField label="Color" htmlFor="product-color">
          <Input name="color" />
        </FormField>
        <FormField label="Finish" htmlFor="product-finish">
          <Input name="finish" placeholder="polished, honed…" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Length (mm)" htmlFor="product-size-l" error={fieldErrors["product-size-l"]}>
            <Input name="sizeL" type="number" min={1} />
          </FormField>
          <FormField label="Width (mm)" htmlFor="product-size-w" error={fieldErrors["product-size-w"]}>
            <Input name="sizeW" type="number" min={1} />
          </FormField>
        </div>
        <FormField label="Rate per sqft (₹)" htmlFor="product-rate" error={fieldErrors["product-rate"]}>
          <Input name="rateSqft" type="number" step="0.01" min={0.01} />
        </FormField>
        <FormField label="Min stock alert (slab count)" htmlFor="product-min-stock" error={fieldErrors["product-min-stock"]}>
          <Input name="minStockAlert" type="number" min={0} defaultValue={0} />
        </FormField>
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
