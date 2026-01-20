import { v } from "convex/values";
import { query, internalMutation, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// E2E Test user constants - only used in development
const E2E_TEST_CLERK_ID = "e2e_test_user_001";
const E2E_TEST_EMAIL = "e2e-test@invoice-generator.local";

/**
 * Extract clerkId from identity.subject
 * Clerk identity.subject may include prefixes like "oauth|" or "email|"
 */
export function extractClerkId(subject: string): string {
  return subject.includes("|")
    ? subject.split("|")[1] ?? subject
    : subject;
}

/**
 * Check if we're in E2E testing mode (no auth, development environment)
 * This allows E2E tests to run without authentication.
 *
 * Set E2E_TESTING=true in Convex environment variables to enable.
 * In Convex dashboard: Settings > Environment Variables > Add E2E_TESTING=true
 */
function isE2ETestingMode(): boolean {
  // Check if E2E_TESTING environment variable is set in Convex
  return process.env.E2E_TESTING === "true";
}

/**
 * Get or create E2E test user for unauthenticated testing scenarios.
 * Only works in development mode.
 */
async function getOrCreateE2ETestUser(
  ctx: MutationCtx
): Promise<{ _id: Id<"users"> } | null> {
  if (!isE2ETestingMode()) {
    return null;
  }

  // Try to find existing E2E test user
  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", E2E_TEST_CLERK_ID))
    .first();

  // If user doesn't exist, create them
  if (!user) {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId: E2E_TEST_CLERK_ID,
      email: E2E_TEST_EMAIL,
      firstName: "E2E",
      lastName: "Test User",
      username: "e2e_test",
      clerkCreatedAt: now,
      clerkUpdatedAt: now,
      syncedAt: now,
    });
    user = await ctx.db.get(userId);
  }

  if (user?.deletedAt) {
    return null;
  }

  return user ? { _id: user._id } : null;
}

/**
 * Get E2E test user for query context (read-only).
 */
async function getE2ETestUserForQuery(
  ctx: QueryCtx
): Promise<{ _id: Id<"users"> } | null> {
  if (!isE2ETestingMode()) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", E2E_TEST_CLERK_ID))
    .first();

  if (!user || user.deletedAt) {
    return null;
  }

  return { _id: user._id };
}

/**
 * Get or create user from authenticated identity.
 * This ensures users are auto-provisioned on first action if webhook hasn't fired yet.
 * Falls back to E2E test user in development when no auth is present.
 */
export async function getOrCreateUserFromIdentity(
  ctx: MutationCtx
): Promise<{ _id: Id<"users"> } | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    // Fallback to E2E test user in development mode
    return getOrCreateE2ETestUser(ctx);
  }

  const clerkId = extractClerkId(identity.subject);

  // Try to find existing user
  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first();

  // If user doesn't exist, create them from the JWT claims
  if (!user) {
    const email = identity.email ?? "";

    // Check for email uniqueness if email exists
    if (email) {
      const userWithEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (userWithEmail && userWithEmail.clerkId !== clerkId) {
        throw new Error(`Email ${email} is already in use by another account`);
      }
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId,
      email,
      firstName: identity.givenName ?? undefined,
      lastName: identity.familyName ?? undefined,
      username: identity.nickname ?? undefined,
      imageUrl: identity.pictureUrl ?? undefined,
      clerkCreatedAt: now,
      clerkUpdatedAt: now,
      syncedAt: now,
    });

    user = await ctx.db.get(userId);
  }

  // Return null if user is deleted
  if (user?.deletedAt) {
    return null;
  }

  return user ? { _id: user._id } : null;
}

/**
 * Get user from identity or E2E test user for queries (read-only context).
 * Use this in query handlers to get the current user.
 */
export async function getUserFromIdentityOrE2E(
  ctx: QueryCtx
): Promise<{ _id: Id<"users"> } | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    // Fallback to E2E test user in development mode
    return getE2ETestUserForQuery(ctx);
  }

  const clerkId = extractClerkId(identity.subject);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first();

  if (!user || user.deletedAt) {
    return null;
  }

  return { _id: user._id };
}

/**
 * Ensure current user exists (creates if needed).
 * This allows frontend to trigger user provisioning.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    return user ? { userId: user._id } : null;
  },
});

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

    // Check for email uniqueness - ensure no other user has this email
    const userWithEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (userWithEmail && userWithEmail.clerkId !== args.clerkId) {
      throw new Error(
        `Email ${args.email} is already in use by another account`
      );
    }

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
