"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchJson } from "@/lib/client-fetch";
import { Users } from "lucide-react";

type Client = { id: string; name: string };
type Worker = { id: string; name: string };

type LineItem = {
  description: string;
  material: string;
  quantity: number;
  unit: string;
  rate: number;
};

const emptyLine = (): LineItem => ({
  description: "",
  material: "",
  quantity: 1,
  unit: "sqft",
  rate: 0,
});

export default function NewOrderPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [materialNotes, setMaterialNotes] = useState("");
  const [expectedCompletion, setExpectedCompletion] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [assignedWorkerId, setAssignedWorkerId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/labour/workers").then((r) => r.json()),
    ])
      .then(([clientsData, workersData]) => {
        setClients(clientsData.clients ?? []);
        setWorkers(workersData.workers ?? []);
      })
      .catch(() => setError("Could not load form data"))
      .finally(() => setClientsLoading(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const nextErrors: Record<string, string> = {};
    if (!clientId) nextErrors["order-client"] = "Select a client";
    if (!title.trim()) nextErrors["order-title"] = "Order title is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const validLines = lines.filter((l) => l.description.trim() && l.quantity > 0);
    const result = await fetchJson<{ order: { id: string } }>("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        title: title.trim(),
        priority,
        materialNotes: materialNotes || undefined,
        expectedCompletion: expectedCompletion || undefined,
        deliveryDate: deliveryDate || undefined,
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        assignedWorkerId: assignedWorkerId || undefined,
        items: validLines.length
          ? validLines.map((l) => ({
              description: l.description,
              material: l.material || undefined,
              quantity: l.quantity,
              unit: l.unit,
              rate: l.rate > 0 ? l.rate : undefined,
            }))
          : undefined,
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/orders/${result.data.order.id}`);
    router.refresh();
  }

  if (!clientsLoading && clients.length === 0) {
    return (
      <div>
        <PageHeader
          title="New order"
          description="Create a customer order to start production"
          breadcrumbs={[
            { label: "Orders", href: "/orders" },
            { label: "New order" },
          ]}
        />
        <EmptyState
          icon={Users}
          title="Add a client first"
          description="Orders need a client. Create a client, then return here to start the production workflow."
          actionHref="/clients/new"
          actionLabel="Add client"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New order"
        description="Create a customer order to start the production workflow"
        breadcrumbs={[
          { label: "Orders", href: "/orders" },
          { label: "New order" },
        ]}
      />
      {error && <Alert variant="danger">{error}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Client" htmlFor="order-client" required error={fieldErrors["order-client"]}>
          <Select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={clientsLoading}
          >
            <option value="">{clientsLoading ? "Loading clients…" : "Select client"}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Order title" htmlFor="order-title" required error={fieldErrors["order-title"]}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kitchen countertop — Sharma residence"
          />
        </FormField>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="order-priority" className="block text-[var(--text-sm)] font-medium mb-1.5">
              Priority
            </label>
            <Select
              id="order-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
          <div>
            <label htmlFor="order-worker" className="block text-[var(--text-sm)] font-medium mb-1.5">
              Assigned worker
            </label>
            <Select
              id="order-worker"
              value={assignedWorkerId}
              onChange={(e) => setAssignedWorkerId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="order-expected" className="block text-[var(--text-sm)] font-medium mb-1.5">
              Expected completion
            </label>
            <Input
              id="order-expected"
              type="date"
              value={expectedCompletion}
              onChange={(e) => setExpectedCompletion(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="order-delivery" className="block text-[var(--text-sm)] font-medium mb-1.5">
              Delivery date
            </label>
            <Input
              id="order-delivery"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="order-amount" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Total amount (₹)
          </label>
          <Input
            id="order-amount"
            type="number"
            min={0}
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="order-material-notes" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Material notes
          </label>
          <Textarea
            id="order-material-notes"
            value={materialNotes}
            onChange={(e) => setMaterialNotes(e.target.value)}
            placeholder="Stone type, finish, edge profile…"
            rows={3}
          />
        </div>

        <div className="space-y-3">
          <p className="text-[var(--text-sm)] font-medium">Line items</p>
          {lines.map((line, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 border border-[var(--border-subtle)] p-3 rounded-[var(--radius-lg)]"
            >
              <div className="col-span-2">
                <label htmlFor={`order-line-desc-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  Description
                </label>
                <Input
                  id={`order-line-desc-${i}`}
                  value={line.description}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i].description = e.target.value;
                    setLines(next);
                  }}
                  placeholder="Countertop slab cutting"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor={`order-line-material-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  Material
                </label>
                <Input
                  id={`order-line-material-${i}`}
                  value={line.material}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i].material = e.target.value;
                    setLines(next);
                  }}
                  placeholder="Italian marble"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor={`order-line-unit-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  Unit
                </label>
                <Select
                  id={`order-line-unit-${i}`}
                  value={line.unit}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i].unit = e.target.value;
                    setLines(next);
                  }}
                >
                  <option value="sqft">sqft</option>
                  <option value="sqm">sqm</option>
                  <option value="pcs">pcs</option>
                  <option value="rft">rft</option>
                </Select>
              </div>
              <div>
                <label htmlFor={`order-line-qty-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  Quantity
                </label>
                <Input
                  id={`order-line-qty-${i}`}
                  type="number"
                  min={0}
                  step="0.001"
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i].quantity = Number(e.target.value);
                    setLines(next);
                  }}
                />
              </div>
              <div>
                <label htmlFor={`order-line-rate-${i}`} className="block text-[var(--text-sm)] font-medium mb-1.5">
                  Rate (₹)
                </label>
                <Input
                  id={`order-line-rate-${i}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.rate || ""}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i].rate = Number(e.target.value);
                    setLines(next);
                  }}
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setLines([...lines, emptyLine()])}>
            + Line item
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" disabled={loading || clientsLoading} loading={loading}>
            Create order
          </Button>
          <Link href="/orders">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
