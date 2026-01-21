import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateUserFromIdentity, getUserFromIdentityOrE2E } from "./users";

const tagTypeValidator = v.union(
  v.literal("invoice"),
  v.literal("folder"),
  v.literal("both")
);

// List all tags for the current user
export const listTags = query({
  args: {
    type: v.optional(tagTypeValidator),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    let tags;
    if (args.type) {
      tags = await ctx.db
        .query("tags")
        .withIndex("by_type", (q) => q.eq("userId", user._id).eq("type", args.type!))
        .collect();
    } else {
      tags = await ctx.db
        .query("tags")
        .withIndex("by_user_id", (q) => q.eq("userId", user._id))
        .collect();
    }

    return tags.filter((t) => !t.deletedAt);
  },
});

// Get tags that can be used for invoices
export const getInvoiceTags = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    return tags.filter(
      (t) => !t.deletedAt && (t.type === "invoice" || t.type === "both")
    );
  },
});

// Get tags that can be used for folders
export const getFolderTags = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    return tags.filter(
      (t) => !t.deletedAt && (t.type === "folder" || t.type === "both")
    );
  },
});

// Get a single tag by ID
export const getTag = query({
  args: { tagId: v.id("tags") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.userId !== user._id || tag.deletedAt) {
      return null;
    }

    return tag;
  },
});

// Create a new tag
export const createTag = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    type: tagTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check for duplicate name
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("userId", user._id).eq("name", args.name))
      .first();

    if (existing && !existing.deletedAt) {
      throw new Error("A tag with this name already exists");
    }

    const now = Date.now();
    const tagId = await ctx.db.insert("tags", {
      userId: user._id,
      name: args.name,
      color: args.color,
      type: args.type,
      createdAt: now,
      updatedAt: now,
    });

    return tagId;
  },
});

// Update a tag
export const updateTag = mutation({
  args: {
    tagId: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    type: v.optional(tagTypeValidator),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.userId !== user._id) {
      throw new Error("Tag not found");
    }

    // Check for duplicate name if name is being changed
    if (args.name && args.name !== tag.name) {
      const newName = args.name;
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("userId", user._id).eq("name", newName))
        .first();

      if (existing && !existing.deletedAt && existing._id !== args.tagId) {
        throw new Error("A tag with this name already exists");
      }
    }

    const { tagId, ...updates } = args;
    await ctx.db.patch(tagId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return tagId;
  },
});

// Delete a tag (soft delete)
export const removeTag = mutation({
  args: { tagId: v.id("tags") },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.userId !== user._id) {
      throw new Error("Tag not found");
    }

    await ctx.db.patch(args.tagId, { deletedAt: Date.now() });

    // Remove tag from all invoices
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    for (const invoice of invoices) {
      if (invoice.tags?.includes(args.tagId)) {
        await ctx.db.patch(invoice._id, {
          tags: invoice.tags.filter((t) => t !== args.tagId),
          updatedAt: Date.now(),
        });
      }
    }

    // Remove tag from all folders
    const folders = await ctx.db
      .query("invoiceFolders")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    for (const folder of folders) {
      if (folder.tags?.includes(args.tagId)) {
        await ctx.db.patch(folder._id, {
          tags: folder.tags.filter((t) => t !== args.tagId),
          updatedAt: Date.now(),
        });
      }
    }

    return args.tagId;
  },
});

// Add tag to invoice
export const addTagToInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== user._id) {
      throw new Error("Invoice not found");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.userId !== user._id || tag.deletedAt) {
      throw new Error("Tag not found");
    }

    if (tag.type === "folder") {
      throw new Error("This tag can only be used for folders");
    }

    const currentTags = invoice.tags || [];
    if (!currentTags.includes(args.tagId)) {
      await ctx.db.patch(args.invoiceId, {
        tags: [...currentTags, args.tagId],
        updatedAt: Date.now(),
      });
    }

    return args.invoiceId;
  },
});

// Remove tag from invoice
export const removeTagFromInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== user._id) {
      throw new Error("Invoice not found");
    }

    const currentTags = invoice.tags || [];
    await ctx.db.patch(args.invoiceId, {
      tags: currentTags.filter((t) => t !== args.tagId),
      updatedAt: Date.now(),
    });

    return args.invoiceId;
  },
});

// Add tag to folder
export const addTagToFolder = mutation({
  args: {
    folderId: v.id("invoiceFolders"),
    tagId: v.id("tags"),
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

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.userId !== user._id || tag.deletedAt) {
      throw new Error("Tag not found");
    }

    if (tag.type === "invoice") {
      throw new Error("This tag can only be used for invoices");
    }

    const currentTags = folder.tags || [];
    if (!currentTags.includes(args.tagId)) {
      await ctx.db.patch(args.folderId, {
        tags: [...currentTags, args.tagId],
        updatedAt: Date.now(),
      });
    }

    return args.folderId;
  },
});

// Remove tag from folder
export const removeTagFromFolder = mutation({
  args: {
    folderId: v.id("invoiceFolders"),
    tagId: v.id("tags"),
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

    const currentTags = folder.tags || [];
    await ctx.db.patch(args.folderId, {
      tags: currentTags.filter((t) => t !== args.tagId),
      updatedAt: Date.now(),
    });

    return args.folderId;
  },
});

// Get invoices by tag
export const getInvoicesByTag = query({
  args: { tagId: v.id("tags") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    return invoices
      .filter((i) => !i.deletedAt && i.tags?.includes(args.tagId))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get folders by tag
export const getFoldersByTag = query({
  args: { tagId: v.id("tags") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const folders = await ctx.db
      .query("invoiceFolders")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    return folders.filter((f) => !f.deletedAt && f.tags?.includes(args.tagId));
  },
});
