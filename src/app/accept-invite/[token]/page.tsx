"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchJson } from "@/lib/client-fetch";

type InviteData = {
  status: "pending" | "expired" | "accepted" | "invalid";
  invitation?: {
    email: string;
    workspaceName: string;
    workspaceSlug: string;
    roleName: string | null;
    inviterName: string;
    expiresAt: string;
  };
  userExists?: boolean;
};

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register" | "join">("login");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    Promise.all([
      fetchJson<InviteData>(`/api/invitations/${token}`),
      fetchJson<{ session: { email: string } | null }>("/api/auth/session"),
    ])
      .then(([inviteResult, sessionResult]) => {
        if (!inviteResult.ok) {
          setInvite({ status: "invalid" });
          return;
        }
        setInvite(inviteResult.data);
        if (inviteResult.data.status !== "pending") return;

        const inviteEmail = inviteResult.data.invitation?.email.toLowerCase();
        const sessionEmail = sessionResult.ok
          ? sessionResult.data.session?.email.toLowerCase()
          : null;

        if (inviteEmail && sessionEmail && inviteEmail === sessionEmail) {
          setMode("join");
        } else {
          setMode(inviteResult.data.userExists ? "login" : "register");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function accept(m: "join" | "login" | "register") {
    setError("");
    setSubmitting(true);
    const body =
      m === "join"
        ? { mode: "join" as const }
        : m === "login"
          ? { mode: "login" as const, password }
          : { mode: "register" as const, password, fullName };

    const result = await fetchJson(`/api/invitations/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-pulse space-y-4">
          <div className="h-8 bg-[var(--surface-3)] rounded" />
          <div className="h-48 bg-[var(--surface-3)] rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  if (!invite || invite.status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-h2 mb-2">Invalid invitation</h1>
            <p className="text-[var(--text-sm)] text-[var(--text-muted)] mb-6">
              This invitation link is not valid. Ask your workspace admin for a new invite.
            </p>
            <Link href="/login">
              <Button variant="secondary">Go to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-h2 mb-2">Already accepted</h1>
            <p className="text-[var(--text-sm)] text-[var(--text-muted)] mb-6">
              This invitation to {invite.invitation?.workspaceName} was already used.
            </p>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-h2 mb-2">Invitation expired</h1>
            <p className="text-[var(--text-sm)] text-[var(--text-muted)] mb-6">
              Ask {invite.invitation?.inviterName} to resend your invitation to{" "}
              {invite.invitation?.workspaceName}.
            </p>
            <Link href="/login">
              <Button variant="secondary">Go to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inv = invite.invitation!;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <p className="text-xl font-bold text-[var(--accent)] mb-6">MarblePro</p>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h1 className="text-h2 mb-2">Join {inv.workspaceName}</h1>
            <p className="text-[var(--text-sm)] text-[var(--text-muted)] mb-4">
              <strong>{inv.inviterName}</strong> invited you to collaborate on MarblePro.
            </p>
            <div className="flex flex-wrap gap-2 text-[var(--text-sm)]">
              {inv.roleName && (
                <Badge variant="info" className="capitalize">{inv.roleName}</Badge>
              )}
              <Badge variant="neutral">{inv.email}</Badge>
            </div>
            <p className="text-[var(--text-xs)] text-[var(--text-muted)] mt-3">
              Expires {new Date(inv.expiresAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
            </p>
          </CardContent>
        </Card>

        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

        {mode === "join" ? (
          <div className="space-y-4">
            <p className="text-[var(--text-sm)] text-[var(--text-muted)]">
              You&apos;re signed in. Accept to join this workspace.
            </p>
            <Button className="w-full h-12" loading={submitting} onClick={() => accept("join")}>
              Join workspace
            </Button>
          </div>
        ) : invite.userExists ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accept("login");
            }}
            className="space-y-4"
            noValidate
          >
            <p className="text-[var(--text-sm)] text-[var(--text-muted)]">
              Sign in with your existing account to join.
            </p>
            <FormField label="Email" htmlFor="invite-email">
              <Input id="invite-email" value={inv.email} disabled />
            </FormField>
            <FormField label="Password" htmlFor="invite-password" required>
              <Input
                id="invite-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </FormField>
            <Button type="submit" className="w-full h-12" loading={submitting} disabled={!password}>
              Sign in & join
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accept("register");
            }}
            className="space-y-4"
            noValidate
          >
            <p className="text-[var(--text-sm)] text-[var(--text-muted)]">
              Create your account to join the workspace.
            </p>
            <FormField label="Email" htmlFor="invite-email">
              <Input id="invite-email" value={inv.email} disabled />
            </FormField>
            <FormField label="Your name" htmlFor="invite-name" required>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </FormField>
            <FormField label="Password (min 8)" htmlFor="invite-password" required>
              <Input
                id="invite-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </FormField>
            <Button
              type="submit"
              className="w-full h-12"
              loading={submitting}
              disabled={!password || !fullName.trim()}
            >
              Create account & join
            </Button>
          </form>
        )}

        <p className="text-[var(--text-sm)] text-center mt-6 text-[var(--text-muted)]">
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Sign in to a different account
          </Link>
        </p>
      </div>
    </div>
  );
}
