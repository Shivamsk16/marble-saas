"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { KanbanBoard, type KanbanColumn } from "@/components/ui/kanban";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  carryForwardDays: number;
  worker: { name: string } | null;
  slab: { slabCode: string } | null;
};

const COLS = [
  { id: "not_started", label: "Not Started" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/labour/tasks?status=open")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function addTask() {
    if (!title.trim()) return;
    await fetch("/api/labour/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority: "medium" }),
    });
    setTitle("");
    load();
    toast("Task created", "success");
  }

  async function setStatus(id: string, status: string) {
    const prev = [...tasks];
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await fetch("/api/labour/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      load();
    } catch {
      setTasks(prev);
      toast("Failed to update task", "error");
    }
  }

  const columns: KanbanColumn[] = COLS.map((col) => ({
    id: col.id,
    title: col.label,
    items: tasks
      .filter((t) => t.status === col.id)
      .map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.slab?.slabCode,
        worker: t.worker?.name,
        priority: t.priority as "high" | "medium" | "low",
        meta: t.carryForwardDays > 0 ? `Carry forward: ${t.carryForwardDays}d` : undefined,
      })),
  }));

  async function handleMove(itemId: string, _fromCol: string, toCol: string) {
    await setStatus(itemId, toCol);
  }

  if (loading) {
    return <div className="animate-pulse h-64 bg-[var(--surface-3)] rounded" />;
  }

  return (
    <div>
      <PageHeader
        title="Task Board"
        description="Daily task assignments and work tracking"
        breadcrumbs={[
          { label: "Labour", href: "/labour" },
          { label: "Tasks" },
        ]}
      />

      <div className="flex gap-2 mb-6 max-w-lg">
        <Input placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />
        <Button onClick={addTask}>Add</Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks"
          description="Create tasks and assign them to workers."
          action={addTask}
          actionLabel="Add first task"
        />
      ) : (
        <KanbanBoard columns={columns} onMove={handleMove} />
      )}
    </div>
  );
}
