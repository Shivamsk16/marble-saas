import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { prisma } from "@/lib/db";

const ALGO = "aes-256-gcm";

function getKey() {
  const secret = process.env.EWB_ENCRYPTION_KEY || process.env.JWT_SECRET || "dev-ewb-key";
  return scryptSync(secret, "marblepro-ewb", 32);
}

export function encryptCredential(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptCredential(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Sandbox/mock NIC E-Way Bill generation from invoice data */
export async function generateEwayBillMock(params: {
  tenantId: string;
  invoiceId: string;
  distanceKm?: number;
  vehicleNumber?: string;
}) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.invoiceId, tenantId: params.tenantId },
    include: { client: true, lines: true, tenant: { include: { settings: true } } },
  });
  if (!invoice) throw new Error("Invoice not found");

  const distance = params.distanceKm ?? 120;
  const validityDays = Math.max(1, Math.ceil(distance / 100));
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  const ewbNumber = `39${Date.now().toString().slice(-10)}`;

  const ewb = await prisma.ewayBill.create({
    data: {
      tenantId: params.tenantId,
      invoiceId: invoice.id,
      ewbNumber,
      validUntil,
      distanceKm: distance,
      vehicleNumber: params.vehicleNumber ?? invoice.vehicleNumber,
      apiResponse: {
        mode: "sandbox_mock",
        supplierGstin: invoice.tenant.settings?.gstin,
        recipientGstin: invoice.client.gstin,
        invoiceNumber: invoice.invoiceNumber,
        totalValue: Number(invoice.total),
      },
    },
  });

  return ewb;
}
