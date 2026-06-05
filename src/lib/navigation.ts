import { hasPermission, PERMISSIONS, type Permission } from "@/lib/permissions";

export type NavItemConfig = {
  href: string;
  label: string;
  permission?: Permission;
  anyPermissions?: Permission[];
  roles?: string[];
  searchAliases?: string[];
};

export type NavGroupConfig = {
  label: string;
  items: NavItemConfig[];
};

export const NAV_GROUPS: NavGroupConfig[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      {
        href: "/my-tasks",
        label: "My Tasks",
        roles: ["labour"],
        searchAliases: ["Tasks"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/inventory",
        label: "Inventory",
        permission: PERMISSIONS.inventory_read,
        searchAliases: ["Products", "Stock"],
      },
      {
        href: "/inventory/slabs",
        label: "Slabs",
        permission: PERMISSIONS.inventory_read,
        searchAliases: ["Slab Inventory"],
      },
      {
        href: "/orders",
        label: "Orders",
        permission: PERMISSIONS.orders_read,
      },
      {
        href: "/orders/new",
        label: "New Order",
        permission: PERMISSIONS.orders_create,
        searchAliases: ["Create Order"],
      },
      {
        href: "/production",
        label: "Production",
        permission: PERMISSIONS.orders_read,
        searchAliases: ["Production Board", "Workflow"],
      },
      {
        href: "/cutter",
        label: "Cutter",
        permission: PERMISSIONS.cutter_read,
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        href: "/clients",
        label: "Clients",
        permission: PERMISSIONS.clients_read,
        searchAliases: ["Customers"],
      },
      {
        href: "/clients/new",
        label: "Add Client",
        permission: PERMISSIONS.clients_create,
        searchAliases: ["New Client"],
      },
      { href: "/invoices", label: "Invoices", permission: PERMISSIONS.invoice_read },
      {
        href: "/invoices/new",
        label: "New Invoice",
        permission: PERMISSIONS.invoice_write,
      },
      { href: "/ewb", label: "E-Way Bill", permission: PERMISSIONS.ewb_read, searchAliases: ["E-Way Bills"] },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/labour",
        label: "Labour",
        permission: PERMISSIONS.labour_read,
      },
      {
        href: "/labour/workers",
        label: "Workers",
        permission: PERMISSIONS.labour_read,
        searchAliases: ["Add Worker"],
      },
      {
        href: "/labour/workers/new",
        label: "Add Worker",
        permission: PERMISSIONS.labour_write,
      },
      {
        href: "/labour/attendance",
        label: "Attendance",
        permission: PERMISSIONS.labour_read,
      },
      {
        href: "/labour/tasks",
        label: "Tasks",
        permission: PERMISSIONS.tasks_read,
        roles: ["owner", "supervisor"],
        searchAliases: ["Task Board"],
      },
      {
        href: "/labour/wages",
        label: "Wages",
        permission: PERMISSIONS.wages_read,
      },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/reminders", label: "Notifications", roles: ["owner"] },
      {
        href: "/reports",
        label: "Reports",
        permission: PERMISSIONS.reports_read,
      },
      {
        href: "/guidelines",
        label: "Guidelines",
        roles: ["owner", "supervisor", "labour"],
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/profile", label: "Profile", searchAliases: ["Account", "Settings"] },
      {
        href: "/settings/workspace",
        label: "Workspace",
        permission: PERMISSIONS.settings_write,
        roles: ["owner"],
      },
      {
        href: "/settings/team",
        label: "Team",
        permission: PERMISSIONS.members_invite,
        roles: ["owner"],
      },
      {
        href: "/settings/billing",
        label: "Billing",
        permission: PERMISSIONS.settings_write,
        roles: ["owner"],
      },
    ],
  },
];

export function canAccessNavItem(
  item: NavItemConfig,
  permissions: Record<string, boolean> | unknown,
  roleName: string
): boolean {
  if (item.permission && hasPermission(permissions, item.permission)) return true;
  if (item.anyPermissions?.some((p) => hasPermission(permissions, p))) return true;
  if (item.roles?.includes(roleName)) return true;
  if (!item.permission && !item.anyPermissions && !item.roles) return true;
  return false;
}

export function filterNavGroups(
  permissions: Record<string, boolean> | unknown,
  roleName: string
): NavGroupConfig[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessNavItem(item, permissions, roleName)),
  })).filter((group) => group.items.length > 0);
}

export type SearchPage = { href: string; label: string };

export function getSearchPages(
  permissions: Record<string, boolean> | unknown,
  roleName: string
): SearchPage[] {
  const seen = new Set<string>();
  const pages: SearchPage[] = [];

  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (!canAccessNavItem(item, permissions, roleName)) continue;
      if (!seen.has(item.href)) {
        seen.add(item.href);
        pages.push({ href: item.href, label: item.label });
      }
      for (const alias of item.searchAliases ?? []) {
        const key = `${item.href}:${alias}`;
        if (!seen.has(key)) {
          seen.add(key);
          pages.push({ href: item.href, label: alias });
        }
      }
    }
  }

  return pages.sort((a, b) => a.label.localeCompare(b.label));
}
