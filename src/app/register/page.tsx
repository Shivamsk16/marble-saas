"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
        fullName: fd.get("fullName"),
        businessName: fd.get("businessName"),
        slug: fd.get("slug"),
      }),
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
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <p className="text-xl font-bold text-[var(--accent)]">MarblePro</p>
          </div>
          <h2 className="text-h1 mb-1">Create workspace</h2>
          <p className="text-[var(--text-sm)] text-[var(--text-muted)] mb-8">
            14 days free · Inventory + dashboard included
          </p>
          {error && (
            <div className="text-[var(--text-sm)] text-[var(--danger)] mb-4 bg-[var(--danger-subtle)] rounded-[var(--radius-md)] p-3">
              {error}
            </div>
          )}
          <label htmlFor="register-full-name" className="block text-[var(--text-sm)] font-medium mb-1.5">Your name</label>
          <Input id="register-full-name" name="fullName" required className="mb-4" autoComplete="name" />
          <label htmlFor="register-business-name" className="block text-[var(--text-sm)] font-medium mb-1.5">Business name</label>
          <Input id="register-business-name" name="businessName" required className="mb-4" autoComplete="organization" />
          <label htmlFor="register-slug" className="block text-[var(--text-sm)] font-medium mb-1.5">
            Workspace URL <span className="text-[var(--text-muted)] font-normal">(lowercase, hyphens)</span>
          </label>
          <Input id="register-slug" name="slug" placeholder="sharma-stone-works" pattern="[a-z0-9]+(-[a-z0-9]+)*" className="mb-4" />
          <label htmlFor="register-email" className="block text-[var(--text-sm)] font-medium mb-1.5">Email</label>
          <Input id="register-email" name="email" type="email" required className="mb-4" autoComplete="email" />
          <label htmlFor="register-password" className="block text-[var(--text-sm)] font-medium mb-1.5">Password (min 8)</label>
          <Input id="register-password" name="password" type="password" minLength={8} required className="mb-8" autoComplete="new-password" />
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
