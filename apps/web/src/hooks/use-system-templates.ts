"use client";

import { useQuery, useMutation } from "convex/react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id, Doc } from "@invoice-generator/backend/convex/_generated/dataModel";
import { useUserRole } from "./use-user-role";

// Export types directly from Convex document types
export type SystemTemplate = Doc<"systemTemplates">;
export type SystemTemplateFolder = Doc<"systemTemplateFolders">;

// Simple in-memory cache for system template results
type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const systemTemplateCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 60000; // 60 seconds cache TTL

function getCachedData<T>(key: string): T | null {
  const entry = systemTemplateCache.get(key);
  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    systemTemplateCache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCachedData<T>(key: string, data: T): void {
  systemTemplateCache.set(key, { data, timestamp: Date.now() });

  // Clean up old cache entries (keep max 50)
  if (systemTemplateCache.size > 50) {
    const entries = Array.from(systemTemplateCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - 50);
    toDelete.forEach(([k]) => systemTemplateCache.delete(k));
  }
}

// Clear cache when data changes (for mutations)
export function invalidateSystemTemplateCache(): void {
  systemTemplateCache.clear();
}

/**
 * Hook to fetch all system templates (for regular users - excludes hidden)
 */
export function useSystemTemplates() {
  const cacheKey = "systemTemplates:all";
  const previousResultRef = useRef<SystemTemplate[] | null>(null);

  // Track the last successful data for this component instance
  const [stableData, setStableData] = useState<SystemTemplate[] | null>(() => {
    return getCachedData<SystemTemplate[]>(cacheKey);
  });

  // Query all visible system templates
  const templates = useQuery(api.systemTemplates.listSystemTemplates);

  // Update caches when we get fresh data
  useEffect(() => {
    if (templates !== undefined && Array.isArray(templates)) {
      setCachedData(cacheKey, templates);
      previousResultRef.current = templates;
      setStableData(templates);
    }
  }, [templates]);

  // Determine what data to return
  const result = useMemo((): SystemTemplate[] => {
    // Priority 1: Fresh data from Convex
    if (templates !== undefined && Array.isArray(templates)) {
      return templates;
    }

    // Priority 2: Cached data
    const cached = getCachedData<SystemTemplate[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Priority 3: Last stable data (prevents flickering)
    if (stableData) {
      return stableData;
    }

    // Priority 4: Empty array as fallback
    return [];
  }, [templates, stableData]);

  // Determine loading state
  const hasAnyData = result.length > 0 || stableData !== null || getCachedData<SystemTemplate[]>(cacheKey) !== null;

  return {
    templates: result,
    isLoading: templates === undefined && !hasAnyData,
    isFetching: templates === undefined,
  };
}

/**
 * Hook to fetch all system templates for admin (includes hidden)
 */
export function useSystemTemplatesAdmin() {
  const { isAdmin } = useUserRole();
  const cacheKey = "systemTemplates:admin";
  const previousResultRef = useRef<SystemTemplate[] | null>(null);

  // Track the last successful data for this component instance
  const [stableData, setStableData] = useState<SystemTemplate[] | null>(() => {
    return getCachedData<SystemTemplate[]>(cacheKey);
  });

  // Query all system templates including hidden (admin only)
  const templates = useQuery(
    api.systemTemplates.listSystemTemplatesAdmin,
    isAdmin ? {} : "skip"
  );

  // Update caches when we get fresh data
  useEffect(() => {
    if (templates !== undefined && Array.isArray(templates)) {
      setCachedData(cacheKey, templates);
      previousResultRef.current = templates;
      setStableData(templates);
    }
  }, [templates]);

  // Determine what data to return
  const result = useMemo((): SystemTemplate[] => {
    // Priority 1: Fresh data from Convex
    if (templates !== undefined && Array.isArray(templates)) {
      return templates;
    }

    // Priority 2: Cached data
    const cached = getCachedData<SystemTemplate[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Priority 3: Last stable data (prevents flickering)
    if (stableData) {
      return stableData;
    }

    // Priority 4: Empty array as fallback
    return [];
  }, [templates, stableData]);

  // Determine loading state
  const hasAnyData = result.length > 0 || stableData !== null || getCachedData<SystemTemplate[]>(cacheKey) !== null;

  return {
    templates: result,
    isLoading: templates === undefined && !hasAnyData,
    isFetching: templates === undefined,
  };
}

/**
 * Hook to fetch a single system template by ID
 */
export function useSystemTemplate(templateId: Id<"systemTemplates"> | undefined) {
  const template = useQuery(
    api.systemTemplates.getSystemTemplate,
    templateId ? { templateId } : "skip"
  );

  return {
    template: template ?? null,
    isLoading: template === undefined,
  };
}

/**
 * Hook to fetch the default system template
 */
export function useDefaultSystemTemplate() {
  const template = useQuery(api.systemTemplates.getDefaultSystemTemplate);

  return {
    template: template ?? null,
    isLoading: template === undefined,
  };
}

/**
 * Hook to fetch all system template folders (for regular users - excludes hidden)
 */
export function useSystemTemplateFolders() {
  const folders = useQuery(api.systemTemplates.listFolders);

  return {
    folders: folders ?? [],
    isLoading: folders === undefined,
  };
}

/**
 * Hook to fetch all system template folders for admin (includes hidden)
 */
export function useSystemTemplateFoldersAdmin() {
  const { isAdmin } = useUserRole();
  const folders = useQuery(
    api.systemTemplates.listFoldersAdmin,
    isAdmin ? {} : "skip"
  );

  return {
    folders: folders ?? [],
    isLoading: folders === undefined,
  };
}

/**
 * Hook providing mutation functions for system template operations (admin only)
 * All mutations are wrapped to invalidate the cache after successful operations
 */
export function useSystemTemplateMutations() {
  // Template mutations
  const createSystemTemplateMutation = useMutation(api.systemTemplates.createSystemTemplate);
  const updateSystemTemplateMutation = useMutation(api.systemTemplates.updateSystemTemplate);
  const toggleSystemTemplateVisibilityMutation = useMutation(api.systemTemplates.toggleSystemTemplateVisibility);
  const deleteSystemTemplateMutation = useMutation(api.systemTemplates.deleteSystemTemplate);
  const setDefaultSystemTemplateMutation = useMutation(api.systemTemplates.setDefaultSystemTemplate);

  // Folder mutations
  const createFolderMutation = useMutation(api.systemTemplates.createFolder);
  const updateFolderMutation = useMutation(api.systemTemplates.updateFolder);
  const toggleFolderVisibilityMutation = useMutation(api.systemTemplates.toggleFolderVisibility);
  const deleteFolderMutation = useMutation(api.systemTemplates.deleteFolder);

  // Wrap mutations to invalidate cache after successful operations
  const wrapWithCacheInvalidation = useCallback(
    <T extends (...args: Parameters<T>) => Promise<unknown>>(
      mutation: T
    ): T => {
      return (async (...args: Parameters<T>) => {
        const result = await mutation(...args);
        invalidateSystemTemplateCache();
        return result;
      }) as T;
    },
    []
  );

  return {
    // Template mutations
    createSystemTemplate: wrapWithCacheInvalidation(createSystemTemplateMutation),
    updateSystemTemplate: wrapWithCacheInvalidation(updateSystemTemplateMutation),
    toggleSystemTemplateVisibility: wrapWithCacheInvalidation(toggleSystemTemplateVisibilityMutation),
    deleteSystemTemplate: wrapWithCacheInvalidation(deleteSystemTemplateMutation),
    setDefaultSystemTemplate: wrapWithCacheInvalidation(setDefaultSystemTemplateMutation),

    // Folder mutations
    createFolder: wrapWithCacheInvalidation(createFolderMutation),
    updateFolder: wrapWithCacheInvalidation(updateFolderMutation),
    toggleFolderVisibility: wrapWithCacheInvalidation(toggleFolderVisibilityMutation),
    deleteFolder: wrapWithCacheInvalidation(deleteFolderMutation),
  };
}
