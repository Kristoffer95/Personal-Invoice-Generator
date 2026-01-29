"use client";

import { useQuery } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

/**
 * Hook to fetch all users with their activity stats (admin only).
 * Returns paginated user list with stats.
 */
export function useAdminUsers(options?: {
  limit?: number;
  cursor?: number;
}) {
  const result = useQuery(api.admin.listAllUsers, {
    limit: options?.limit,
    cursor: options?.cursor,
  });

  return {
    users: result?.users ?? [],
    nextCursor: result?.nextCursor ?? null,
    isLoading: result === undefined,
  };
}

/**
 * Hook to fetch detailed analytics for a single user (admin only).
 */
export function useUserDetail(userId: Id<"users"> | null) {
  const analytics = useQuery(
    api.admin.getUserAnalytics,
    userId ? { userId } : "skip"
  );

  const activities = useQuery(
    api.activityLogs.listUserActivities,
    userId ? { userId, limit: 50 } : "skip"
  );

  return {
    analytics,
    activities: activities?.activities ?? [],
    activitiesNextCursor: activities?.nextCursor ?? null,
    isLoading: analytics === undefined || activities === undefined,
  };
}

/**
 * Hook to fetch a user by ID (admin only).
 */
export function useAdminUser(userId: Id<"users"> | null) {
  const user = useQuery(
    api.admin.getUserById,
    userId ? { userId } : "skip"
  );

  return {
    user,
    isLoading: user === undefined,
  };
}

// Event type literals from activityLogs
type ActivityEventType =
  | "PDF_EXPORT"
  | "INVOICE_CREATE"
  | "INVOICE_UPDATE"
  | "INVOICE_DELETE"
  | "INVOICE_STATUS_CHANGE"
  | "INVOICE_ARCHIVE"
  | "INVOICE_UNARCHIVE"
  | "INVOICE_DUPLICATE"
  | "INVOICE_MOVE"
  | "FOLDER_CREATE"
  | "FOLDER_UPDATE"
  | "FOLDER_DELETE"
  | "FOLDER_MOVE"
  | "TEMPLATE_CREATE"
  | "TEMPLATE_UPDATE"
  | "TEMPLATE_DELETE"
  | "TEMPLATE_DUPLICATE"
  | "CLIENT_CREATE"
  | "CLIENT_UPDATE"
  | "CLIENT_DELETE"
  | "USER_PROFILE_UPDATE";

/**
 * Hook to fetch all activities with optional filtering (admin only).
 */
export function useAdminActivities(options?: {
  eventType?: ActivityEventType;
  limit?: number;
  cursor?: number;
}) {
  const result = useQuery(api.activityLogs.listAllActivities, {
    eventType: options?.eventType,
    limit: options?.limit,
    cursor: options?.cursor,
  });

  return {
    activities: result?.activities ?? [],
    nextCursor: result?.nextCursor ?? null,
    isLoading: result === undefined,
  };
}

/**
 * Hook to fetch platform-wide dashboard statistics (admin only).
 */
export function useAdminDashboardStats() {
  const stats = useQuery(api.admin.getDashboardStats, {});

  return {
    stats,
    isLoading: stats === undefined,
  };
}

/**
 * Hook to fetch activity counts by event type (admin only).
 */
export function useActivityCounts(options?: {
  userId?: Id<"users">;
  since?: number;
}) {
  const counts = useQuery(api.activityLogs.getActivityCounts, {
    userId: options?.userId,
    since: options?.since,
  });

  return {
    counts: counts ?? {},
    isLoading: counts === undefined,
  };
}
