"use client";

import { useQuery, useMutation } from "convex/react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id, Doc } from "@invoice-generator/backend/convex/_generated/dataModel";

export type InvoiceStatus =
  | "DRAFT"
  | "TO_SEND"
  | "SENT"
  | "PARTIAL_PAYMENT"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "REFUNDED";

// Export the Invoice type from the API for use in other components
export type Invoice = Doc<"invoices">;

export interface InvoiceFilterOptions {
  folderId?: Id<"invoiceFolders">;
  status?: InvoiceStatus;
  statuses?: InvoiceStatus[];
  isArchived?: boolean;
  tags?: Id<"tags">[];
  clientName?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  searchQuery?: string;
  limit?: number;
}

// Stable serialization of filter options for comparison
function serializeFilterOptions(options?: InvoiceFilterOptions): string {
  if (!options) return "{}";
  return JSON.stringify({
    folderId: options.folderId,
    status: options.status,
    statuses: options.statuses?.slice().sort(),
    isArchived: options.isArchived,
    tags: options.tags?.slice().sort(),
    clientName: options.clientName,
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
    amountMin: options.amountMin,
    amountMax: options.amountMax,
    searchQuery: options.searchQuery,
    limit: options.limit,
  });
}

// Simple in-memory cache for invoice results
type CacheEntry = {
  data: Invoice[];
  timestamp: number;
};

const invoiceCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60000; // 60 seconds cache TTL (increased for better UX)

