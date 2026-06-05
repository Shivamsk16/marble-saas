"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = { id: string; name: string };

export default function GenerateSlabsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/inventory/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/inventory/slabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: fd.get("productId"),
        count: Number(fd.get("count")),
        locationPrefix: fd.get("locationPrefix") || undefined,
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError("Could not generate slabs");
      return;
    }
    setCreated(data.slabs?.map((s: { slabCode: string }) => s.slabCode) ?? []);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Generate slab IDs</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        Creates unique codes for QR label printing (Phase 1). Batch print UI coming next.
      </p>
      {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}
      {created.length > 0 ? (
        <div className="rounded-xl border border-[var(--success)] bg-green-50 p-4 mb-4">
          <p className="font-medium text-green-900 mb-2">
            Created {created.length} slabs:
          </p>
          <ul className="font-mono text-xs max-h-40 overflow-y-auto">
            {created.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => router.push("/inventory/slabs")}
          >
            View all slabs
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Product *</label>
            <select
              name="productId"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Number of slabs *</label>
            <Input name="count" type="number" min={1} max={200} defaultValue={1} required />
          </div>
          <div>
            <label className="text-sm font-medium">Location prefix</label>
            <Input name="locationPrefix" placeholder="Rack B" />
          </div>
          <Button type="submit" disabled={loading || products.length === 0}>
            {loading ? "Generating…" : "Generate & assign IDs"}
          </Button>
        </form>
      )}
    </div>
  );
}
