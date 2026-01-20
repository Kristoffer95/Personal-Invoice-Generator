import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { extractClerkId, getOrCreateUserFromIdentity, getUserFromIdentityOrE2E } from "./users";

// List all folders for the current user
export const listFolders = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const folders = await ctx.db
      .query("invoiceFolders")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    // Filter out soft-deleted folders
    return folders.filter((f) => !f.deletedAt);
  },
});

// Get a single folder by ID
export const getFolder = query({
  args: { folderId: v.id("invoiceFolders") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    const folder = await ctx.db.get(args.folderId);

    // Security: Ensure folder belongs to user
    if (!folder || folder.userId !== user._id || folder.deletedAt) {
      return null;
    }

    return folder;
  },
});

// Get child folders of a parent
export const getChildren = query({
  args: { parentId: v.optional(v.id("invoiceFolders")) },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const folders = await ctx.db
      .query("invoiceFolders")
      .withIndex("by_parent_id", (q) => q.eq("parentId", args.parentId))
      .collect();

    // Filter by user and not deleted
    return folders.filter((f) => f.userId === user._id && !f.deletedAt);
  },
});

// Create a new folder
export const createFolder = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    parentId: v.optional(v.id("invoiceFolders")),
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // If parentId provided, verify it exists and belongs to user
    if (args.parentId) {
      const parentFolder = await ctx.db.get(args.parentId);
      if (!parentFolder || parentFolder.userId !== user._id) {
        throw new Error("Parent folder not found");
      }
    }

    const now = Date.now();
    const folderId = await ctx.db.insert("invoiceFolders", {
      userId: user._id,
      name: args.name,
      description: args.description,
      color: args.color,
      parentId: args.parentId,
      createdAt: now,
      updatedAt: now,
    });

    return folderId;
  },
});

// Update a folder
export const updateFolder = mutation({
  args: {
    folderId: v.id("invoiceFolders"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    parentId: v.optional(v.id("invoiceFolders")),
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id) {
      throw new Error("Folder not found");
    }

    // Prevent circular references
    if (args.parentId) {
      if (args.parentId === args.folderId) {
        throw new Error("Folder cannot be its own parent");
      }

      const parentFolder = await ctx.db.get(args.parentId);
      if (!parentFolder || parentFolder.userId !== user._id) {
        throw new Error("Parent folder not found");
      }

      // Check for circular reference by traversing up the tree
      let currentParent = parentFolder;
      while (currentParent.parentId) {
        if (currentParent.parentId === args.folderId) {
          throw new Error("Cannot create circular folder reference");
        }
        const nextParent = await ctx.db.get(currentParent.parentId);
        if (!nextParent) break;
        currentParent = nextParent;
      }
    }

    const { folderId, ...updates } = args;
    await ctx.db.patch(folderId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return folderId;
  },
});

// Soft delete a folder (and optionally its contents)
export const removeFolder = mutation({
  args: {
    folderId: v.id("invoiceFolders"),
    deleteContents: v.optional(v.boolean()), // If true, also delete invoices in folder
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id) {
      throw new Error("Folder not found");
    }

    const now = Date.now();

    // Handle invoices in folder
    const invoicesInFolder = await ctx.db
      .query("invoices")
      .withIndex("by_folder_id", (q) => q.eq("folderId", args.folderId))
      .collect();

    if (args.deleteContents) {
      // Soft delete all invoices
      for (const invoice of invoicesInFolder) {
        await ctx.db.patch(invoice._id, { deletedAt: now });
      }
    } else {
      // Move invoices to unfiled (null folderId)
      for (const invoice of invoicesInFolder) {
        await ctx.db.patch(invoice._id, { folderId: undefined });
      }
    }

    // Handle child folders
    const childFolders = await ctx.db
      .query("invoiceFolders")
      .withIndex("by_parent_id", (q) => q.eq("parentId", args.folderId))
      .collect();

    // Move child folders to parent of this folder (or root)
    for (const child of childFolders) {
      await ctx.db.patch(child._id, { parentId: folder.parentId });
    }

    // Soft delete the folder
    await ctx.db.patch(args.folderId, { deletedAt: now });

    return args.folderId;
  },
});

// Get folder with invoice count
export const listWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const folders = await ctx.db
      .query("invoiceFolders")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const activeFolders = folders.filter((f) => !f.deletedAt);

    // Get invoice counts for each folder
    const foldersWithCounts = await Promise.all(
      activeFolders.map(async (folder) => {
        const invoices = await ctx.db
          .query("invoices")
          .withIndex("by_folder_id", (q) => q.eq("folderId", folder._id))
          .collect();
        const activeInvoices = invoices.filter((i) => !i.deletedAt);
        return {
          ...folder,
          invoiceCount: activeInvoices.length,
        };
      })
    );

    return foldersWithCounts;
  },
});
