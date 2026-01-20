"use client";

import { useQuery, useMutation } from "convex/react";
import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id, Doc } from "@invoice-generator/backend/convex/_generated/dataModel";
import type { InvoiceStatus } from "@invoice-generator/shared-types";

// Export the StatusLog type from the API for use in other components
export type StatusLog = Doc<"statusLogs">;

export interface StatusLogFilterOptions {
  invoiceId?: Id<"invoices">;
  folderId?: Id<"invoiceFolders">;
  status?: InvoiceStatus;
  searchQuery?: string;
  dateFrom?: number; // Unix timestamp
  dateTo?: number; // Unix timestamp
  limit?: number;
  cursor?: number; // For pagination
}

// Stable serialization of filter options for comparison
function serializeFilterOptions(options?: StatusLogFilterOptions): string {
  if (!options) return "{}";
  return JSON.stringify({
    invoiceId: options.invoiceId,
    folderId: options.folderId,
    status: options.status,
    searchQuery: options.searchQuery,
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
    limit: options.limit,
    cursor: options.cursor,
  });
}

// Simple in-memory cache for status log results
type CacheEntry = {
  data: { logs: StatusLog[]; nextCursor: number | null };
  timestamp: number;
};

const statusLogCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30000; // 30 seconds cache TTL

function getCachedData(key: string): { logs: StatusLog[]; nextCursor: number | null } | null {
  const entry = statusLogCache.get(key);
  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    statusLogCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedData(key: string, data: { logs: StatusLog[]; nextCursor: number | null }): void {
  statusLogCache.set(key, { data, timestamp: Date.now() });

  // Clean up old cache entries (keep max 50)
  if (statusLogCache.size > 50) {
    const entries = Array.from(statusLogCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - 50);
    toDelete.forEach(([k]) => statusLogCache.delete(k));
  }
}

// Clear cache when data changes (for mutations)
export function invalidateStatusLogCache(): void {
  statusLogCache.clear();
}

export function useStatusLogs(options?: StatusLogFilterOptions) {
  const cacheKey = useMemo(() => serializeFilterOptions(options), [options]);
  const previousResultRef = useRef<{ logs: StatusLog[]; nextCursor: number | null } | null>(null);

  // Track the last successful data for this component instance
  const [stableData, setStableData] = useState<{ logs: StatusLog[]; nextCursor: number | null } | null>(() => {
    // Try to get cached data on initial mount
    return getCachedData(cacheKey);
  });

  const queryResult = useQuery(api.statusLogs.listStatusLogs, options ?? {});

  // Update caches when we get fresh data
  useEffect(() => {
    if (queryResult !== undefined) {
      setCachedData(cacheKey, queryResult);
      previousResultRef.current = queryResult;
      setStableData(queryResult);
    }
  }, [queryResult, cacheKey]);

  // Determine what data to return
  const result = useMemo((): { logs: StatusLog[]; nextCursor: number | null } => {
    // Priority 1: Fresh data from Convex
    if (queryResult !== undefined) {
      return queryResult;
    }

    // Priority 2: Specific cached data for this exact filter combination
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // Priority 3: Last stable data we had (prevents flickering)
    if (stableData) {
      return stableData;
    }

    // Priority 4: Empty array as fallback
    return { logs: [], nextCursor: null };
  }, [queryResult, cacheKey, stableData]);

  // Determine loading state - only show loading if we have no data at all
  const hasAnyData = result.logs.length > 0 || stableData !== null || getCachedData(cacheKey) !== null;

  return {
    logs: result.logs,
    nextCursor: result.nextCursor,
    hasMore: result.nextCursor !== null,
    isLoading: queryResult === undefined && !hasAnyData,
    isFetching: queryResult === undefined,
    isFromCache: queryResult === undefined && hasAnyData,
  };
}

export function useInvoiceStatusLogs(invoiceId: Id<"invoices"> | undefined) {
  const logs = useQuery(
    api.statusLogs.getInvoiceStatusLogs,
    invoiceId ? { invoiceId } : "skip"
  );

  return {
    logs: logs ?? [],
    isLoading: logs === undefined,
  };
}

export function useStatusLogStats(options?: { dateFrom?: number; dateTo?: number }) {
  const stats = useQuery(api.statusLogs.getStatusLogStats, options ?? {});

  return {
    stats: stats ?? { totalChanges: 0, byStatus: {}, recentActivity: [] },
    isLoading: stats === undefined,
  };
}

export function useStatusLogMutations() {
  const createStatusLogMutation = useMutation(api.statusLogs.createStatusLog);
  const deleteLogsForInvoiceMutation = useMutation(api.statusLogs.deleteLogsForInvoice);

  // Wrap mutations to invalidate cache after successful operations
  const wrapWithCacheInvalidation = useCallback(<T extends (...args: Parameters<T>) => Promise<unknown>>(
    mutation: T
  ): T => {
    return (async (...args: Parameters<T>) => {
      const result = await mutation(...args);
      invalidateStatusLogCache();
      return result;
    }) as T;
  }, []);

  return {
    createStatusLog: wrapWithCacheInvalidation(createStatusLogMutation),
    deleteLogsForInvoice: wrapWithCacheInvalidation(deleteLogsForInvoiceMutation),
  };
}
