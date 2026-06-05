import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

const COOKIE_NAME = "marblepro_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  roleName: string;
  permissions: Record<string, boolean>;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!hasPermission(session.permissions, permission)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/** Load active membership for login */
export async function buildSessionForUser(
  userId: string,
  tenantId?: string
): Promise<SessionPayload | null> {
  const membership = await prisma.tenantMember.findFirst({
    where: {
      userId,
      status: "active",
      ...(tenantId ? { tenantId } : {}),
    },
    include: {
      tenant: true,
      role: true,
      user: true,
    },
    orderBy: { joinedAt: "desc" },
  });

  if (!membership?.tenant || !membership.role || !membership.user) {
    return null;
  }

  return {
    userId: membership.user.id,
    email: membership.user.email,
    tenantId: membership.tenant.id,
    tenantSlug: membership.tenant.slug,
    roleName: membership.role.name,
    permissions: membership.role.permissions as Record<string, boolean>,
  };
}

export async function auditLog(params: {
  actorId: string;
  tenantId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      tenantId: params.tenantId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      beforeState: params.beforeState as object | undefined,
      afterState: params.afterState as object | undefined,
      ipAddress: params.ipAddress,
    },
  });
}
