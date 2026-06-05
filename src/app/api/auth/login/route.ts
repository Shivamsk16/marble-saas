import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  buildSessionForUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantSlug: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    let tenantId: string | undefined;
    if (body.tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: body.tenantSlug },
      });
      tenantId = tenant?.id;
    }

    const session = await buildSessionForUser(user.id, tenantId);
    if (!session) {
      return NextResponse.json(
        { error: "No active workspace. Contact your administrator." },
        { status: 403 }
      );
    }

    await setSessionCookie(session);
    return NextResponse.json({
      user: { email: session.email, role: session.roleName },
      tenant: { slug: session.tenantSlug },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
