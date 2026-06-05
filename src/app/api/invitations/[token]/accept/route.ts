import { NextResponse } from "next/server";
import { z } from "zod";
import {
  acceptInvitation,
  acceptInvitationWithCredentials,
} from "@/lib/invitations";
import {
  buildSessionForUser,
  getSession,
  setSessionCookie,
} from "@/lib/auth";
import { apiError } from "@/lib/api-utils";

const bodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("join") }),
  z.object({
    mode: z.literal("login"),
    password: z.string().min(6),
  }),
  z.object({
    mode: z.literal("register"),
    password: z.string().min(8),
    fullName: z.string().min(2),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = bodySchema.parse(await request.json());

    let userId: string;
    let tenantId: string;

    if (body.mode === "join") {
      const session = await getSession();
      if (!session) throw new Error("UNAUTHORIZED");
      const result = await acceptInvitation({ token, userId: session.userId });
      userId = session.userId;
      tenantId = result.tenantId;
    } else {
      const result = await acceptInvitationWithCredentials({
        token,
        mode: body.mode,
        password: body.password,
        fullName: body.mode === "register" ? body.fullName : undefined,
      });
      userId = result.userId;
      tenantId = result.tenantId;
    }

    const session = await buildSessionForUser(userId, tenantId);
    if (!session) {
      return NextResponse.json({ error: "Could not create session" }, { status: 500 });
    }

    await setSessionCookie(session);
    return NextResponse.json({
      ok: true,
      tenant: { slug: session.tenantSlug, name: session.tenantSlug },
    });
  } catch (e) {
    return apiError(e);
  }
}
