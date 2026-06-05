import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const createSchema = z.object({
  name: z.string().min(1),
  gstin: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.clients_read);
    const clients = await prisma.client.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ clients });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.clients_create);
    const data = createSchema.parse(await request.json());
    const client = await prisma.client.create({
      data: { tenantId: session.tenantId, ...data },
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
