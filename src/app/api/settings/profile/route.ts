import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";

const patchSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  preferredLang: z.enum(["hi", "en"]).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        preferredLang: true,
      },
    });
    if (!user) throw new Error("NOT_FOUND");
    return NextResponse.json({ user });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const data = patchSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.preferredLang !== undefined ? { preferredLang: data.preferredLang } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        preferredLang: true,
      },
    });
    return NextResponse.json({ user });
  } catch (e) {
    return apiError(e);
  }
}
