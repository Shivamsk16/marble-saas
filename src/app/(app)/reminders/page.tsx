"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

type Notification = {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function RemindersPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
    toast("All notifications marked as read", "success");
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((n) =>
      n.map((x) => (x.id === id ? { ...x, readAt: new Date().toISOString() } : x))
    );
  }

  const severityVariant = (s: string) =>
    s === "danger" ? "danger" : s === "warning" ? "warning" : s === "success" ? "success" : "info";

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Payment reminders, production alerts, inventory warnings, and delivery notices"
        actions={
          <Button variant="secondary" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-[var(--surface-3)] rounded animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-muted)]">No notifications</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 ${!n.readAt ? "border-[var(--accent)]/20 bg-[var(--accent-subtle)]/10" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={severityVariant(n.severity)}>{n.type}</Badge>
                    <span className="text-[var(--text-xs)] text-[var(--text-muted)]">
                      {new Date(n.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="font-medium text-[var(--text)]">{n.title}</p>
                  {n.body && <p className="text-[var(--text-sm)] text-[var(--text-muted)] mt-1">{n.body}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!n.readAt && (
                    <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                  {n.link && (
                    <Link href={n.link}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
