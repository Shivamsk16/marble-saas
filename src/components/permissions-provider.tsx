"use client";

import { createContext, useContext } from "react";
import { hasPermission, type Permission } from "@/lib/permissions";

const PermissionsContext = createContext<Record<string, boolean>>({});

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: Record<string, boolean>;
  children: React.ReactNode;
}) {
  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const permissions = useContext(PermissionsContext);
  return {
    permissions,
    can: (permission: Permission) => hasPermission(permissions, permission),
  };
}
