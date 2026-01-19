import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

/**
 * Get the current authenticated user
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkId = identity.subject.includes("|")
      ? identity.subject.split("|")[1] ?? identity.subject
      : identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (user?.deletedAt) return null;

    return user;
  },
});

/**
 * Upsert user from Clerk webhook data
 */
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    clerkCreatedAt: v.number(),
    clerkUpdatedAt: v.number(),
    lastSignInAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const userData = {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      username: args.username,
      imageUrl: args.imageUrl,
      clerkCreatedAt: args.clerkCreatedAt,
      clerkUpdatedAt: args.clerkUpdatedAt,
      lastSignInAt: args.lastSignInAt,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, userData);
      return { userId: existing._id, action: "updated" as const };
    }

    const userId = await ctx.db.insert("users", userData);
    return { userId, action: "created" as const };
  },
});

/**
 * Soft delete user by Clerk ID
 */
export const softDelete = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return { success: true, message: "User not found" };
    }

    await ctx.db.patch(user._id, {
      deletedAt: Date.now(),
      syncedAt: Date.now(),
    });
    return { success: true, userId: user._id };
  },
});
