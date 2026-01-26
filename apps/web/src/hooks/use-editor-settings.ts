"use client";

import { useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import { useTemplateStore } from "@/lib/template-store";
import { useCurrentUser } from "./use-current-user";
import type { EditorSettings } from "@invoice-generator/shared-types";

const _defaultEditorSettings: EditorSettings = {
  showRulers: true,
  showGrid: true,
  snapToGrid: true,
  gridSize: 10,
  zoomLevel: 100,
};

/**
 * Hook to fetch and sync editor settings from Convex
 * For authenticated users, fetches from userProfile.editorSettings
 * Falls back to default settings for unauthenticated users
 */
export function useEditorSettings() {
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser();
  const { editorSettings, setEditorSettings } = useTemplateStore();

  // Query user profile to get editor settings
  const profile = useQuery(
    api.userProfiles.getProfile,
    isAuthenticated ? {} : "skip"
  );

  // Sync Convex settings to store when available
  useEffect(() => {
    if (profile?.editorSettings) {
      setEditorSettings(profile.editorSettings);
    }
  }, [profile?.editorSettings, setEditorSettings]);

  return {
    editorSettings,
    isLoading: isAuthLoading || (isAuthenticated && profile === undefined),
    isAuthenticated,
  };
}

/**
 * Hook providing mutation functions for editor settings
 * Syncs settings to both local store and Convex
 */
export function useEditorSettingsMutations() {
  const { isAuthenticated } = useCurrentUser();
  const { editorSettings, updateEditorSettings: updateLocalSettings } = useTemplateStore();
  const updateEditorSettingsMutation = useMutation(api.userProfiles.updateEditorSettings);

  // Update settings - syncs to local store and optionally to Convex
  const updateEditorSettings = useCallback(
    async (settings: Partial<EditorSettings>) => {
      // Always update local state immediately
      updateLocalSettings(settings);

      // If authenticated, sync to Convex
      if (isAuthenticated) {
        const newSettings = { ...editorSettings, ...settings };
        try {
          await updateEditorSettingsMutation({
            showRulers: newSettings.showRulers,
            showGrid: newSettings.showGrid,
            snapToGrid: newSettings.snapToGrid,
            gridSize: newSettings.gridSize,
            zoomLevel: newSettings.zoomLevel,
          });
        } catch (error) {
          console.error("Failed to sync editor settings to Convex:", error);
          // Don't throw - local state is still updated
        }
      }
    },
    [isAuthenticated, editorSettings, updateLocalSettings, updateEditorSettingsMutation]
  );

  // Toggle helpers with Convex sync
  const toggleRulers = useCallback(() => {
    updateEditorSettings({ showRulers: !editorSettings.showRulers });
  }, [editorSettings.showRulers, updateEditorSettings]);

  const toggleGrid = useCallback(() => {
    updateEditorSettings({ showGrid: !editorSettings.showGrid });
  }, [editorSettings.showGrid, updateEditorSettings]);

  const toggleSnapToGrid = useCallback(() => {
    updateEditorSettings({ snapToGrid: !editorSettings.snapToGrid });
  }, [editorSettings.snapToGrid, updateEditorSettings]);

  const setZoomLevel = useCallback(
    (zoom: number) => {
      const clampedZoom = Math.max(25, Math.min(200, zoom));
      updateEditorSettings({ zoomLevel: clampedZoom });
    },
    [updateEditorSettings]
  );

  const zoomIn = useCallback(() => {
    const newZoom = Math.min(200, editorSettings.zoomLevel + 10);
    updateEditorSettings({ zoomLevel: newZoom });
  }, [editorSettings.zoomLevel, updateEditorSettings]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(25, editorSettings.zoomLevel - 10);
    updateEditorSettings({ zoomLevel: newZoom });
  }, [editorSettings.zoomLevel, updateEditorSettings]);

  return {
    updateEditorSettings,
    toggleRulers,
    toggleGrid,
    toggleSnapToGrid,
    setZoomLevel,
    zoomIn,
    zoomOut,
  };
}
