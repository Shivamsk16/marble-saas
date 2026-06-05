"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchJson, useClientFetch } from "@/lib/client-fetch";

type LineItem = {
  description: string;
  quantity: number;
  unit: "sqft" | "slab" | "piece" | "kg" | "rft";
  rate: number;
  gstPercent: number;
};

const emptyLine = (): LineItem => ({
  description: "",
  quantity: 1,
  unit: "sqft",
  rate: 0,
  gstPercent: 18,
});

export default function NewInvoicePage() {
  const router = useRouter();
  const {
    data: clientsData,
    loading: clientsLoading,
    error: clientsError,
    retry: retryClients,
  } = useClientFetch<{ clients: { id: string; name: string }[] }>("/api/clients");
  const clients = clientsData?.clients ?? [];

  const [clientId, setClientId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const nextErrors: Record<string, string> = {};
    if (!clientId) nextErrors["invoice-client"] = "Select a client";
    const validLines = lines.filter((l) => l.description.trim() && l.rate > 0 && l.quantity > 0);
    if (validLines.length === 0) {
      nextErrors["invoice-lines"] = "Add at least one line item with description, quantity, and rate.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const result = await fetchJson<{ invoice: { id: string } }>("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        type: "tax",
        vehicleNumber: vehicleNumber || undefined,
        lines: validLines,
      }),
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/invoices/${result.data.invoice.id}`);
  }

  if (!clientsLoading && !clientsError && clients.length === 0) {
    return (
      <div>
        <PageHeader
          title="New invoice"
          description="Create a GST invoice for a client"
          breadcrumbs={[
            { label: "Invoices", href: "/invoices" },
            { label: "New invoice" },
          ]}
        />
        <EmptyState
          icon={Users}
          title="Add a client first"
          description="Invoices need a client. Create a client, then return here to issue your first invoice."
          actionHref="/clients/new"
          actionLabel="Add client"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New invoice"
        description="Create a GST invoice for a client"
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: "New invoice" },
        ]}
      />

      {clientsError && (
        <Alert variant="danger" onRetry={retryClients}>
          {clientsError}
        </Alert>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="Client" htmlFor="invoice-client" required error={fieldErrors["invoice-client"]}>
          <Select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={clientsLoading || !!clientsError}
          >
            <option value="">{clientsLoading ? "Loading clients…" : "Select client"}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="space-y-3">
          <p className="text-[var(--text-sm)] font-medium">Line items *</p>
          {fieldErrors["invoice-lines"] && (
            <p id="invoice-lines-error" role="alert" className="text-[var(--text-xs)] text-[var(--danger)]">
              {fieldErrors["invoice-lines"]}
            </p>
          )}
          {lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 border border-[var(--border-subtle)] p-3 rounded-[var(--radius-lg)]"
            >
              <div className="col-span-2">
                <label htmlFor={`invoice-line-desc-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  Description
                </label>
                <Input
                  id={`invoice-line-desc-${i}`}
                  value={l.description}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i].description = e.target.value;
                    setLines(n);
                  }}
                  placeholder="Marble countertop supply"
                />
              </div>
              <div>
                <label htmlFor={`invoice-line-qty-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  Quantity
                </label>
                <Input
                  id={`invoice-line-qty-${i}`}
                  type="number"
                  min={0}
                  step="0.001"
                  value={l.quantity}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i].quantity = Number(e.target.value);
                    setLines(n);
                  }}
                />
              </div>
              <div>
                <label htmlFor={`invoice-line-unit-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  Unit
                </label>
                <Select
                  id={`invoice-line-unit-${i}`}
                  value={l.unit}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i].unit = e.target.value as LineItem["unit"];
                    setLines(n);
                  }}
                >
                  <option value="sqft">sqft</option>
                  <option value="slab">slab</option>
                  <option value="piece">piece</option>
                  <option value="kg">kg</option>
                  <option value="rft">rft</option>
                </Select>
              </div>
              <div>
                <label htmlFor={`invoice-line-rate-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  Rate (₹)
                </label>
                <Input
                  id={`invoice-line-rate-${i}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.rate || ""}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i].rate = Number(e.target.value);
                    setLines(n);
                  }}
                />
              </div>
              <div>
                <label htmlFor={`invoice-line-gst-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  GST %
                </label>
                <Input
                  id={`invoice-line-gst-${i}`}
                  type="number"
                  min={0}
                  max={28}
                  value={l.gstPercent}
                  onChange={(e) => {
                    const n = [...lines];
                    n[i].gstPercent = Number(e.target.value);
                    setLines(n);
                  }}
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setLines([...lines, emptyLine()])}>
            + Line item
          </Button>
        </div>

        <div>
          <label htmlFor="invoice-vehicle" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Vehicle number (EWB)
          </label>
          <Input
            id="invoice-vehicle"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            type="submit"
            disabled={loading || clientsLoading || !!clientsError}
            loading={loading}
          >
            Create invoice
          </Button>
          <Link href="/invoices">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
