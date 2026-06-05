import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function GuidelinesPage() {
  const session = await getSession();
  if (!session) return null;

  const guidelines = await prisma.handlingGuideline.findMany({
    where: { OR: [{ isGlobal: true }, { tenantId: session.tenantId }] },
    orderBy: { materialKey: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Material Handling Guidelines"
        description="Safety and storage instructions for marble, granite, and stone"
      />

      <div className="space-y-6">
        {guidelines.map((g) => (
          <Card key={g.id}>
            <CardHeader>
              <CardTitle>{g.titleEn}</CardTitle>
              {g.titleHi && (
                <p className="text-[var(--text-sm)] text-[var(--text-muted)]">{g.titleHi}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6 text-[var(--text-sm)]">
                <div>
                  <h3 className="font-semibold text-[var(--success)] mb-2">Do</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {g.dosEn.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                  {g.dosHi.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 text-[var(--text-muted)]">
                      {g.dosHi.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--danger)] mb-2">Don&apos;t</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {g.dontsEn.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {g.storageTips && (
                <p className="mt-4 text-[var(--text-sm)]">
                  <strong>Storage:</strong> {g.storageTips}
                </p>
              )}
              {g.liftingTips && (
                <p className="text-[var(--text-sm)]">
                  <strong>Lifting:</strong> {g.liftingTips}
                </p>
              )}
              {g.cuttingTips && (
                <p className="text-[var(--text-sm)]">
                  <strong>Cutting:</strong> {g.cuttingTips}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
