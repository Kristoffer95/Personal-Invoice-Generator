import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateUserFromIdentity, getUserFromIdentityOrE2E } from "./users";

// List all folders for the current user with filtering
export const listFolders = query({
  args: {
    parentId: v.optional(v.id("invoiceFolders")),
    tags: v.optional(v.array(v.id("tags"))),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    let folders;
    if (args.parentId !== undefined) {
      folders = await ctx.db
        .query("invoiceFolders")
        .withIndex("by_parent_id", (q) => q.eq("parentId", args.parentId))
        .collect();
      folders = folders.filter((f) => f.userId === user._id);
    } else {
      folders = await ctx.db
        .query("invoiceFolders")
        .withIndex("by_user_id", (q) => q.eq("userId", user._id))
        .collect();
    }

    let filteredFolders = folders.filter((f) => !f.deletedAt);

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      filteredFolders = filteredFolders.filter((f) =>
        args.tags!.every((tagId) => f.tags?.includes(tagId))
      );
    }

    // Filter by search query
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      filteredFolders = filteredFolders.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          (f.description && f.description.toLowerCase().includes(query))
      );
    }

    return filteredFolders;
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
    tags: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify parent folder
    if (args.parentId) {
      const parentFolder = await ctx.db.get(args.parentId);
      if (!parentFolder || parentFolder.userId !== user._id || parentFolder.deletedAt) {
        throw new Error("Parent folder not found");
      }
    }

    // Validate tags
    if (args.tags && args.tags.length > 0) {
      for (const tagId of args.tags) {
        const tag = await ctx.db.get(tagId);
        if (!tag || tag.userId !== user._id || tag.deletedAt) {
          throw new Error("Invalid tag");
        }
        if (tag.type === "invoice") {
          throw new Error("Cannot use invoice-only tag on folder");
        }
      }
    }

    const now = Date.now();
    const folderId = await ctx.db.insert("invoiceFolders", {
      userId: user._id,
      name: args.name,
      description: args.description,
      color: args.color,
      parentId: args.parentId,
      tags: args.tags,
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
    tags: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
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
      if (!parentFolder || parentFolder.userId !== user._id || parentFolder.deletedAt) {
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

    // Validate tags
    if (args.tags && args.tags.length > 0) {
      for (const tagId of args.tags) {
        const tag = await ctx.db.get(tagId);
        if (!tag || tag.userId !== user._id || tag.deletedAt) {
          throw new Error("Invalid tag");
        }
        if (tag.type === "invoice") {
          throw new Error("Cannot use invoice-only tag on folder");
        }
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
  args: {
    tags: v.optional(v.array(v.id("tags"))),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const folders = await ctx.db
      .query("invoiceFolders")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    let activeFolders = folders.filter((f) => !f.deletedAt);

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      activeFolders = activeFolders.filter((f) =>
        args.tags!.every((tagId) => f.tags?.includes(tagId))
      );
    }

    // Filter by search query
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      activeFolders = activeFolders.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          (f.description && f.description.toLowerCase().includes(query))
      );
    }

    // Get invoice counts for each folder
    const foldersWithCounts = await Promise.all(
      activeFolders.map(async (folder) => {
        const invoices = await ctx.db
          .query("invoices")
          .withIndex("by_folder_id", (q) => q.eq("folderId", folder._id))
          .collect();
        const activeInvoices = invoices.filter((i) => !i.deletedAt && !i.isArchived);
        return {
          ...folder,
          invoiceCount: activeInvoices.length,
        };
      })
    );

    return foldersWithCounts;
  },
});

// Get folder tree (nested structure)
export const getFolderTree = query({
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

    // Get invoice counts
    const foldersWithCounts = await Promise.all(
      activeFolders.map(async (folder) => {
        const invoices = await ctx.db
          .query("invoices")
          .withIndex("by_folder_id", (q) => q.eq("folderId", folder._id))
          .collect();
        const activeInvoices = invoices.filter((i) => !i.deletedAt && !i.isArchived);
        return {
          ...folder,
          invoiceCount: activeInvoices.length,
          children: [] as typeof activeFolders,
        };
      })
    );

    // Build tree structure
    const folderMap = new Map(foldersWithCounts.map((f) => [f._id, f]));
    const rootFolders: typeof foldersWithCounts = [];

    for (const folder of foldersWithCounts) {
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(folder);
        } else {
          // Parent not found (deleted?), treat as root
          rootFolders.push(folder);
        }
      } else {
        rootFolders.push(folder);
      }
    }

    return rootFolders;
  },
});

// Get folder breadcrumb path (from root to folder)
export const getFolderPath = query({
  args: { folderId: v.id("invoiceFolders") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const path: Array<{ _id: string; name: string }> = [];
    let currentFolder = await ctx.db.get(args.folderId);

    while (currentFolder && currentFolder.userId === user._id && !currentFolder.deletedAt) {
      path.unshift({ _id: currentFolder._id, name: currentFolder.name });
      if (currentFolder.parentId) {
        currentFolder = await ctx.db.get(currentFolder.parentId);
      } else {
        break;
      }
    }

    return path;
  },
});

// Move folder to new parent (supports nested folders)
export const moveFolder = mutation({
  args: {
    folderId: v.id("invoiceFolders"),
    newParentId: v.optional(v.id("invoiceFolders")), // undefined = move to root
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id || folder.deletedAt) {
      throw new Error("Folder not found");
    }

    // Prevent circular references
    if (args.newParentId) {
      if (args.newParentId === args.folderId) {
        throw new Error("Folder cannot be its own parent");
      }

      const newParent = await ctx.db.get(args.newParentId);
      if (!newParent || newParent.userId !== user._id || newParent.deletedAt) {
        throw new Error("New parent folder not found");
      }

      // Check that new parent is not a descendant of the folder being moved
      let checkFolder = newParent;
      while (checkFolder.parentId) {
        if (checkFolder.parentId === args.folderId) {
          throw new Error("Cannot move folder into its own descendant");
        }
        const nextFolder = await ctx.db.get(checkFolder.parentId);
        if (!nextFolder) break;
        checkFolder = nextFolder;
      }
    }

    await ctx.db.patch(args.folderId, {
      parentId: args.newParentId,
      updatedAt: Date.now(),
    });

    return args.folderId;
  },
});
