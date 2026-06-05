"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { fetchJson, useClientFetch } from "@/lib/client-fetch";

type WorkspaceData = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    trialEndsAt: string | null;
    settings: {
      gstin: string | null;
      businessAddress: string | null;
      state: string | null;
      phone: string | null;
      bankName: string | null;
      bankAccount: string | null;
      bankIfsc: string | null;
      invoicePrefix: string;
      logoUrl: string | null;
    } | null;
  };
};

export function WorkspaceSettingsForm() {
  const { toast } = useToast();
  const { data, loading, error, retry } = useClientFetch<WorkspaceData>("/api/settings/workspace");
  const tenant = data?.tenant;
  const settings = tenant?.settings;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("MP");

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setGstin(settings?.gstin ?? "");
      setBusinessAddress(settings?.businessAddress ?? "");
      setState(settings?.state ?? "");
      setPhone(settings?.phone ?? "");
      setBankName(settings?.bankName ?? "");
      setBankAccount(settings?.bankAccount ?? "");
      setBankIfsc(settings?.bankIfsc ?? "");
      setInvoicePrefix(settings?.invoicePrefix ?? "MP");
    }
  }, [tenant, settings]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors["workspace-name"] = "Business name is required";
    if (!invoicePrefix.trim()) nextErrors["workspace-invoice-prefix"] = "Invoice prefix is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    const result = await fetchJson<WorkspaceData>("/api/settings/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        gstin: gstin.trim() || null,
        businessAddress: businessAddress.trim() || null,
        state: state.trim() || null,
        phone: phone.trim() || null,
        bankName: bankName.trim() || null,
        bankAccount: bankAccount.trim() || null,
        bankIfsc: bankIfsc.trim() || null,
        invoicePrefix: invoicePrefix.trim(),
      }),
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    toast("Workspace updated", "success");
    retry();
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[var(--surface-3)] rounded" />
        <div className="h-96 bg-[var(--surface-3)] rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Workspace"
        description="Business details used on invoices and documents"
        breadcrumbs={[{ label: "Settings", href: "/settings/profile" }, { label: "Workspace" }]}
      />

      {error && <Alert variant="danger" onRetry={retry}>{error}</Alert>}
      {saveError && <Alert variant="danger">{saveError}</Alert>}

      {tenant && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Badge variant="info" className="capitalize">{tenant.plan} plan</Badge>
          <Badge variant={tenant.status === "active" ? "success" : "warning"} className="capitalize">
            {tenant.status}
          </Badge>
          {tenant.trialEndsAt && (
            <span className="text-[var(--text-xs)] text-[var(--text-muted)]">
              Trial ends {new Date(tenant.trialEndsAt).toLocaleDateString("en-IN")}
            </span>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Business name" htmlFor="workspace-name" required error={fieldErrors["workspace-name"]}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Workspace slug" htmlFor="workspace-slug">
          <Input id="workspace-slug" value={tenant?.slug ?? ""} disabled />
        </FormField>
        <FormField label="GSTIN" htmlFor="workspace-gstin">
          <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
        </FormField>
        <FormField label="Business address" htmlFor="workspace-address">
          <Textarea value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} rows={3} />
        </FormField>
        <div className="grid sm:grid-cols-2 gap-3">
          <FormField label="State" htmlFor="workspace-state">
            <Input value={state} onChange={(e) => setState(e.target.value)} />
          </FormField>
          <FormField label="Business phone" htmlFor="workspace-phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
          </FormField>
        </div>
        <FormField label="Invoice prefix" htmlFor="workspace-invoice-prefix" required error={fieldErrors["workspace-invoice-prefix"]}>
          <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
        </FormField>
        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <p className="text-[var(--text-sm)] font-medium mb-3">Bank details</p>
          <div className="space-y-4">
            <FormField label="Bank name" htmlFor="workspace-bank-name">
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </FormField>
            <FormField label="Account number" htmlFor="workspace-bank-account">
              <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
            </FormField>
            <FormField label="IFSC" htmlFor="workspace-bank-ifsc">
              <Input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} />
            </FormField>
          </div>
        </div>
        <Button type="submit" loading={saving} disabled={saving}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
