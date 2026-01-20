"use client";

import { useMutation } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";

/**
 * Hook to ensure the current user exists in the database.
 * This is useful for triggering auto-provisioning before attempting mutations.
 */
export function useEnsureUser() {
  const ensureUser = useMutation(api.users.ensureUser);

  return {
    ensureUser,
  };
}