function getCachedData(key: string): Invoice[] | null {
  const entry = invoiceCache.get(key);
  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    invoiceCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedData(key: string, data: Invoice[]): void {
  invoiceCache.set(key, { data, timestamp: Date.now() });

  // Clean up old cache entries (keep max 100 for better filter switching)
  if (invoiceCache.size > 100) {
    const entries = Array.from(invoiceCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - 100);
    toDelete.forEach(([k]) => invoiceCache.delete(k));
  }
}

// Clear cache when data changes (for mutations)
export function invalidateInvoiceCache(): void {
  invoiceCache.clear();
}

// Store the last successful result for each base query (without filters)
const lastResultCache = new Map<string, Invoice[]>();

// Create a base cache key that groups related queries together
function getBaseCacheKey(options?: InvoiceFilterOptions): string {
  if (!options) return "base:all";
  // Group by folder and archived status only - these are the "major" filters
  return `base:${options.folderId ?? "all"}:${options.isArchived ?? false}`;
}

export function useInvoices(options?: InvoiceFilterOptions) {
  const cacheKey = useMemo(() => serializeFilterOptions(options), [options]);
  const baseCacheKey = useMemo(() => getBaseCacheKey(options), [options]);
  const previousResultRef = useRef<Invoice[] | null>(null);
  const previousCacheKeyRef = useRef<string>(cacheKey);

  // Track the last successful data for this component instance
  const [stableData, setStableData] = useState<Invoice[] | null>(() => {
    // Try to get cached data on initial mount
    return getCachedData(cacheKey);
  });

  const invoices = useQuery(api.invoices.listInvoices, options ?? {});

  // Update caches when we get fresh data
  useEffect(() => {
    if (invoices !== undefined) {
      setCachedData(cacheKey, invoices);
      lastResultCache.set(baseCacheKey, invoices);
      previousResultRef.current = invoices;
      setStableData(invoices);
    }
  }, [invoices, cacheKey, baseCacheKey]);

  // When cache key changes (filter changes), try to use cached data immediately
  useEffect(() => {
    if (cacheKey !== previousCacheKeyRef.current) {
      previousCacheKeyRef.current = cacheKey;
      const cached = getCachedData(cacheKey);
      if (cached) {
        setStableData(cached);
      }
      // Don't clear stableData if no cache - keep showing previous result
    }
  }, [cacheKey]);

  // Determine what data to return - always returns Invoice[] type
  const result = useMemo((): Invoice[] => {
    // Priority 1: Fresh data from Convex
    if (invoices !== undefined) {
      return invoices;
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

    // Priority 4: Any result from the same base query
    const baseResult = lastResultCache.get(baseCacheKey);
    if (baseResult) {
      return baseResult;
    }

    // Priority 5: Empty array as fallback
    return [];
  }, [invoices, cacheKey, baseCacheKey, stableData]);

  // Determine loading state - only show loading if we have no data at all
  const hasAnyData = result.length > 0 || stableData !== null || getCachedData(cacheKey) !== null;

  return {
    invoices: result,
    isLoading: invoices === undefined && !hasAnyData,
    isFetching: invoices === undefined,
    isFromCache: invoices === undefined && hasAnyData,
  };
}

export function useRecentInvoices(limit?: number) {
  const invoices = useQuery(api.invoices.listRecent, { limit });

  return {
    invoices: invoices ?? [],
    isLoading: invoices === undefined,
  };
}

export function useInvoice(invoiceId: Id<"invoices"> | undefined) {
  const invoice = useQuery(
    api.invoices.getInvoice,
    invoiceId ? { invoiceId } : "skip"
  );

  return {
    invoice: invoice ?? null,
    isLoading: invoice === undefined,
  };
}

export function useUncategorizedInvoices() {
  const invoices = useQuery(api.invoices.getUnfiled);

  return {
    invoices: invoices ?? [],
    isLoading: invoices === undefined,
  };
}

// Alias for backwards compatibility
export const useUnfiledInvoices = useUncategorizedInvoices;

export function useAllInvoicesCount() {
  // Get all non-archived invoices for count
  const invoices = useQuery(api.invoices.listInvoices, { isArchived: false });

  return {
    count: invoices?.length ?? 0,
    isLoading: invoices === undefined,
  };
}

export function useArchivedInvoices(limit?: number) {
  const invoices = useQuery(api.invoices.getArchivedInvoices, { limit });

  return {
    invoices: invoices ?? [],
    isLoading: invoices === undefined,
  };
}

export function useInvoiceMutations() {
  const createInvoiceMutation = useMutation(api.invoices.createInvoice);
  const updateInvoiceMutation = useMutation(api.invoices.updateInvoice);
  const deleteInvoiceMutation = useMutation(api.invoices.removeInvoice);
  const duplicateInvoiceMutation = useMutation(api.invoices.duplicateInvoice);
  const moveToFolderMutation = useMutation(api.invoices.moveToFolder);
  const updateStatusMutation = useMutation(api.invoices.updateStatus);
  const archiveInvoiceMutation = useMutation(api.invoices.archiveInvoice);
  const unarchiveInvoiceMutation = useMutation(api.invoices.unarchiveInvoice);
  const bulkArchiveInvoicesMutation = useMutation(api.invoices.bulkArchiveInvoices);
  const bulkDeleteInvoicesMutation = useMutation(api.invoices.bulkDeleteInvoices);
  const bulkUpdateStatusMutation = useMutation(api.invoices.bulkUpdateStatus);
  const toggleMoveLockMutation = useMutation(api.invoices.toggleMoveLock);
  const bulkMoveToFolderMutation = useMutation(api.invoices.bulkMoveToFolder);
  const quickCreateInvoiceMutation = useMutation(api.invoices.quickCreateInvoice);

  // Wrap mutations to invalidate cache after successful operations
  const wrapWithCacheInvalidation = useCallback(<T extends (...args: Parameters<T>) => Promise<unknown>>(
    mutation: T
  ): T => {
    return (async (...args: Parameters<T>) => {
      const result = await mutation(...args);
      invalidateInvoiceCache();
      return result;
    }) as T;
  }, []);

  return {
    createInvoice: wrapWithCacheInvalidation(createInvoiceMutation),
    updateInvoice: wrapWithCacheInvalidation(updateInvoiceMutation),
    deleteInvoice: wrapWithCacheInvalidation(deleteInvoiceMutation),
    duplicateInvoice: wrapWithCacheInvalidation(duplicateInvoiceMutation),
    moveToFolder: wrapWithCacheInvalidation(moveToFolderMutation),
    updateStatus: wrapWithCacheInvalidation(updateStatusMutation),
    archiveInvoice: wrapWithCacheInvalidation(archiveInvoiceMutation),
    unarchiveInvoice: wrapWithCacheInvalidation(unarchiveInvoiceMutation),
    bulkArchiveInvoices: wrapWithCacheInvalidation(bulkArchiveInvoicesMutation),
    bulkDeleteInvoices: wrapWithCacheInvalidation(bulkDeleteInvoicesMutation),
    bulkUpdateStatus: wrapWithCacheInvalidation(bulkUpdateStatusMutation),
    toggleMoveLock: wrapWithCacheInvalidation(toggleMoveLockMutation),
    bulkMoveToFolder: wrapWithCacheInvalidation(bulkMoveToFolderMutation),
    quickCreateInvoice: wrapWithCacheInvalidation(quickCreateInvoiceMutation),
  };
}

// Hook to get the next billing period for a folder
export function useNextBillingPeriod(folderId: Id<"invoiceFolders"> | undefined) {
  const period = useQuery(
    api.invoices.getNextBillingPeriod,
    folderId ? { folderId } : "skip"
  );

  return {
    period: period ?? null,
    isLoading: period === undefined,
  };
}

// Hook to get the next invoice number based on the folder's latest invoice
// This is the preferred method for generating invoice numbers as it's folder-scoped
export function useNextInvoiceNumberForFolder(folderId: Id<"invoiceFolders"> | undefined) {
  const data = useQuery(
    api.invoices.getNextInvoiceNumberForFolder,
    // For "All" or uncategorized invoices, pass undefined folderId (unfiled invoices)
    // Otherwise pass the specific folderId
    { folderId: folderId ?? undefined }
  );

  return {
    number: data?.number ?? 1,
    formatted: data?.formatted ?? "001",
    isLoading: data === undefined,
  };
}
