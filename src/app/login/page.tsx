"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
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
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <p className="text-xl font-bold text-[var(--accent)]">MarblePro</p>
          </div>
          <h2 className="text-h1 mb-1">Sign in</h2>
          <p className="text-[var(--text-sm)] text-[var(--text-muted)] mb-8">
            Access your workspace dashboard
          </p>
          {error && (
            <div className="text-[var(--text-sm)] text-[var(--danger)] mb-4 bg-[var(--danger-subtle)] rounded-[var(--radius-md)] p-3">
              {error}
            </div>
          )}
          <label htmlFor="login-email" className="block text-[var(--text-sm)] font-medium mb-1.5">Email</label>
          <Input id="login-email" name="email" type="email" required className="mb-4" autoComplete="email" />
          <label htmlFor="login-password" className="block text-[var(--text-sm)] font-medium mb-1.5">Password</label>
          <Input id="login-password" name="password" type="password" required className="mb-4" autoComplete="current-password" />
          <label htmlFor="login-tenant-slug" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Workspace slug{" "}
            <span className="text-[var(--text-muted)] font-normal">(optional)</span>
          </label>
          <Input id="login-tenant-slug" name="tenantSlug" placeholder="sharma-stone-works" className="mb-8" />
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
