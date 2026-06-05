import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getInventorySummary } from "@/lib/inventory";
import { getDashboardStats, getAttentionItems } from "@/lib/reports";
import {
  getRoleDashboardKpis,
  getRoleHeaderActions,
  getRoleQuickActions,
  showLowStockPanel,
  showRevenueChart,
} from "@/lib/dashboard-config";
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

const quickActionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/invoices/new": IndianRupee,
  "/invoices": IndianRupee,
  "/orders": Package,
  "/production": Wrench,
  "/inventory": Package,
  "/inventory/slabs": Package,
  "/labour/attendance": Users,
  "/labour/tasks": ClipboardList,
  "/reports": ClipboardList,
  "/clients": Users,
  "/ewb": Truck,
  "/my-tasks": ClipboardList,
  "/guidelines": ClipboardList,
  "/cutter": Wrench,
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const role = session.roleName;

  const [inventory, tenant, stats, attention] = await Promise.all([
    getInventorySummary(session.tenantId),
    prisma.tenant.findUnique({ where: { id: session.tenantId } }),
    getDashboardStats(session.tenantId),
    getAttentionItems(session.tenantId),
  ]);

  const kpis = getRoleDashboardKpis(role, stats, inventory);
  const headerActions = getRoleHeaderActions(role);
  const quickActions = getRoleQuickActions(role);

  const revenueLabels = stats.revenueSparkline?.map((_, i) =>
    i % 2 === 0 ? ["M", "T", "W", "T", "F", "S", "S"][i] ?? "" : ""
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${tenant?.name ?? "Workspace"} · What needs attention right now`}
        actions={
          headerActions.length > 0 ? (
            <>
              {headerActions.map((action, i) => (
                <Link key={action.href} href={action.href}>
                  <Button variant={i === 0 ? "primary" : "secondary"}>{action.label}</Button>
                </Link>
              ))}
            </>
          ) : undefined
        }
      />

      {tenant?.trialEndsAt && role === "owner" && (
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

      {(showRevenueChart(role) || role === "owner" || role === "supervisor") && (
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {showRevenueChart(role) && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue — Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={stats.revenueSparkline ?? []}
                  labels={revenueLabels}
                  height={140}
                />
              </CardContent>
            </Card>
          )}

          <Card className={showRevenueChart(role) ? "" : "lg:col-span-3"}>
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
      )}

      {showLowStockPanel(role) && inventory.lowStockAlerts.length > 0 && (
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
        {quickActions.map((action) => (
          <QuickAction
            key={action.href}
            href={action.href}
            icon={quickActionIcons[action.href] ?? ClipboardList}
            label={action.label}
          />
        ))}
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
