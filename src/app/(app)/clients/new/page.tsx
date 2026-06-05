"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/client-fetch";

export default function NewClientPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();

    const nextErrors: Record<string, string> = {};
    if (!name) nextErrors["client-name"] = "Client name is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors["client-email"] = "Enter a valid email address";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const result = await fetchJson("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        gstin: fd.get("gstin") || undefined,
        address: fd.get("address") || undefined,
        state: fd.get("state") || undefined,
        phone: fd.get("phone") || undefined,
        email: email || undefined,
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/clients");
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Add client"
        description="Customer details for invoices and orders"
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: "Add client" },
        ]}
      />
      {error && <Alert variant="danger">{error}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Client name" htmlFor="client-name" required error={fieldErrors["client-name"]}>
          <Input name="name" />
        </FormField>
        <FormField label="GSTIN" htmlFor="client-gstin">
          <Input name="gstin" placeholder="22AAAAA0000A1Z5" />
        </FormField>
        <FormField label="Phone" htmlFor="client-phone">
          <Input name="phone" type="tel" autoComplete="tel" />
        </FormField>
        <FormField label="Email" htmlFor="client-email" error={fieldErrors["client-email"]}>
          <Input name="email" type="email" autoComplete="email" />
        </FormField>
        <FormField label="State" htmlFor="client-state">
          <Input name="state" placeholder="Rajasthan, Delhi…" />
        </FormField>
        <FormField label="Address" htmlFor="client-address">
          <Textarea name="address" rows={3} />
        </FormField>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" disabled={loading} loading={loading}>
            Save client
          </Button>
          <Link href="/clients">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
