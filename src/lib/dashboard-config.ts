import type { getDashboardStats } from "@/lib/reports";
import type { getInventorySummary } from "@/lib/inventory";

type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
type InventorySummary = Awaited<ReturnType<typeof getInventorySummary>>;

export type DashboardKpi = {
  label: string;
  value: string | number;
  href?: string;
  trend?: number;
  trendLabel?: string;
  sparkline?: number[];
};

export type QuickAction = {
  href: string;
  label: string;
};

export function getRoleDashboardKpis(
  roleName: string,
  stats: DashboardStats,
  inventory: InventorySummary
): DashboardKpi[] {
  const utilization =
    stats.labourTotal > 0
      ? Math.round((stats.labourPresent / stats.labourTotal) * 100)
      : 0;

  switch (roleName) {
    case "owner":
      return [
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
          label: "Orders in Progress",
          value: stats.ordersInProgress,
          href: "/orders",
          trendLabel: stats.delayedOrders > 0 ? `${stats.delayedOrders} delayed` : undefined,
        },
        {
          label: "Inventory Alerts",
          value: inventory.lowStockAlerts.length,
          href: "/inventory",
        },
      ];

    case "accountant":
      return [
        {
          label: "Invoices",
          value: stats.invoicesThisMonth,
          href: "/invoices",
        },
        {
          label: "Collections",
          value: `₹${stats.collectionsThisMonth.toLocaleString("en-IN")}`,
          href: "/invoices",
        },
        {
          label: "GST Collected",
          value: `₹${stats.gstCollectedThisMonth.toLocaleString("en-IN")}`,
          href: "/invoices",
        },
        {
          label: "Due Payments",
          value: `₹${stats.overduePayments.toLocaleString("en-IN")}`,
          href: "/invoices",
        },
      ];

    case "labour":
      return [
        {
          label: "Attendance",
          value: `${stats.labourPresent}/${stats.labourTotal}`,
          href: "/my-tasks",
        },
        {
          label: "Tasks",
          value: stats.pendingTasks,
          href: "/my-tasks",
        },
        {
          label: "Production Queue",
          value: stats.slabsInCutting,
          href: "/inventory",
        },
      ];

    case "supervisor":
      return [
        {
          label: "Production Status",
          value: stats.todayProduction,
          href: "/production",
          sparkline: stats.productionSparkline,
        },
        {
          label: "Delayed Orders",
          value: stats.delayedOrders,
          href: "/orders",
        },
        {
          label: "Workforce Utilization",
          value: `${utilization}%`,
          href: "/labour/attendance",
          trendLabel: `${stats.labourPresent} of ${stats.labourTotal} present`,
        },
        {
          label: "Critical Tasks",
          value: stats.criticalTasks,
          href: "/labour/tasks",
        },
      ];

    default:
      return [
        {
          label: "Orders in Progress",
          value: stats.ordersInProgress,
          href: "/orders",
        },
        {
          label: "Inventory Alerts",
          value: inventory.lowStockAlerts.length,
          href: "/inventory",
        },
      ];
  }
}

export function getRoleQuickActions(roleName: string): QuickAction[] {
  switch (roleName) {
    case "owner":
      return [
        { href: "/invoices/new", label: "New Invoice" },
        { href: "/orders", label: "View Orders" },
        { href: "/production", label: "Production Board" },
        { href: "/inventory", label: "Inventory" },
        { href: "/labour/attendance", label: "Mark Attendance" },
        { href: "/reports", label: "Reports" },
      ];

    case "accountant":
      return [
        { href: "/invoices/new", label: "New Invoice" },
        { href: "/invoices", label: "Invoices" },
        { href: "/clients", label: "Clients" },
        { href: "/ewb", label: "E-Way Bills" },
        { href: "/reports", label: "Reports" },
      ];

    case "labour":
      return [
        { href: "/my-tasks", label: "My Tasks" },
        { href: "/inventory/slabs", label: "Slab Inventory" },
        { href: "/guidelines", label: "Guidelines" },
      ];

    case "supervisor":
      return [
        { href: "/production", label: "Production Board" },
        { href: "/labour/attendance", label: "Mark Attendance" },
        { href: "/labour/tasks", label: "Task Board" },
        { href: "/cutter", label: "Cutter Board" },
        { href: "/orders", label: "View Orders" },
      ];

    default:
      return [{ href: "/dashboard", label: "Dashboard" }];
  }
}

export function getRoleHeaderActions(roleName: string): QuickAction[] {
  switch (roleName) {
    case "owner":
      return [
        { href: "/invoices/new", label: "New Invoice" },
        { href: "/orders", label: "View Orders" },
      ];
    case "accountant":
      return [
        { href: "/invoices/new", label: "New Invoice" },
        { href: "/invoices", label: "View Invoices" },
      ];
    case "supervisor":
      return [
        { href: "/production", label: "Production Board" },
        { href: "/labour/attendance", label: "Attendance" },
      ];
    case "labour":
      return [{ href: "/my-tasks", label: "My Tasks" }];
    default:
      return [];
  }
}

export function showRevenueChart(roleName: string): boolean {
  return roleName === "owner" || roleName === "accountant";
}

export function showLowStockPanel(roleName: string): boolean {
  return roleName === "owner" || roleName === "supervisor";
}
