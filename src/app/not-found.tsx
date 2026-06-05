import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)] text-center">
      <p className="text-[var(--text-sm)] font-medium text-[var(--accent)] mb-2">MarblePro</p>
      <h1 className="text-h1 text-[var(--text)] mb-2">Page not found</h1>
      <p className="text-[var(--text-sm)] text-[var(--text-muted)] max-w-md mb-8">
        This page does not exist or may have been moved. Check the URL or return to your dashboard.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href="/dashboard">
          <Button>Go to dashboard</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Sign in</Button>
        </Link>
      </div>
    </div>
  );
}
