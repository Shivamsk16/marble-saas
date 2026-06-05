import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";

const schema = z.object({
  slabId: z.string().uuid(),
  damageType: z.enum(["crack", "chip", "scratch"]),
  cause: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const data = schema.parse(await request.json());

    const report = await prisma.$transaction(async (tx) => {
      const r = await tx.damageReport.create({
        data: {
          tenantId: session.tenantId,
          slabId: data.slabId,
          damageType: data.damageType,
          cause: data.cause,
          reportedBy: session.userId,
        },
      });
      await tx.slab.update({
        where: { id: data.slabId },
        data: { status: "damaged" },
      });
      return r;
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
