"use client";

import { useQuery } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";

/**
 * All available permissions in the system.
 * Mirrors the backend PERMISSIONS constant.
 * Follows action:resource naming convention.
 */
export const PERMISSIONS = {
  // Invoice permissions
  READ_INVOICES: "read:invoices",
  WRITE_INVOICES: "write:invoices",
  DELETE_INVOICES: "delete:invoices",

  // Template permissions
  READ_TEMPLATES: "read:templates",
  WRITE_TEMPLATES: "write:templates",

  // Client permissions
  READ_CLIENTS: "read:clients",
  WRITE_CLIENTS: "write:clients",

  // Profile permissions
  READ_PROFILE: "read:profile",
  WRITE_PROFILE: "write:profile",

  // Admin permissions
  ADMIN_USERS: "admin:users",
  ADMIN_ROLES: "admin:roles",
  ADMIN_TEMPLATES: "admin:templates",
  ADMIN_SYSTEM: "admin:system",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Hook to get the current user with their role and permissions.
 * Returns user data, role, permissions, admin status, and hasPermission helper.
 */
export function useUserRole() {
  const data = useQuery(api.roles.getCurrentUserRole);

  const permissions = data?.permissions ?? [];
  const isAdmin = data?.isAdmin ?? false;

  /**
   * Check if the current user has a specific permission.
   */
  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  return {
    user: data?.user ?? null,
    role: data?.role ?? null,
    permissions,
    isAdmin,
    hasPermission,
    isLoading: data === undefined,
    isAuthenticated: data !== null && data !== undefined,
  };
}
