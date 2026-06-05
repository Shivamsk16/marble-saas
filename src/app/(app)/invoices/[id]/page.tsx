import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { amountInWords } from "@/lib/invoice";
import { InvoiceActions } from "./invoice-actions";

export default async function InvoiceDetailPage({
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
      payments: true,
      ewayBills: true,
      tenant: { include: { settings: true } },
    },
  });
  if (!invoice) notFound();

  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const words = amountInWords(Number(invoice.total));

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
          <p className="text-[var(--muted)]">{invoice.client.name} · {invoice.status}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/invoices/${id}/print`} className="text-sm underline">Print PDF</Link>
        </div>
      </div>

      <div className="rounded-xl border p-6 bg-[var(--card)] mb-6">
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Item</th>
              <th>HSN</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="py-2">{l.description}</td>
                <td>{l.hsnCode}</td>
                <td>{Number(l.quantity)} {l.unit}</td>
                <td>₹{Number(l.rate)}</td>
                <td>₹{Number(l.amount).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-right text-sm space-y-1">
          <p>Subtotal: ₹{Number(invoice.subtotal).toLocaleString("en-IN")}</p>
          {Number(invoice.cgst) > 0 && <p>CGST: ₹{Number(invoice.cgst).toFixed(2)}</p>}
          {Number(invoice.sgst) > 0 && <p>SGST: ₹{Number(invoice.sgst).toFixed(2)}</p>}
          {Number(invoice.igst) > 0 && <p>IGST: ₹{Number(invoice.igst).toFixed(2)}</p>}
          <p className="font-bold text-lg">Total: ₹{Number(invoice.total).toLocaleString("en-IN")}</p>
          <p className="text-xs text-[var(--muted)] italic">{words}</p>
          <p className="text-xs">Paid: ₹{paid.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {invoice.ewayBills[0] && (
        <p className="mb-4 text-sm">E-Way Bill: <strong>{invoice.ewayBills[0].ewbNumber}</strong></p>
      )}

      <InvoiceActions invoiceId={id} total={Number(invoice.total)} paid={paid} hasEwb={invoice.ewayBills.length > 0} />
    </div>
  );
}
