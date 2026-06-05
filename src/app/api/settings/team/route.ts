import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";
import { assertSeatAvailable, getSeatUsage } from "@/lib/seats";
import { sendInvitationEmail } from "@/lib/email";

const INVITE_EXPIRY_DAYS = 7;

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    email: z.string().email(),
    roleName: z.enum(["owner", "accountant", "supervisor", "labour"]),
  }),
  z.object({
    action: z.literal("resend"),
    invitationId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("cancel"),
    invitationId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("change_role"),
    memberId: z.string().uuid(),
    roleName: z.enum(["owner", "accountant", "supervisor", "labour"]),
  }),
  z.object({
    action: z.literal("deactivate"),
    memberId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("reactivate"),
    memberId: z.string().uuid(),
  }),
]);

async function getRoleId(tenantId: string, roleName: string) {
  const role = await prisma.role.findFirst({
    where: { tenantId, name: roleName },
  });
  if (!role) throw new Error("NOT_FOUND");
  return role.id;
}

async function dispatchInvitationEmail(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      tenant: { select: { name: true } },
      role: { select: { name: true } },
      inviter: { select: { fullName: true, email: true } },
    },
  });
  if (!invitation?.role?.name) {
    return { ok: false as const, error: "Invitation not found" };
  }
  return sendInvitationEmail({
    to: invitation.email,
    workspaceName: invitation.tenant.name,
    inviterName: invitation.inviter.fullName ?? invitation.inviter.email,
    roleName: invitation.role.name,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
  });
}

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.members_invite);
    const [members, invitations, seats] = await Promise.all([
      prisma.tenantMember.findMany({
        where: { tenantId: session.tenantId },
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          role: { select: { id: true, name: true } },
        },
        orderBy: { joinedAt: "desc" },
      }),
      prisma.invitation.findMany({
        where: { tenantId: session.tenantId, status: "pending" },
        include: { role: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      getSeatUsage(session.tenantId),
    ]);

    return NextResponse.json({
      seats,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        roleId: m.roleId,
        status: m.status,
        joinedAt: m.joinedAt,
        invitedAt: m.invitedAt,
        email: m.user.email,
        fullName: m.user.fullName,
        roleName: m.role?.name ?? null,
      })),
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        expiresAt: inv.expiresAt,
        roleName: inv.role?.name ?? null,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.members_invite);
    const data = actionSchema.parse(await request.json());

    if (data.action === "invite") {
      await assertSeatAvailable(session.tenantId);

      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        const existingMember = await prisma.tenantMember.findUnique({
          where: { userId_tenantId: { userId: existingUser.id, tenantId: session.tenantId } },
        });
        if (existingMember?.status === "active") {
          return NextResponse.json({ error: "User is already a member" }, { status: 409 });
        }
      }

      const pending = await prisma.invitation.findFirst({
        where: { tenantId: session.tenantId, email: data.email, status: "pending" },
      });
      if (pending) {
        return NextResponse.json({ error: "Invitation already pending" }, { status: 409 });
      }

      const roleId = await getRoleId(session.tenantId, data.roleName);
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const invitation = await prisma.invitation.create({
        data: {
          tenantId: session.tenantId,
          invitedBy: session.userId,
          email: data.email,
          roleId,
          token: crypto.randomUUID(),
          expiresAt,
        },
        include: { role: { select: { name: true } } },
      });

      const emailResult = await dispatchInvitationEmail(invitation.id);

      return NextResponse.json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          roleName: invitation.role?.name ?? null,
        },
        emailSent: emailResult.ok,
        emailError: emailResult.ok ? undefined : emailResult.error,
      }, { status: 201 });
    }

    if (data.action === "resend") {
      const invitation = await prisma.invitation.findFirst({
        where: { id: data.invitationId, tenantId: session.tenantId, status: "pending" },
      });
      if (!invitation) throw new Error("NOT_FOUND");

      const updated = await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          token: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        },
        include: { role: { select: { name: true } } },
      });

      const emailResult = await dispatchInvitationEmail(updated.id);

      return NextResponse.json({
        invitation: {
          id: updated.id,
          email: updated.email,
          status: updated.status,
          expiresAt: updated.expiresAt,
          roleName: updated.role?.name ?? null,
        },
        emailSent: emailResult.ok,
        emailError: emailResult.ok ? undefined : emailResult.error,
      });
    }

    if (data.action === "cancel") {
      const invitation = await prisma.invitation.findFirst({
        where: { id: data.invitationId, tenantId: session.tenantId, status: "pending" },
      });
      if (!invitation) throw new Error("NOT_FOUND");

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "cancelled" },
      });
      return NextResponse.json({ ok: true });
    }

    if (data.action === "change_role") {
      const member = await prisma.tenantMember.findFirst({
        where: { id: data.memberId, tenantId: session.tenantId },
      });
      if (!member) throw new Error("NOT_FOUND");
      if (member.userId === session.userId) {
        return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
      }

      const roleId = await getRoleId(session.tenantId, data.roleName);
      await prisma.tenantMember.update({
        where: { id: member.id },
        data: { roleId },
      });
      return NextResponse.json({ ok: true });
    }

    if (data.action === "deactivate") {
      const member = await prisma.tenantMember.findFirst({
        where: { id: data.memberId, tenantId: session.tenantId },
      });
      if (!member) throw new Error("NOT_FOUND");
      if (member.userId === session.userId) {
        return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });
      }

      await prisma.tenantMember.update({
        where: { id: member.id },
        data: { status: "suspended" },
      });
      return NextResponse.json({ ok: true });
    }

    if (data.action === "reactivate") {
      await assertSeatAvailable(session.tenantId);
      const member = await prisma.tenantMember.findFirst({
        where: { id: data.memberId, tenantId: session.tenantId },
      });
      if (!member) throw new Error("NOT_FOUND");

      await prisma.tenantMember.update({
        where: { id: member.id },
        data: { status: "active", joinedAt: member.joinedAt ?? new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return apiError(e);
  }
}
