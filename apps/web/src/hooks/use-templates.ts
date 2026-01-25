"use client";

import { useQuery, useMutation } from "convex/react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id, Doc } from "@invoice-generator/backend/convex/_generated/dataModel";

// Export the Template type directly from Convex document type
export type Template = Doc<"templates">;

// Simple in-memory cache for template results
type CacheEntry = {
  data: Template[];
  timestamp: number;
};

const templateCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60000; // 60 seconds cache TTL

function getCachedData(key: string): Template[] | null {
  const entry = templateCache.get(key);
  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    templateCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedData(key: string, data: Template[]): void {
  templateCache.set(key, { data, timestamp: Date.now() });

  // Clean up old cache entries (keep max 50)
  if (templateCache.size > 50) {
    const entries = Array.from(templateCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - 50);
    toDelete.forEach(([k]) => templateCache.delete(k));
  }
}

// Clear cache when data changes (for mutations)
export function invalidateTemplateCache(): void {
  templateCache.clear();
}

/**
 * Hook to fetch all templates for the authenticated user
 */
export function useTemplates() {
  const cacheKey = "templates:all";
  const previousResultRef = useRef<Template[] | null>(null);

  // Track the last successful data for this component instance
  const [stableData, setStableData] = useState<Template[] | null>(() => {
    return getCachedData(cacheKey);
  });

  // Query all templates
  const templates = useQuery(api.templates.listTemplates);

  // Update caches when we get fresh data
  useEffect(() => {
    if (templates !== undefined && Array.isArray(templates)) {
      setCachedData(cacheKey, templates);
      previousResultRef.current = templates;
      setStableData(templates);
    }
  }, [templates]);

  // Determine what data to return
  const result = useMemo((): Template[] => {
    // Priority 1: Fresh data from Convex
    if (templates !== undefined && Array.isArray(templates)) {
      return templates;
    }

    // Priority 2: Cached data
    const cached = getCachedData(cacheKey);
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
  const hasAnyData = result.length > 0 || stableData !== null || getCachedData(cacheKey) !== null;

  return {
    templates: result,
    isLoading: templates === undefined && !hasAnyData,
    isFetching: templates === undefined,
  };
}

/**
 * Hook to fetch a single template by ID
 */
export function useTemplate(templateId: Id<"templates"> | undefined) {
  const template = useQuery(
    api.templates.getTemplate,
    templateId ? { templateId } : "skip"
  );

  return {
    template: template ?? null,
    isLoading: template === undefined,
  };
}

/**
 * Hook to fetch the user's default template
 */
export function useDefaultTemplate() {
  const template = useQuery(api.templates.getDefaultTemplate);

  return {
    template: template ?? null,
    isLoading: template === undefined,
  };
}

/**
 * Hook providing mutation functions for template operations
 * All mutations are wrapped to invalidate the cache after successful operations
 */
export function useTemplateMutations() {
  const createTemplateMutation = useMutation(api.templates.createTemplate);
  const updateTemplateMutation = useMutation(api.templates.updateTemplate);
  const duplicateTemplateMutation = useMutation(api.templates.duplicateTemplate);
  const duplicateFromSystemTemplateMutation = useMutation(api.templates.duplicateFromSystemTemplate);
  const deleteTemplateMutation = useMutation(api.templates.deleteTemplate);
  const setDefaultTemplateMutation = useMutation(api.templates.setDefaultTemplate);
  const clearDefaultTemplateMutation = useMutation(api.templates.clearDefaultTemplate);
  const migrateFromLocalStorageMutation = useMutation(api.templates.migrateFromLocalStorage);

  // Wrap mutations to invalidate cache after successful operations
  const wrapWithCacheInvalidation = useCallback(
    <T extends (...args: Parameters<T>) => Promise<unknown>>(
      mutation: T
    ): T => {
      return (async (...args: Parameters<T>) => {
        const result = await mutation(...args);
        invalidateTemplateCache();
        return result;
      }) as T;
    },
    []
  );

  return {
    createTemplate: wrapWithCacheInvalidation(createTemplateMutation),
    updateTemplate: wrapWithCacheInvalidation(updateTemplateMutation),
    duplicateTemplate: wrapWithCacheInvalidation(duplicateTemplateMutation),
    duplicateFromSystemTemplate: wrapWithCacheInvalidation(duplicateFromSystemTemplateMutation),
    deleteTemplate: wrapWithCacheInvalidation(deleteTemplateMutation),
    setDefaultTemplate: wrapWithCacheInvalidation(setDefaultTemplateMutation),
    clearDefaultTemplate: wrapWithCacheInvalidation(clearDefaultTemplateMutation),
    migrateFromLocalStorage: wrapWithCacheInvalidation(migrateFromLocalStorageMutation),
  };
}
