"use client";

import { useQuery } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";

export function useCurrentUser() {
  const user = useQuery(api.users.getCurrent);

  return {
    user,
    isLoading: user === undefined,
    isAuthenticated: user !== null && user !== undefined,
  };
}
