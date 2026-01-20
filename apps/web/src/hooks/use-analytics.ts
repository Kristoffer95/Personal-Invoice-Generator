"use client";

import { useQuery } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

export function useFolderAnalytics(folderId: Id<"invoiceFolders"> | undefined) {
  const analytics = useQuery(
    api.analytics.getFolderAnalytics,
    folderId ? { folderId } : "skip"
  );

  return {
    analytics: analytics ?? null,
    isLoading: analytics === undefined,
  };
}

export function useAllFoldersAnalytics() {
  const analytics = useQuery(api.analytics.getAllFoldersAnalytics);

  return {
    analytics: analytics ?? [],
    isLoading: analytics === undefined,
  };
}

export function useGlobalAnalytics(includeArchived?: boolean) {
  const analytics = useQuery(api.analytics.getGlobalAnalytics, {
    includeArchived,
  });

  return {
    analytics: analytics ?? null,
    isLoading: analytics === undefined,
  };
}

export function useUnfiledAnalytics() {
  const analytics = useQuery(api.analytics.getUnfiledAnalytics);

  return {
    analytics: analytics ?? null,
    isLoading: analytics === undefined,
  };
}

export function useAnalyticsByStatus() {
  const analytics = useQuery(api.analytics.getAnalyticsByStatus);

  return {
    analytics: analytics ?? {},
    isLoading: analytics === undefined,
  };
}

export function useAnalyticsByClient() {
  const analytics = useQuery(api.analytics.getAnalyticsByClient);

  return {
    analytics: analytics ?? [],
    isLoading: analytics === undefined,
  };
}

export function useMonthlyAnalytics(year?: number) {
  const analytics = useQuery(api.analytics.getMonthlyAnalytics, { year });

  return {
    analytics: analytics ?? [],
    isLoading: analytics === undefined,
  };
}
