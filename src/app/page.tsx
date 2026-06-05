import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 flex justify-between items-center">
        <span className="font-bold text-xl text-[var(--primary)]">MarblePro</span>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/register">
            <Button>Start free trial</Button>
          </Link>
        </div>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Marble & granite business management, built for India
        </h1>
        <p className="text-[var(--muted)] text-lg mb-8">
          Slab-level QR inventory, cutter tracking, GST invoices, E-Way Bill, labour
          attendance, and daily WhatsApp reminders — in Hindi and English.
        </p>
        <Link href="/register">
          <Button className="text-base px-8 py-3">14-day free trial — no card</Button>
        </Link>
        <ul className="mt-12 text-left text-sm text-stone-600 space-y-2 w-full max-w-md">
          <li>✓ QR-coded slab tracking from warehouse to invoice</li>
          <li>✓ Real-time cutter machine job board</li>
          <li>✓ One-click E-Way Bill from invoice (NIC API)</li>
          <li>✓ Labour attendance, tasks, wage slips</li>
        </ul>
      </section>
    </div>
  );
}
