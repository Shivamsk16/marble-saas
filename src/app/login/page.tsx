"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    const nextErrors: Record<string, string> = {};
    if (!email) nextErrors["login-email"] = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors["login-email"] = "Enter a valid email address";
    }
    if (!password) nextErrors["login-password"] = "Password is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        tenantSlug: fd.get("tenantSlug") || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Login failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--surface-2)] flex-col justify-between p-12">
        <div>
          <p className="text-2xl font-bold text-[var(--accent)]">MarblePro</p>
          <p className="text-[var(--text-muted)] mt-1">Enterprise stone business management</p>
        </div>
        <div>
          <h1 className="text-display text-[var(--text)] max-w-md">
            Run your marble & granite operation with confidence
          </h1>
          <p className="text-[var(--text-muted)] mt-4 max-w-sm">
            Inventory, production, labour, invoicing, and compliance — built for stone manufacturers and warehouses.
          </p>
        </div>
        <p className="text-[var(--text-xs)] text-[var(--text-subtle)]">
          Trusted by stone businesses across India
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-md" noValidate>
          <div className="lg:hidden mb-8">
            <p className="text-xl font-bold text-[var(--accent)]">MarblePro</p>
          </div>
          <h2 className="text-h1 mb-1">Sign in</h2>
          <p className="text-[var(--text-sm)] text-[var(--text-muted)] mb-8">
            Access your workspace dashboard
          </p>
          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
          <FormField label="Email" htmlFor="login-email" required error={fieldErrors["login-email"]} className="mb-4">
            <Input name="email" type="email" autoComplete="email" />
          </FormField>
          <FormField label="Password" htmlFor="login-password" required error={fieldErrors["login-password"]} className="mb-4">
            <Input name="password" type="password" autoComplete="current-password" />
          </FormField>
          <FormField
            label="Workspace slug (optional)"
            htmlFor="login-tenant-slug"
            className="mb-8"
          >
            <Input name="tenantSlug" placeholder="sharma-stone-works" />
          </FormField>
          <Button type="submit" disabled={loading} loading={loading} className="w-full h-12">
            Sign in
          </Button>
          <p className="text-[var(--text-sm)] text-center mt-6 text-[var(--text-muted)]">
            New business?{" "}
            <Link href="/register" className="text-[var(--accent)] font-medium hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
