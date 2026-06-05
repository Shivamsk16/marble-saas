import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

const paymentSchema = z.object({
  amount: z.number().positive(),
  mode: z.enum(["cash", "neft", "cheque", "upi"]),
  reference: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.invoice_write);
    const { id } = await params;
    const data = paymentSchema.parse(await request.json());

    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { payments: true },
    });
    if (!invoice) throw new Error("NOT_FOUND");

    const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const total = Number(invoice.total);
    const newPaid = paid + data.amount;

    await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: data.amount,
        mode: data.mode,
        paidAt: new Date(),
        reference: data.reference,
      },
    });

    const status =
      newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";

    await prisma.invoice.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ status, paid: newPaid, total });
  } catch (e) {
    return apiError(e);
  }
}
