"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)] text-center">
      <p className="text-[var(--text-sm)] font-medium text-[var(--accent)] mb-2">MarblePro</p>
      <h1 className="text-h1 text-[var(--text)] mb-2">Something went wrong</h1>
      <p className="text-[var(--text-sm)] text-[var(--text-muted)] max-w-md mb-8">
        An unexpected error occurred. Try again, or return to the dashboard.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard">
          <Button variant="secondary">Go to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
