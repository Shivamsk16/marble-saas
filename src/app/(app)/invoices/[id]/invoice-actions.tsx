"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InvoiceActions({
  invoiceId,
  total,
  paid,
  hasEwb,
}: {
  invoiceId: string;
  total: number;
  paid: number;
  hasEwb: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(total - paid);
  const [distance, setDistance] = useState(120);

  async function recordPayment() {
    await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, mode: "neft" }),
    });
    router.refresh();
  }

  async function generateEwb() {
    await fetch("/api/ewb/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, distanceKm: distance }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div>
        <label className="text-xs block mb-1">Payment amount</label>
        <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <Button className="mt-2" variant="secondary" onClick={recordPayment}>Record payment</Button>
      </div>
      {!hasEwb && (
        <div>
          <label className="text-xs block mb-1">Distance (km)</label>
          <Input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} />
          <Button className="mt-2" onClick={generateEwb}>Generate E-Way Bill</Button>
        </div>
      )}
    </div>
  );
}
