import React from "react";
import { UserRole } from "@/types/erp";

interface RoleGateProps {
  currentRole: UserRole;
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({
  currentRole,
  allowedRoles,
  children,
  fallback = null,
}: RoleGateProps) {
  if (!allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
