"use client";

import { useQuery, useMutation } from "convex/react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

export interface FolderFilterOptions {
  tags?: Id<"tags">[];
  searchQuery?: string;
}

// Simple in-memory cache for folder results
type FolderCacheEntry = {
  data: unknown;
  timestamp: number;
};

const folderCache = new Map<string, FolderCacheEntry>();
const FOLDER_CACHE_TTL = 120000; // 2 minutes cache TTL for folders (they change less often)

function getCachedFolderData<T>(key: string): T | null {
  const entry = folderCache.get(key);
  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.timestamp > FOLDER_CACHE_TTL) {
    folderCache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCachedFolderData(key: string, data: unknown): void {
  folderCache.set(key, { data, timestamp: Date.now() });

  // Clean up old cache entries (keep max 50)
  if (folderCache.size > 50) {
    const entries = Array.from(folderCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - 50);
    toDelete.forEach(([k]) => folderCache.delete(k));
  }
}

// Clear cache when data changes (for mutations)
export function invalidateFolderCache(): void {
  folderCache.clear();
}

// Stable serialization of filter options for comparison
function serializeFolderOptions(options?: FolderFilterOptions): string {
  if (!options) return "folders:{}";
  return `folders:${JSON.stringify({
    tags: options.tags?.slice().sort(),
    searchQuery: options.searchQuery,
  })}`;
}

type FolderWithCount = {
  _id: Id<"invoiceFolders">;
  name: string;
  description?: string;
  color?: string;
  parentId?: Id<"invoiceFolders">;
  tags?: Id<"tags">[];
  invoiceCount: number;
  isMoveLocked?: boolean;
  clientProfileIds?: Id<"clientProfiles">[];
  defaultHourlyRate?: number;
  defaultCurrency?: string;
  defaultPaymentTerms?: string;
  defaultJobTitle?: string;
  defaultShowDetailedHours?: boolean;
};

export function useInvoiceFolders(options?: FolderFilterOptions) {
  const cacheKey = useMemo(() => serializeFolderOptions(options), [options]);
  const [stableData, setStableData] = useState<FolderWithCount[] | null>(() => {
    return getCachedFolderData<FolderWithCount[]>(cacheKey);
  });

  const folders = useQuery(api.invoiceFolders.listWithCounts, options ?? {});

  // Update cache when we get fresh data
  useEffect(() => {
    if (folders !== undefined) {
      setCachedFolderData(cacheKey, folders);
      setStableData(folders);
    }
  }, [folders, cacheKey]);

  // Determine what data to return
  const result = useMemo((): FolderWithCount[] => {
    if (folders !== undefined) {
      return folders;
    }
    const cached = getCachedFolderData<FolderWithCount[]>(cacheKey);
    if (cached) {
      return cached;
    }
    if (stableData) {
      return stableData;
    }
    return [];
  }, [folders, cacheKey, stableData]);

  const hasAnyData = result.length > 0 || stableData !== null;

  return {
    folders: result,
    isLoading: folders === undefined && !hasAnyData,
    isFetching: folders === undefined,
    isFromCache: folders === undefined && hasAnyData,
  };
}

export function useInvoiceFolder(folderId: Id<"invoiceFolders"> | undefined) {
  const folder = useQuery(
    api.invoiceFolders.getFolder,
    folderId ? { folderId } : "skip"
  );

  return {
    folder: folder ?? null,
    isLoading: folder === undefined,
  };
}

// Get folder with linked client profiles (for invoice auto-fill)
// Returns all client profiles associated with the folder
export function useFolderWithClientProfiles(folderId: Id<"invoiceFolders"> | undefined) {
  const folderWithProfiles = useQuery(
    api.invoiceFolders.getFolderWithClientProfiles,
    folderId ? { folderId } : "skip"
  );

  return {
    folder: folderWithProfiles ?? null,
    clientProfiles: folderWithProfiles?.clientProfiles ?? [],
    isLoading: folderWithProfiles === undefined,
  };
}

export function useFolderChildren(parentId?: Id<"invoiceFolders">) {
  const children = useQuery(api.invoiceFolders.getChildren, { parentId });

  return {
    children: children ?? [],
    isLoading: children === undefined,
  };
}

// Type for folder tree node
type FolderTreeNode = {
  _id: Id<"invoiceFolders">;
  name: string;
  description?: string;
  color?: string;
  parentId?: Id<"invoiceFolders">;
  tags?: Id<"tags">[];
  invoiceCount: number;
  isMoveLocked?: boolean;
  clientProfileIds?: Id<"clientProfiles">[];
  defaultHourlyRate?: number;
  defaultCurrency?: string;
  defaultPaymentTerms?: string;
  defaultJobTitle?: string;
  defaultShowDetailedHours?: boolean;
  children: FolderTreeNode[];
};

const TREE_CACHE_KEY = "folderTree";

export function useFolderTree() {
  const [stableData, setStableData] = useState<FolderTreeNode[] | null>(() => {
    return getCachedFolderData<FolderTreeNode[]>(TREE_CACHE_KEY);
  });

  const tree = useQuery(api.invoiceFolders.getFolderTree);

  // Update cache when we get fresh data
  useEffect(() => {
    if (tree !== undefined) {
      setCachedFolderData(TREE_CACHE_KEY, tree);
      setStableData(tree as FolderTreeNode[]);
    }
  }, [tree]);

  // Determine what data to return
  const result = useMemo((): FolderTreeNode[] => {
    if (tree !== undefined) {
      return tree as FolderTreeNode[];
    }
    const cached = getCachedFolderData<FolderTreeNode[]>(TREE_CACHE_KEY);
    if (cached) {
      return cached;
    }
    if (stableData) {
      return stableData;
    }
    return [];
  }, [tree, stableData]);

  const hasAnyData = result.length > 0 || stableData !== null;

  return {
    tree: result,
    isLoading: tree === undefined && !hasAnyData,
    isFetching: tree === undefined,
    isFromCache: tree === undefined && hasAnyData,
  };
}

export function useFolderPath(folderId: Id<"invoiceFolders"> | undefined) {
  const path = useQuery(
    api.invoiceFolders.getFolderPath,
    folderId ? { folderId } : "skip"
  );

  return {
    path: path ?? [],
    isLoading: path === undefined,
  };
}

export function useFolderMutations() {
  const createFolderMutation = useMutation(api.invoiceFolders.createFolder);
  const updateFolderMutation = useMutation(api.invoiceFolders.updateFolder);
  const deleteFolderMutation = useMutation(api.invoiceFolders.removeFolder);
  const moveFolderMutation = useMutation(api.invoiceFolders.moveFolder);
  const toggleFolderMoveLockMutation = useMutation(api.invoiceFolders.toggleFolderMoveLock);

  // Wrap mutations to invalidate cache after successful operations
  const wrapWithCacheInvalidation = useCallback(<T extends (...args: Parameters<T>) => Promise<unknown>>(
    mutation: T
  ): T => {
    return (async (...args: Parameters<T>) => {
      const result = await mutation(...args);
      invalidateFolderCache();
      return result;
    }) as T;
  }, []);

  return {
    createFolder: wrapWithCacheInvalidation(createFolderMutation),
    updateFolder: wrapWithCacheInvalidation(updateFolderMutation),
    deleteFolder: wrapWithCacheInvalidation(deleteFolderMutation),
    moveFolder: wrapWithCacheInvalidation(moveFolderMutation),
    toggleFolderMoveLock: wrapWithCacheInvalidation(toggleFolderMoveLockMutation),
  };
}
