"use client";

import { useQuery } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";

export type UserRole = "user" | "admin";

/**
 * Hook to get the current user with their role.
 * Returns user data, role, and admin status helpers.
 */
export function useUserRole() {
  const user = useQuery(api.users.getCurrentWithRole);

  return {
    user,
    role: (user?.role ?? "user") as UserRole,
    isAdmin: user?.role === "admin",
    isLoading: user === undefined,
    isAuthenticated: user !== null && user !== undefined,
  };
}
