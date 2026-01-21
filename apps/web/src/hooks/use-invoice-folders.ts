"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

export interface FolderFilterOptions {
  tags?: Id<"tags">[];
  searchQuery?: string;
}

export function useInvoiceFolders(options?: FolderFilterOptions) {
  const folders = useQuery(api.invoiceFolders.listWithCounts, options ?? {});

  return {
    folders: folders ?? [],
    isLoading: folders === undefined,
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

export function useFolderTree() {
  const tree = useQuery(api.invoiceFolders.getFolderTree);

  return {
    tree: tree ?? [],
    isLoading: tree === undefined,
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
  const createFolder = useMutation(api.invoiceFolders.createFolder);
  const updateFolder = useMutation(api.invoiceFolders.updateFolder);
  const deleteFolder = useMutation(api.invoiceFolders.removeFolder);
  const moveFolder = useMutation(api.invoiceFolders.moveFolder);
  const toggleFolderMoveLock = useMutation(api.invoiceFolders.toggleFolderMoveLock);

  return {
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    toggleFolderMoveLock,
  };
}
