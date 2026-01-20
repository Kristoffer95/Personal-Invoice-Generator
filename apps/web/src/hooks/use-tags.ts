"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

export type TagType = "invoice" | "folder" | "both";

export function useTags(type?: TagType) {
  const tags = useQuery(api.tags.listTags, type ? { type } : {});

  return {
    tags: tags ?? [],
    isLoading: tags === undefined,
  };
}

export function useInvoiceTags() {
  const tags = useQuery(api.tags.getInvoiceTags);

  return {
    tags: tags ?? [],
    isLoading: tags === undefined,
  };
}

export function useFolderTags() {
  const tags = useQuery(api.tags.getFolderTags);

  return {
    tags: tags ?? [],
    isLoading: tags === undefined,
  };
}

export function useTag(tagId: Id<"tags"> | undefined) {
  const tag = useQuery(api.tags.getTag, tagId ? { tagId } : "skip");

  return {
    tag: tag ?? null,
    isLoading: tag === undefined,
  };
}

export function useInvoicesByTag(tagId: Id<"tags"> | undefined) {
  const invoices = useQuery(
    api.tags.getInvoicesByTag,
    tagId ? { tagId } : "skip"
  );

  return {
    invoices: invoices ?? [],
    isLoading: invoices === undefined,
  };
}

export function useFoldersByTag(tagId: Id<"tags"> | undefined) {
  const folders = useQuery(
    api.tags.getFoldersByTag,
    tagId ? { tagId } : "skip"
  );

  return {
    folders: folders ?? [],
    isLoading: folders === undefined,
  };
}

export function useTagMutations() {
  const createTag = useMutation(api.tags.createTag);
  const updateTag = useMutation(api.tags.updateTag);
  const removeTag = useMutation(api.tags.removeTag);
  const addTagToInvoice = useMutation(api.tags.addTagToInvoice);
  const removeTagFromInvoice = useMutation(api.tags.removeTagFromInvoice);
  const addTagToFolder = useMutation(api.tags.addTagToFolder);
  const removeTagFromFolder = useMutation(api.tags.removeTagFromFolder);

  return {
    createTag,
    updateTag,
    removeTag,
    addTagToInvoice,
    removeTagFromInvoice,
    addTagToFolder,
    removeTagFromFolder,
  };
}
