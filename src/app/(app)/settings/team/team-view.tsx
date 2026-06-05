"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { fetchJson, useClientFetch } from "@/lib/client-fetch";

type Member = {
  id: string;
  userId: string;
  roleId: string | null;
  status: string;
  joinedAt: string | null;
  email: string;
  fullName: string | null;
  roleName: string | null;
};

type Invitation = {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  roleName: string | null;
};

type SeatUsage = {
  seatLimit: number;
  seatsUsed: number;
  pendingInvites: number;
  totalCommitted: number;
  available: number;
};

const ROLES = ["owner", "accountant", "supervisor", "labour"] as const;

export function TeamSettingsView() {
  const { toast } = useToast();
  const { data, loading, error, retry } = useClientFetch<{
    members: Member[];
    invitations: Invitation[];
    seats: SeatUsage;
  }>("/api/settings/team");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("accountant");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];
  const seats = data?.seats;
  const activeMembers = members.filter((m) => m.status === "active");
  const inactiveMembers = members.filter((m) => m.status !== "active");
  const atSeatLimit = seats !== undefined && seats.available <= 0;

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    const result = await fetchJson<{
      emailSent?: boolean;
      emailError?: string;
    }>("/api/settings/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", email: inviteEmail.trim(), roleName: inviteRole }),
    });
    setInviteLoading(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    if (result.data.emailSent === false) {
      toast(
        result.data.emailError
          ? `Invitation created but email failed: ${result.data.emailError}`
          : "Invitation created but email could not be sent",
        "info"
      );
    } else {
      toast("Invitation sent", "success");
    }
    setInviteOpen(false);
    setInviteEmail("");
    retry();
  }

  async function teamAction(body: Record<string, unknown>) {
    const result = await fetchJson("/api/settings/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!result.ok) {
      toast(result.error, "error");
      return false;
    }
    retry();
    return true;
  }

  const statusVariant = (status: string) =>
    status === "active" ? "success" : status === "suspended" ? "danger" : "warning";

  const displayStatus = (status: string) =>
    status === "suspended" ? "inactive" : status;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[var(--surface-3)] rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-[var(--surface-3)] rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite members, manage roles, and control workspace access"
        breadcrumbs={[{ label: "Settings", href: "/settings/profile" }, { label: "Team" }]}
        actions={
          <Button onClick={() => setInviteOpen(true)} disabled={atSeatLimit}>
            Invite Member
          </Button>
        }
      />

      {error && <Alert variant="danger" onRetry={retry}>{error}</Alert>}

      {seats && (
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[var(--text-sm)]">
            <div>
              <p className="text-[var(--text-muted)] mb-1">Workspace seats</p>
              <p className="font-medium tabular-nums">
                {seats.seatsUsed} active · {seats.pendingInvites} pending · {seats.available} available
              </p>
            </div>
            <p className="tabular-nums text-[var(--text-muted)]">
              {seats.totalCommitted} / {seats.seatLimit} used
            </p>
          </div>
          {atSeatLimit && (
            <p className="text-[var(--text-xs)] text-[var(--text-muted)] mt-2">
              Seat limit reached. Upgrade your plan or cancel a pending invitation to invite more members.
            </p>
          )}
        </Card>
      )}

      <section className="mb-8">
        <h2 className="text-h3 mb-3">Active members ({activeMembers.length})</h2>
        {activeMembers.length === 0 ? (
          <Card className="p-6 text-center text-[var(--text-muted)] text-[var(--text-sm)]">
            No active members
          </Card>
        ) : (
          <ul className="space-y-2">
            {activeMembers.map((m) => (
              <li key={m.id}>
                <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{m.fullName ?? m.email}</p>
                    <p className="text-[var(--text-sm)] text-[var(--text-muted)]">{m.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={m.roleName ?? "labour"}
                      onChange={(e) =>
                        setConfirm({
                          title: "Change role",
                          message: `Change ${m.fullName ?? m.email}'s role to ${e.target.value}?`,
                          action: async () => {
                            const ok = await teamAction({
                              action: "change_role",
                              memberId: m.id,
                              roleName: e.target.value,
                            });
                            if (ok) toast("Role updated", "success");
                          },
                        })
                      }
                      className="h-8 w-36"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r} className="capitalize">{r}</option>
                      ))}
                    </Select>
                    <Badge variant={statusVariant(m.status)} className="capitalize">
                      {displayStatus(m.status)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          title: "Deactivate member",
                          message: `${m.fullName ?? m.email} will lose access but won't be deleted. Continue?`,
                          action: async () => {
                            const ok = await teamAction({ action: "deactivate", memberId: m.id });
                            if (ok) toast("Member deactivated", "success");
                          },
                        })
                      }
                    >
                      Deactivate
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {inactiveMembers.length > 0 && (
        <section className="mb-8">
          <h2 className="text-h3 mb-3">Inactive members ({inactiveMembers.length})</h2>
          <ul className="space-y-2">
            {inactiveMembers.map((m) => (
              <li key={m.id}>
                <Card className="p-4 flex flex-wrap items-center justify-between gap-3 opacity-80">
                  <div>
                    <p className="font-medium">{m.fullName ?? m.email}</p>
                    <p className="text-[var(--text-sm)] text-[var(--text-muted)]">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.roleName && (
                      <Badge variant="info" className="capitalize">{m.roleName}</Badge>
                    )}
                    <Badge variant="danger">Inactive</Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          title: "Reactivate member",
                          message: `Restore access for ${m.fullName ?? m.email}?`,
                          action: async () => {
                            const ok = await teamAction({ action: "reactivate", memberId: m.id });
                            if (ok) toast("Member reactivated", "success");
                          },
                        })
                      }
                    >
                      Reactivate
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-h3 mb-3">Pending invitations ({invitations.length})</h2>
        {invitations.length === 0 ? (
          <Card className="p-6 text-center text-[var(--text-muted)] text-[var(--text-sm)]">
            No pending invitations
          </Card>
        ) : (
          <ul className="space-y-2">
            {invitations.map((inv) => (
              <li key={inv.id}>
                <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-[var(--text-xs)] text-[var(--text-muted)]">
                      Expires {new Date(inv.expiresAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {inv.roleName && (
                      <Badge variant="info" className="capitalize">{inv.roleName}</Badge>
                    )}
                    <Badge variant="warning">Pending</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const result = await fetchJson<{
                          emailSent?: boolean;
                          emailError?: string;
                        }>("/api/settings/team", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "resend", invitationId: inv.id }),
                        });
                        if (!result.ok) {
                          toast(result.error, "error");
                          return;
                        }
                        if (result.data.emailSent === false) {
                          toast(
                            result.data.emailError
                              ? `Link refreshed but email failed: ${result.data.emailError}`
                              : "Link refreshed but email could not be sent",
                            "info"
                          );
                        } else {
                          toast("Invitation resent", "success");
                        }
                        retry();
                      }}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          title: "Cancel invitation",
                          message: `Cancel the invitation for ${inv.email}?`,
                          action: async () => {
                            const ok = await teamAction({ action: "cancel", invitationId: inv.id });
                            if (ok) toast("Invitation cancelled", "success");
                          },
                        })
                      }
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite member">
        <div className="space-y-4">
          <FormField label="Email" htmlFor="invite-email" required>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
            />
          </FormField>
          <FormField label="Role" htmlFor="invite-role">
            <Select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {ROLES.filter((r) => r !== "owner").map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={inviteMember}
              loading={inviteLoading}
              disabled={!inviteEmail.trim() || atSeatLimit}
            >
              Send invitation
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title ?? ""}>
        {confirm && (
          <div className="space-y-4">
            <p className="text-[var(--text-sm)] text-[var(--text-muted)]">{confirm.message}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button
                variant="danger"
                loading={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  await confirm.action();
                  setActionLoading(false);
                  setConfirm(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
