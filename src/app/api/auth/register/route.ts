import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  auditLog,
  buildSessionForUser,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import { ROLE_TEMPLATES } from "@/lib/permissions";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  businessName: z.string().min(2),
  slug: z
    .string()
    .min(3)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const slug = body.slug || slugify(body.businessName);
    const slugTaken = await prisma.tenant.findUnique({ where: { slug } });
    if (slugTaken) {
      return NextResponse.json({ error: "Workspace URL taken" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email,
          passwordHash,
          fullName: body.fullName,
          emailVerified: true,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: body.businessName,
          slug,
          plan: "trial",
          status: "active",
          subscriptionStatus: "trial",
          trialEndsAt: trialEnds,
          seatLimit: 5,
        },
      });

      await tx.tenantSettings.create({ data: { tenantId: tenant.id } });

      const roles: Record<string, string> = {};
      for (const [name, template] of Object.entries(ROLE_TEMPLATES)) {
        const role = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name,
            permissions: template.permissions,
            isSystemRole: template.isSystemRole,
          },
        });
        roles[name] = role.id;
      }

      await tx.tenantMember.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          roleId: roles.owner,
          status: "active",
          joinedAt: new Date(),
        },
      });

      return { user, tenant };
    });

    await auditLog({
      actorId: result.user.id,
      tenantId: result.tenant.id,
      action: "tenant.created",
      resourceType: "tenant",
      resourceId: result.tenant.id,
      afterState: { name: result.tenant.name, slug: result.tenant.slug },
    });

    const session = await buildSessionForUser(
      result.user.id,
      result.tenant.id
    );
    if (session) await setSessionCookie(session);

    return NextResponse.json(
      { tenant: { slug: result.tenant.slug } },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
