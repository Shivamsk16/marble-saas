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
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/client-fetch";

const ROLES = [
  { value: "cutter_operator", label: "Cutter Operator" },
  { value: "loader", label: "Loader" },
  { value: "polisher", label: "Polisher" },
  { value: "helper", label: "Helper" },
] as const;

export default function NewWorkerPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const dailyWage = fd.get("dailyWage") ? Number(fd.get("dailyWage")) : undefined;

    const nextErrors: Record<string, string> = {};
    if (!name) nextErrors["worker-name"] = "Name is required";
    if (dailyWage !== undefined && (Number.isNaN(dailyWage) || dailyWage <= 0)) {
      nextErrors["worker-wage"] = "Daily wage must be a positive number";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const result = await fetchJson("/api/labour/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone: String(fd.get("phone") ?? "").trim() || null,
        address: String(fd.get("address") ?? "").trim() || null,
        emergencyContact: String(fd.get("emergencyContact") ?? "").trim() || null,
        role: fd.get("role"),
        dailyWage,
        joiningDate: fd.get("joiningDate") || undefined,
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const worker = (result.data as { worker: { id: string } }).worker;
    router.push(`/labour/workers/${worker.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Add worker"
        description="Register a new worker for attendance and wage tracking"
        breadcrumbs={[
          { label: "Labour", href: "/labour" },
          { label: "Workers", href: "/labour/workers" },
          { label: "Add worker" },
        ]}
      />
      {error && <Alert variant="danger">{error}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Full name" htmlFor="worker-name" required error={fieldErrors["worker-name"]}>
          <Input name="name" />
        </FormField>
        <FormField label="Phone" htmlFor="worker-phone">
          <Input name="phone" type="tel" autoComplete="tel" />
        </FormField>
        <FormField label="Address" htmlFor="worker-address">
          <Textarea name="address" rows={2} />
        </FormField>
        <FormField label="Role" htmlFor="worker-role" required>
          <Select name="role" defaultValue={ROLES[0].value}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Daily wage (₹)" htmlFor="worker-wage" error={fieldErrors["worker-wage"]}>
          <Input name="dailyWage" type="number" step="0.01" min={0} />
        </FormField>
        <FormField label="Joining date" htmlFor="worker-joining">
          <Input
            name="joiningDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </FormField>
        <FormField label="Emergency contact" htmlFor="worker-emergency">
          <Input name="emergencyContact" type="tel" placeholder="Name & phone" />
        </FormField>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" disabled={loading} loading={loading}>Save worker</Button>
          <Link href="/labour/workers">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
