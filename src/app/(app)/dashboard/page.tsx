import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getInventorySummary } from "@/lib/inventory";
import { getDashboardStats, getAttentionItems } from "@/lib/reports";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/ui/charts";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ClipboardList,
  IndianRupee,
  Package,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [inventory, tenant, stats, attention] = await Promise.all([
    getInventorySummary(session.tenantId),
    prisma.tenant.findUnique({ where: { id: session.tenantId } }),
    getDashboardStats(session.tenantId),
    getAttentionItems(session.tenantId),
  ]);

  const kpis = [
    {
      label: "Today's Production",
      value: stats.todayProduction,
      href: "/production",
      trend: undefined as number | undefined,
      sparkline: stats.productionSparkline,
    },
    {
      label: "Orders in Progress",
      value: stats.ordersInProgress,
      href: "/orders",
      trendLabel: stats.delayedOrders > 0 ? `${stats.delayedOrders} delayed` : undefined,
    },
    {
      label: "Pending Deliveries",
      value: stats.pendingDeliveries,
      href: "/orders?stage=ready_for_dispatch",
    },
    {
      label: "Labour Attendance",
      value: `${stats.labourPresent}/${stats.labourTotal}`,
      href: "/labour/attendance",
    },
    {
      label: "Revenue Summary",
      value: `₹${stats.todaySales.toLocaleString("en-IN")}`,
      href: "/invoices",
      trend: stats.revenueTrend,
      trendLabel: "vs last week",
      sparkline: stats.revenueSparkline,
    },
    {
      label: "Outstanding Payments",
      value: `₹${stats.overduePayments.toLocaleString("en-IN")}`,
      href: "/invoices",
    },
    {
      label: "Inventory Alerts",
      value: inventory.lowStockAlerts.length,
      href: "/inventory",
    },
    {
      label: "Critical Tasks",
      value: stats.criticalTasks,
      href: "/labour/tasks",
    },
  ];

  const revenueLabels = stats.revenueSparkline?.map((_, i) =>
    i % 2 === 0 ? ["M", "T", "W", "T", "F", "S", "S"][i] ?? "" : ""
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${tenant?.name ?? "Workspace"} · What needs attention right now`}
        actions={
          <>
            <Link href="/invoices/new">
              <Button>New Invoice</Button>
            </Link>
            <Link href="/orders">
              <Button variant="secondary">View Orders</Button>
            </Link>
          </>
        }
      />

      {tenant?.trialEndsAt && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning-subtle)] px-4 py-3 text-[var(--text-sm)]">
          Trial ends {new Date(tenant.trialEndsAt).toLocaleDateString("en-IN")} ·{" "}
          <span className="capitalize">{tenant.plan}</span> plan
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            href={k.href}
            trend={k.trend}
            trendLabel={k.trendLabel}
            sparklineData={k.sparkline}
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.revenueSparkline ?? []}
              labels={revenueLabels}
              width={480}
              height={140}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
            {attention.length === 0 ? (
              <p className="text-[var(--text-sm)] text-[var(--text-muted)]">All clear — no urgent items</p>
            ) : (
              attention.slice(0, 6).map((item, i) => (
                <Link
                  key={i}
                  href={item.link}
                  className="flex items-start gap-2 p-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] text-[var(--text-sm)]"
                >
                  <Badge
                    variant={
                      item.severity === "danger"
                        ? "danger"
                        : item.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    {item.type}
                  </Badge>
                  <span className="flex-1 leading-snug">{item.title}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {inventory.lowStockAlerts.length > 0 && (
        <Card className="mb-8 border-[var(--warning)]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--warning)]">
              <Package className="h-4 w-4" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {inventory.lowStockAlerts.map((a) => (
                <li key={a.productId} className="flex justify-between text-[var(--text-sm)]">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-[var(--text-muted)]">
                    {a.inStock} slabs · min {a.minStockAlert}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction href="/labour/attendance" icon={Users} label="Mark Attendance" />
        <QuickAction href="/production" icon={Wrench} label="Production Board" />
        <QuickAction href="/inventory/slabs" icon={Package} label="Slab Inventory" />
        <QuickAction href="/ewb" icon={Truck} label="E-Way Bills" />
        <QuickAction href="/labour/tasks" icon={ClipboardList} label="Task Board" />
        <QuickAction href="/invoices" icon={IndianRupee} label="Invoices" />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-2)] transition-colors"
    >
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-2)] p-2">
        <Icon className="h-4 w-4 text-[var(--accent)]" />
      </div>
      <span className="text-[var(--text-sm)] font-medium">{label}</span>
    </Link>
  );
}
