"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";

export default function NewClientPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        gstin: fd.get("gstin") || undefined,
        address: fd.get("address") || undefined,
        state: fd.get("state") || undefined,
        phone: fd.get("phone") || undefined,
        email: fd.get("email") || undefined,
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not save client");
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
      {error && (
        <div className="text-[var(--text-sm)] text-[var(--danger)] mb-4 bg-[var(--danger-subtle)] rounded-[var(--radius-md)] p-3">
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="client-name" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Client name *
          </label>
          <Input id="client-name" name="name" required />
        </div>
        <div>
          <label htmlFor="client-gstin" className="block text-[var(--text-sm)] font-medium mb-1.5">
            GSTIN
          </label>
          <Input id="client-gstin" name="gstin" placeholder="22AAAAA0000A1Z5" />
        </div>
        <div>
          <label htmlFor="client-phone" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Phone
          </label>
          <Input id="client-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div>
          <label htmlFor="client-email" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Email
          </label>
          <Input id="client-email" name="email" type="email" autoComplete="email" />
        </div>
        <div>
          <label htmlFor="client-state" className="block text-[var(--text-sm)] font-medium mb-1.5">
            State
          </label>
          <Input id="client-state" name="state" placeholder="Rajasthan, Delhi…" />
        </div>
        <div>
          <label htmlFor="client-address" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Address
          </label>
          <Textarea id="client-address" name="address" rows={3} />
        </div>
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
