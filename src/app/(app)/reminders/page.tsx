"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { fetchJson, useClientFetch } from "@/lib/client-fetch";

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
  const { data, loading, error, retry, setData } = useClientFetch<{ notifications: Notification[] }>(
    "/api/notifications"
  );
  const notifications = data?.notifications ?? [];

  async function markAllRead() {
    const result = await fetchJson("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    retry();
    toast("All notifications marked as read", "success");
  }

  async function markRead(id: string) {
    const result = await fetchJson("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setData((prev) =>
      prev
        ? {
            notifications: prev.notifications.map((x) =>
              x.id === id ? { ...x, readAt: new Date().toISOString() } : x
            ),
          }
        : prev
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
          <Button variant="secondary" onClick={markAllRead} disabled={loading || notifications.length === 0}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      {error && <Alert variant="danger" onRetry={retry}>{error}</Alert>}

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
