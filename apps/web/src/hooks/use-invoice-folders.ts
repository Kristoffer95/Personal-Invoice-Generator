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

  return {
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
  };
}
