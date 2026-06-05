"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  photoUrl: string | null;
  slab: { slabCode: string } | null;
};

export default function MyTasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/labour/tasks?mine=true&status=open")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function markDone(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id));
    await fetch("/api/labour/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "done" }),
    });
    toast("Task completed!", "success");
  }

  async function markInProgress(id: string) {
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status: "in_progress" } : x)));
    await fetch("/api/labour/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "in_progress" }),
    });
    toast("Progress updated", "success");
  }

  async function uploadPhoto(id: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const photoUrl = reader.result as string;
        setTasks((t) => t.map((x) => (x.id === id ? { ...x, photoUrl } : x)));
        await fetch("/api/labour/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, photoUrl }),
        });
        toast("Photo uploaded", "success");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-[var(--surface-3)] rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      <PageHeader title="My Tasks" description="Complete your assigned work quickly" />

      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks today"
          description="You're all caught up. Check back later for new assignments."
        />
      ) : (
        <ul className="space-y-4">
          {tasks.map((t, i) => (
            <li
              key={t.id}
              className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-bold text-[var(--text-sm)]">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-lg font-semibold leading-snug">{t.title}</p>
                  {t.slab && (
                    <p className="text-[var(--text-sm)] text-[var(--text-muted)] font-mono mt-1">
                      {t.slab.slabCode}
                    </p>
                  )}
                </div>
              </div>

              {t.status === "in_progress" && (
                <div className="mb-4">
                  <Progress value={50} showLabel />
                </div>
              )}

              {t.photoUrl && (
                <img src={t.photoUrl} alt="Work photo" className="w-full h-40 object-cover rounded-[var(--radius-md)] mb-3" />
              )}

              <div className="grid grid-cols-2 gap-2">
                {t.status === "not_started" && (
                  <Button className="col-span-2 h-14 text-base" onClick={() => markInProgress(t.id)}>
                    Start Task
                  </Button>
                )}
                {t.status === "in_progress" && (
                  <>
                    <Button variant="secondary" className="h-14" onClick={() => uploadPhoto(t.id)}>
                      <Camera className="h-5 w-5" />
                      Photo
                    </Button>
                    <Button className="h-14" onClick={() => markDone(t.id)}>
                      <CheckCircle2 className="h-5 w-5" />
                      Done
                    </Button>
                  </>
                )}
                {t.status === "not_started" && (
                  <Button variant="outline" className="h-12 col-span-2" onClick={() => uploadPhoto(t.id)}>
                    <Camera className="h-4 w-4" />
                    Upload Photo
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
