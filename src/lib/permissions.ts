/** MarblePro RBAC — permissions stored in roles.permissions JSON */

export const PERMISSIONS = {
  // Inventory
  inventory_read: "inventory.read",
  inventory_write: "inventory.write",
  // Cutter (Phase 2)
  cutter_read: "cutter.read",
  cutter_write: "cutter.write",
  // Invoices
  invoice_read: "invoice.read",
  invoice_write: "invoice.write",
  // E-Way Bill
  ewb_read: "ewb.read",
  ewb_write: "ewb.write",
  // Labour — wages restricted
  labour_read: "labour.read",
  labour_write: "labour.write",
  wages_read: "wages.read",
  wages_write: "wages.write",
  // Tasks (workers: own tasks only enforced in API)
  tasks_read: "tasks.read",
  tasks_write: "tasks.write",
  // Settings & billing
  settings_write: "settings.write",
  members_invite: "members.invite",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_TEMPLATES: Record<
  string,
  { permissions: Record<string, boolean>; isSystemRole: boolean }
> = {
  owner: {
    isSystemRole: true,
    permissions: Object.fromEntries(
      Object.values(PERMISSIONS).map((p) => [p, true])
    ),
  },
  supervisor: {
    isSystemRole: true,
    permissions: {
      [PERMISSIONS.inventory_read]: true,
      [PERMISSIONS.inventory_write]: true,
      [PERMISSIONS.cutter_read]: true,
      [PERMISSIONS.cutter_write]: true,
      [PERMISSIONS.labour_read]: true,
      [PERMISSIONS.labour_write]: true,
      [PERMISSIONS.tasks_read]: true,
      [PERMISSIONS.tasks_write]: true,
    },
  },
  labour: {
    isSystemRole: true,
    permissions: {
      [PERMISSIONS.tasks_read]: true,
      [PERMISSIONS.tasks_write]: true,
      [PERMISSIONS.inventory_read]: true,
    },
  },
  accountant: {
    isSystemRole: true,
    permissions: {
      [PERMISSIONS.invoice_read]: true,
      [PERMISSIONS.invoice_write]: true,
      [PERMISSIONS.ewb_read]: true,
      [PERMISSIONS.ewb_write]: true,
      [PERMISSIONS.inventory_read]: true,
    },
  },
};

export function hasPermission(
  permissions: Record<string, boolean> | unknown,
  required: Permission
): boolean {
  if (!permissions || typeof permissions !== "object") return false;
  return Boolean((permissions as Record<string, boolean>)[required]);
}
