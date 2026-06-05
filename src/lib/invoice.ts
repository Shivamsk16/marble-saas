import { prisma } from "@/lib/db";

function financialYear(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 3) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}

export async function nextInvoiceNumber(tenantId: string): Promise<string> {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
  });
  const prefix = settings?.invoicePrefix ?? "MP";
  const fy = financialYear();
  const pattern = `${prefix}/${fy}/`;
  const last = await prisma.invoice.findFirst({
    where: { tenantId, invoiceNumber: { startsWith: pattern } },
    orderBy: { invoiceNumber: "desc" },
  });
  const num = last
    ? parseInt(last.invoiceNumber.slice(pattern.length), 10) + 1
    : 1;
  return `${pattern}${String(num).padStart(4, "0")}`;
}

export function calcGstBreakup(
  subtotal: number,
  gstPercent: number,
  sellerState: string | null | undefined,
  buyerState: string | null | undefined
) {
  const tax = (subtotal * gstPercent) / 100;
  const sameState =
    sellerState &&
    buyerState &&
    sellerState.toLowerCase() === buyerState.toLowerCase();
  if (sameState) {
    return { cgst: tax / 2, sgst: tax / 2, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: tax };
}

export function amountInWords(n: number): string {
  if (n < 0) return "";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  function two(x: number): string {
    if (x < 20) return ones[x];
    return `${tens[Math.floor(x / 10)]} ${ones[x % 10]}`.trim();
  }
  function three(x: number): string {
    if (x < 100) return two(x);
    return `${ones[Math.floor(x / 100)]} Hundred ${two(x % 100)}`.trim();
  }
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  let words = "";
  if (rupees >= 10000000) {
    words += `${three(Math.floor(rupees / 10000000))} Crore `;
  }
  if (rupees >= 100000) {
    words += `${three(Math.floor((rupees % 10000000) / 100000))} Lakh `;
  }
  if (rupees >= 1000) {
    words += `${three(Math.floor((rupees % 100000) / 1000))} Thousand `;
  }
  words += three(rupees % 1000);
  words = words.trim() || "Zero";
  if (paise > 0) words += ` and ${two(paise)} Paise`;
  return `${words} Rupees Only`;
}
