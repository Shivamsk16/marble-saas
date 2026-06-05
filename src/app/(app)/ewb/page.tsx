import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EwbTable } from "./ewb-table";
import { Truck } from "lucide-react";

export default async function EwbPage() {
  const session = await getSession();
  if (!session) return null;

  const bills = await prisma.ewayBill.findMany({
    where: { tenantId: session.tenantId },
    include: {
      invoice: { select: { invoiceNumber: true, client: { select: { name: true } } } },
    },
    orderBy: { validUntil: "asc" },
    take: 50,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const expiring = bills.filter(
    (b) => b.status === "active" && b.validUntil >= today && b.validUntil < tomorrow
  );

  const rows = bills.map((b) => ({
    id: b.id,
    ewbNumber: b.ewbNumber,
    status: b.status,
    validUntil: b.validUntil.toISOString(),
    invoice: b.invoice,
  }));

  return (
    <div>
      <PageHeader title="E-Way Bill Register" description="GST e-way bills linked to invoices" />

      {expiring.length > 0 && (
        <Card className="mb-6 border-[var(--warning)]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--warning)]">
              <Truck className="h-4 w-4" />
              Expiring Today ({expiring.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-[var(--text-sm)]">
              {expiring.map((b) => (
                <li key={b.id}>
                  {b.ewbNumber} — {b.invoice.invoiceNumber}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <EwbTable rows={rows} />
    </div>
  );
}
