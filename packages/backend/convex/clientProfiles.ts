import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateUserFromIdentity, getUserFromIdentityOrE2E } from "./users";

// List all client profiles for the current user
export const listClients = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const clients = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    return clients.filter((c) => !c.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get a single client profile by ID
export const getClient = query({
  args: { clientId: v.id("clientProfiles") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    const client = await ctx.db.get(args.clientId);

    if (!client || client.userId !== user._id || client.deletedAt) {
      return null;
    }

    return client;
  },
});

// Search clients by name
export const searchClients = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const clients = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const searchLower = args.query.toLowerCase();
    return clients
      .filter(
        (c) =>
          !c.deletedAt &&
          (c.name.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Create a new client profile
export const createClient = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    taxId: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const clientId = await ctx.db.insert("clientProfiles", {
      userId: user._id,
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return clientId;
  },
});

// Update a client profile
export const updateClient = mutation({
  args: {
    clientId: v.id("clientProfiles"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    taxId: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== user._id) {
      throw new Error("Client not found");
    }

    const { clientId, ...updates } = args;
    await ctx.db.patch(clientId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return clientId;
  },
});

// Soft delete a client profile
export const removeClient = mutation({
  args: { clientId: v.id("clientProfiles") },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== user._id) {
      throw new Error("Client not found");
    }

    await ctx.db.patch(args.clientId, { deletedAt: Date.now() });

    return args.clientId;
  },
});

// Create or update client from invoice "To" info
export const upsertFromInvoice = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    taxId: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check if client with same name exists
    const existingClients = await ctx.db
      .query("clientProfiles")
      .withIndex("by_name", (q) => q.eq("userId", user._id).eq("name", args.name))
      .collect();

    const existingClient = existingClients.find((c) => !c.deletedAt);

    const now = Date.now();

    if (existingClient) {
      // Update existing client
      await ctx.db.patch(existingClient._id, {
        ...args,
        updatedAt: now,
      });
      return existingClient._id;
    } else {
      // Create new client
      const clientId = await ctx.db.insert("clientProfiles", {
        userId: user._id,
        ...args,
        createdAt: now,
        updatedAt: now,
      });
      return clientId;
    }
  },
});
