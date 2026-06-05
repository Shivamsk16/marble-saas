import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { amountInWords } from "@/lib/invoice";
import { PrintButton } from "./print-button";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      client: true,
      lines: true,
      ewayBills: true,
      tenant: { include: { settings: true } },
    },
  });
  if (!invoice) notFound();

  const s = invoice.tenant.settings;

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white text-black print:p-4">
      <PrintButton />
      <style>{`@media print { aside, nav, .print\\:hidden { display: none !important; } }`}</style>
      <div className="text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">{invoice.tenant.name}</h1>
        {s?.gstin && <p className="text-sm">GSTIN: {s.gstin}</p>}
        <p className="text-sm">{s?.businessAddress}</p>
        <h2 className="text-lg font-semibold mt-4">TAX INVOICE</h2>
        <p className="text-sm">{invoice.invoiceNumber} · {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</p>
      </div>
      <div className="mb-4 text-sm">
        <p><strong>Bill To:</strong> {invoice.client.name}</p>
        {invoice.client.gstin && <p>GSTIN: {invoice.client.gstin}</p>}
        <p>{invoice.client.address}</p>
      </div>
      <table className="w-full text-sm border-collapse mb-4">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-1">Description</th>
            <th>HSN</th>
            <th>Qty</th>
            <th>Rate</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l) => (
            <tr key={l.id} className="border-b border-stone-300">
              <td className="py-1">{l.description}</td>
              <td className="text-center">{l.hsnCode}</td>
              <td className="text-center">{Number(l.quantity)} {l.unit}</td>
              <td className="text-center">{Number(l.rate)}</td>
              <td className="text-right">{Number(l.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right text-sm space-y-1 mb-4">
        <p>CGST: ₹{Number(invoice.cgst).toFixed(2)} | SGST: ₹{Number(invoice.sgst).toFixed(2)} | IGST: ₹{Number(invoice.igst).toFixed(2)}</p>
        <p className="font-bold text-lg">Total: ₹{Number(invoice.total).toFixed(2)}</p>
        <p className="italic">{amountInWords(Number(invoice.total))}</p>
      </div>
      {invoice.ewayBills[0] && (
        <p className="text-sm border-t pt-2">E-Way Bill No: {invoice.ewayBills[0].ewbNumber}</p>
      )}
      {s?.bankName && (
        <p className="text-xs mt-4">Bank: {s.bankName} · A/C {s.bankAccount} · IFSC {s.bankIfsc}</p>
      )}
      <p className="text-xs mt-8 text-center">Authorized Signatory</p>
    </div>
  );
}
