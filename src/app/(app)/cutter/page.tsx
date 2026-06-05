"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/badge";

type Machine = {
  id: string;
  name: string;
  status: string;
  operatorName: string | null;
  jobs: { id: string; slab: { slabCode: string }; operatorName: string; customerName: string | null }[];
};

export default function CutterPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [slabs, setSlabs] = useState<{ id: string; slabCode: string }[]>([]);
  const [form, setForm] = useState({ machineId: "", slabId: "", operatorName: "", customerName: "" });
  const [newMachine, setNewMachine] = useState("");

  async function load() {
    const [m, s] = await Promise.all([
      fetch("/api/cutter/machines").then((r) => r.json()),
      fetch("/api/inventory/slabs?status=in_stock").then((r) => r.json()),
    ]);
    setMachines(m.machines ?? []);
    setSlabs(s.slabs ?? []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  async function addMachine() {
    await fetch("/api/cutter/machines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newMachine }),
    });
    setNewMachine("");
    load();
  }

  async function startCut() {
    await fetch("/api/cutter/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, estimatedMinutes: 120 }),
    });
    setForm({ machineId: "", slabId: "", operatorName: "", customerName: "" });
    load();
  }

  async function completeJob(jobId: string) {
    await fetch("/api/cutter/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", jobId, piecesProduced: 1 }),
    });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Cutter Machine Board"
        description="Real-time machine status and cutting jobs"
        actions={
          <Link href="/production">
            <Button variant="secondary">Production Workflow</Button>
          </Link>
        }
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {machines.map((m) => (
          <Card
            key={m.id}
            className={
              m.status === "cutting"
                ? "border-[var(--success)]/40"
                : m.status === "maintenance"
                  ? "border-[var(--warning)]/40"
                  : ""
            }
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <CardTitle className="text-h3">{m.name}</CardTitle>
              <StatusChip status={m.status} />
            </CardHeader>
            <CardContent>
              {m.jobs[0] ? (
                <div className="text-[var(--text-sm)] space-y-2">
                  <p>
                    Slab: <strong className="font-mono">{m.jobs[0].slab.slabCode}</strong>
                  </p>
                  <p className="text-[var(--text-muted)]">Operator: {m.jobs[0].operatorName}</p>
                  {m.jobs[0].customerName && (
                    <p className="text-[var(--text-muted)]">Customer: {m.jobs[0].customerName}</p>
                  )}
                  <Button size="sm" className="mt-2" onClick={() => completeJob(m.jobs[0].id)}>
                    Mark Complete
                  </Button>
                </div>
              ) : (
                <p className="text-[var(--text-sm)] text-[var(--text-muted)] flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Idle — ready for next job
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Start Cutting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3 max-w-xl">
            <select
              className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
              value={form.machineId}
              onChange={(e) => setForm({ ...form, machineId: e.target.value })}
            >
              <option value="">Select machine</option>
              {machines.filter((m) => m.status === "idle").map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
              value={form.slabId}
              onChange={(e) => setForm({ ...form, slabId: e.target.value })}
            >
              <option value="">Select slab</option>
              {slabs.map((s) => (
                <option key={s.id} value={s.id}>{s.slabCode}</option>
              ))}
            </select>
            <Input
              placeholder="Operator name"
              value={form.operatorName}
              onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
            />
            <Input
              placeholder="Customer (optional)"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
          </div>
          <Button
            className="mt-4"
            onClick={startCut}
            disabled={!form.machineId || !form.slabId || !form.operatorName}
          >
            Start Job
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2 max-w-md">
        <Input placeholder="New machine name" value={newMachine} onChange={(e) => setNewMachine(e.target.value)} />
        <Button variant="secondary" onClick={addMachine}>Add Machine</Button>
      </div>
    </div>
  );
}
