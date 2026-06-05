import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";

export type InvitationPreview = {
  email: string;
  workspaceName: string;
  workspaceSlug: string;
  roleName: string | null;
  inviterName: string;
  expiresAt: Date;
};

export type InvitationLookup =
  | { status: "invalid" }
  | { status: "accepted"; preview: InvitationPreview }
  | { status: "expired"; preview: InvitationPreview }
  | { status: "pending"; preview: InvitationPreview; userExists: boolean };

export async function lookupInvitation(token: string): Promise<InvitationLookup> {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      tenant: { select: { name: true, slug: true } },
      role: { select: { name: true } },
      inviter: { select: { fullName: true, email: true } },
    },
  });

  if (!invitation || invitation.status === "cancelled") {
    return { status: "invalid" };
  }

  const preview: InvitationPreview = {
    email: invitation.email,
    workspaceName: invitation.tenant.name,
    workspaceSlug: invitation.tenant.slug,
    roleName: invitation.role?.name ?? null,
    inviterName: invitation.inviter.fullName ?? invitation.inviter.email,
    expiresAt: invitation.expiresAt,
  };

  if (invitation.status === "accepted") {
    return { status: "accepted", preview };
  }

  if (invitation.expiresAt < new Date()) {
    if (invitation.status === "pending") {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
    }
    return { status: "expired", preview };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });

  return {
    status: "pending",
    preview,
    userExists: !!existingUser,
  };
}

export async function acceptInvitation(params: {
  token: string;
  userId: string;
}) {
  const lookup = await lookupInvitation(params.token);
  if (lookup.status !== "pending") {
    if (lookup.status === "expired") throw new Error("INVITE_EXPIRED");
    if (lookup.status === "accepted") throw new Error("INVITE_ACCEPTED");
    throw new Error("INVITE_INVALID");
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token: params.token },
    include: { role: true },
  });
  if (!invitation) throw new Error("INVITE_INVALID");

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("EMAIL_MISMATCH");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.tenantMember.findUnique({
      where: {
        userId_tenantId: { userId: params.userId, tenantId: invitation.tenantId },
      },
    });

    if (existing?.status === "active") {
      throw new Error("ALREADY_MEMBER");
    }

    if (existing) {
      await tx.tenantMember.update({
        where: { id: existing.id },
        data: {
          status: "active",
          roleId: invitation.roleId,
          joinedAt: new Date(),
        },
      });
    } else {
      await tx.tenantMember.create({
        data: {
          userId: params.userId,
          tenantId: invitation.tenantId,
          roleId: invitation.roleId,
          status: "active",
          joinedAt: new Date(),
        },
      });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });
  });

  return { tenantId: invitation.tenantId };
}

export async function acceptInvitationWithCredentials(params: {
  token: string;
  mode: "login" | "register";
  password: string;
  fullName?: string;
}) {
  const lookup = await lookupInvitation(params.token);
  if (lookup.status !== "pending") {
    if (lookup.status === "expired") throw new Error("INVITE_EXPIRED");
    if (lookup.status === "accepted") throw new Error("INVITE_ACCEPTED");
    throw new Error("INVITE_INVALID");
  }

  const email = lookup.preview.email;
  let user = await prisma.user.findUnique({ where: { email } });

  if (params.mode === "login") {
    if (!user || !(await verifyPassword(params.password, user.passwordHash))) {
      throw new Error("INVALID_CREDENTIALS");
    }
  } else {
    if (user) throw new Error("USER_EXISTS");
    if (!params.fullName?.trim()) throw new Error("NAME_REQUIRED");
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(params.password),
        fullName: params.fullName.trim(),
        emailVerified: true,
      },
    });
  }

  const { tenantId } = await acceptInvitation({ token: params.token, userId: user.id });
  return { userId: user.id, tenantId };
}
