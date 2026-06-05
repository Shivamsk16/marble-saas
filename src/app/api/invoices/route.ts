import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auditLog, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";
import {
  amountInWords,
  calcGstBreakup,
  nextInvoiceNumber,
} from "@/lib/invoice";

const lineSchema = z.object({
  description: z.string(),
  hsnCode: z.string().optional(),
  slabId: z.string().uuid().optional(),
  quantity: z.number().positive(),
  unit: z.enum(["sqft", "slab", "piece", "kg", "rft"]),
  rate: z.number().positive(),
  gstPercent: z.number().min(0).max(28).default(18),
});

const createSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(["tax", "proforma"]).default("tax"),
  discount: z.number().min(0).default(0),
  transporterName: z.string().optional(),
  vehicleNumber: z.string().optional(),
  lrNumber: z.string().optional(),
  lines: z.array(lineSchema).min(1),
  convertedFromId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.invoice_read);
    const status = new URL(request.url).searchParams.get("status");
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: session.tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        client: { select: { name: true } },
        payments: true,
        ewayBills: { where: { status: "active" }, take: 1 },
      },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    });
    return NextResponse.json({ invoices });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.invoice_write);
    const data = createSchema.parse(await request.json());

    const [client, settings] = await Promise.all([
      prisma.client.findFirst({
        where: { id: data.clientId, tenantId: session.tenantId },
      }),
      prisma.tenantSettings.findUnique({ where: { tenantId: session.tenantId } }),
    ]);
    if (!client) throw new Error("NOT_FOUND");

    const lineAmounts = data.lines.map((l) => ({
      ...l,
      amount: l.quantity * l.rate,
    }));
    const subtotal = lineAmounts.reduce((s, l) => s + l.amount, 0) - data.discount;
    const gstPercent = data.lines[0]?.gstPercent ?? 18;
    const gst = calcGstBreakup(
      subtotal,
      gstPercent,
      settings?.state,
      client.state
    );
    const total = subtotal + gst.cgst + gst.sgst + gst.igst;

    const invoiceNumber =
      data.type === "tax" ? await nextInvoiceNumber(session.tenantId) : `PF/${Date.now()}`;

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId: session.tenantId,
          clientId: data.clientId,
          invoiceNumber,
          invoiceDate: new Date(),
          type: data.type,
          subtotal,
          discount: data.discount,
          cgst: gst.cgst,
          sgst: gst.sgst,
          igst: gst.igst,
          total,
          transporterName: data.transporterName,
          vehicleNumber: data.vehicleNumber,
          lrNumber: data.lrNumber,
          convertedFromId: data.convertedFromId,
        },
      });

      await tx.invoiceLine.createMany({
        data: lineAmounts.map((l) => ({
          invoiceId: inv.id,
          description: l.description,
          hsnCode: l.hsnCode ?? "6802",
          slabId: l.slabId,
          quantity: l.quantity,
          unit: l.unit,
          rate: l.rate,
          amount: l.amount,
          gstPercent: l.gstPercent,
        })),
      });

      if (data.type === "tax") {
        for (const l of lineAmounts) {
          if (l.slabId) {
            const slab = await tx.slab.findFirst({
              where: { id: l.slabId, tenantId: session.tenantId, status: "in_stock" },
            });
            if (!slab) throw new Error("Insufficient stock for slab");
            await tx.slab.update({
              where: { id: l.slabId },
              data: { status: "sold" },
            });
          }
        }
      }

      return inv;
    });

    await auditLog({
      actorId: session.userId,
      tenantId: session.tenantId,
      action: "invoice.created",
      resourceType: "invoice",
      resourceId: invoice.id,
      afterState: { invoiceNumber, total, words: amountInWords(Number(total)) },
    });

    const full = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { lines: true, client: true },
    });

    return NextResponse.json({ invoice: full }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message.includes("stock")) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return apiError(e);
  }
}
