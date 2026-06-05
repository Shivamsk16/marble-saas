import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  gstin: z.string().optional().nullable(),
  businessAddress: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankIfsc: z.string().optional().nullable(),
  invoicePrefix: z.string().min(1).optional(),
  logoUrl: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.settings_write);
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        trialEndsAt: true,
        settings: {
          select: {
            gstin: true,
            businessAddress: true,
            state: true,
            phone: true,
            bankName: true,
            bankAccount: true,
            bankIfsc: true,
            invoicePrefix: true,
            logoUrl: true,
          },
        },
      },
    });
    if (!tenant) throw new Error("NOT_FOUND");
    return NextResponse.json({ tenant });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.settings_write);
    const data = patchSchema.parse(await request.json());
    const { name, ...settingsData } = data;

    const tenant = await prisma.$transaction(async (tx) => {
      if (name) {
        await tx.tenant.update({
          where: { id: session.tenantId },
          data: { name },
        });
      }
      if (Object.keys(settingsData).length > 0) {
        await tx.tenantSettings.upsert({
          where: { tenantId: session.tenantId },
          create: { tenantId: session.tenantId, ...settingsData },
          update: settingsData,
        });
      }
      return tx.tenant.findUnique({
        where: { id: session.tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          status: true,
          trialEndsAt: true,
          settings: {
            select: {
              gstin: true,
              businessAddress: true,
              state: true,
              phone: true,
              bankName: true,
              bankAccount: true,
              bankIfsc: true,
              invoicePrefix: true,
              logoUrl: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ tenant });
  } catch (e) {
    return apiError(e);
  }
}
