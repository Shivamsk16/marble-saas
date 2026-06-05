"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const businessName = String(fd.get("businessName") ?? "").trim();
    const slug = String(fd.get("slug") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    const nextErrors: Record<string, string> = {};
    if (!fullName) nextErrors["register-full-name"] = "Your name is required";
    if (!businessName) nextErrors["register-business-name"] = "Business name is required";
    if (!slug) nextErrors["register-slug"] = "Workspace URL is required";
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      nextErrors["register-slug"] = "Use lowercase letters, numbers, and hyphens only";
    }
    if (!email) nextErrors["register-email"] = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors["register-email"] = "Enter a valid email address";
    }
    if (!password) nextErrors["register-password"] = "Password is required";
    else if (password.length < 8) {
      nextErrors["register-password"] = "Password must be at least 8 characters";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName, businessName, slug }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Registration failed");
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
        </div>
        <div>
          <h1 className="text-display text-[var(--text)] max-w-md">
            Start your 14-day free trial
          </h1>
          <p className="text-[var(--text-muted)] mt-4 max-w-sm">
            Inventory tracking, production workflow, labour management, and GST invoicing — all in one platform.
          </p>
        </div>
        <p className="text-[var(--text-xs)] text-[var(--text-subtle)]">No credit card required</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-md" noValidate>
          <div className="lg:hidden mb-8">
            <p className="text-xl font-bold text-[var(--accent)]">MarblePro</p>
          </div>
          <h2 className="text-h1 mb-1">Create workspace</h2>
          <p className="text-[var(--text-sm)] text-[var(--text-muted)] mb-8">
            14 days free · Inventory + dashboard included
          </p>
          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
          <FormField label="Your name" htmlFor="register-full-name" required error={fieldErrors["register-full-name"]} className="mb-4">
            <Input name="fullName" autoComplete="name" />
          </FormField>
          <FormField label="Business name" htmlFor="register-business-name" required error={fieldErrors["register-business-name"]} className="mb-4">
            <Input name="businessName" autoComplete="organization" />
          </FormField>
          <FormField
            label="Workspace URL (lowercase, hyphens)"
            htmlFor="register-slug"
            required
            error={fieldErrors["register-slug"]}
            className="mb-4"
          >
            <Input name="slug" placeholder="sharma-stone-works" />
          </FormField>
          <FormField label="Email" htmlFor="register-email" required error={fieldErrors["register-email"]} className="mb-4">
            <Input name="email" type="email" autoComplete="email" />
          </FormField>
          <FormField label="Password (min 8)" htmlFor="register-password" required error={fieldErrors["register-password"]} className="mb-8">
            <Input name="password" type="password" autoComplete="new-password" />
          </FormField>
          <Button type="submit" disabled={loading} loading={loading} className="w-full h-12">
            Create workspace
          </Button>
          <p className="text-[var(--text-sm)] text-center mt-6 text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
