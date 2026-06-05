"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { fetchJson, useClientFetch } from "@/lib/client-fetch";

type ProfileUser = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  preferredLang: string;
};

export default function ProfileSettingsPage() {
  const { toast } = useToast();
  const { data, loading, error, retry } = useClientFetch<{ user: ProfileUser }>("/api/settings/profile");
  const user = data?.user;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLang, setPreferredLang] = useState("hi");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? "");
      setPhone(user.phone ?? "");
      setPreferredLang(user.preferredLang);
    }
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    const nextErrors: Record<string, string> = {};
    if (!fullName.trim()) nextErrors["profile-name"] = "Name is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    const result = await fetchJson<{ user: ProfileUser }>("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        preferredLang,
      }),
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    toast("Profile updated", "success");
    retry();
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[var(--surface-3)] rounded" />
        <div className="h-64 bg-[var(--surface-3)] rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your personal account details"
        breadcrumbs={[{ label: "Settings", href: "/settings/profile" }, { label: "Profile" }]}
      />

      {error && <Alert variant="danger" onRetry={retry}>{error}</Alert>}
      {saveError && <Alert variant="danger">{saveError}</Alert>}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Email" htmlFor="profile-email">
          <Input id="profile-email" value={user?.email ?? ""} disabled />
        </FormField>
        <FormField label="Full name" htmlFor="profile-name" required error={fieldErrors["profile-name"]}>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </FormField>
        <FormField label="Phone" htmlFor="profile-phone">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            autoComplete="tel"
          />
        </FormField>
        <FormField label="Preferred language" htmlFor="profile-lang">
          <Select
            value={preferredLang}
            onChange={(e) => setPreferredLang(e.target.value)}
          >
            <option value="hi">Hindi</option>
            <option value="en">English</option>
          </Select>
        </FormField>
        <Button type="submit" loading={saving} disabled={saving}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
