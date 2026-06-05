import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");

    const material = new URL(request.url).searchParams.get("material");
    const guidelines = await prisma.handlingGuideline.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { tenantId: session.tenantId },
        ],
        ...(material ? { materialKey: material } : {}),
      },
      orderBy: { materialKey: "asc" },
    });
    return NextResponse.json({ guidelines });
  } catch (e) {
    return apiError(e);
  }
}
