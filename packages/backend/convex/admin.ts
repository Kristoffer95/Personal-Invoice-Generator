import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./users";

/**
 * User stats aggregated from their data
 */
export type UserStats = {
  invoiceCount: number;
  folderCount: number;
  templateCount: number;
  pdfExportCount: number;
  lastActivity: number | null;
};

/**
 * User with stats for admin users list
 */
export type UserWithStats = Doc<"users"> & {
  stats: UserStats;
};

/**
 * List all users with their activity stats (admin only).
 * Returns paginated user list with stats.
 */
export const listAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp for pagination
  },
  handler: async (ctx, args): Promise<{ users: UserWithStats[]; nextCursor: number | null }> => {
    // Check admin access
    await requireAdmin(ctx);

    const limit = args.limit ?? 50;

    // Get all non-deleted users sorted by creation time
    let users = await ctx.db
      .query("users")
      .order("desc")
      .collect();

    // Filter out deleted users
    users = users.filter((u) => !u.deletedAt);

    // Apply cursor-based pagination
    if (args.cursor) {
      users = users.filter((u) => u.clerkCreatedAt < args.cursor!);
    }

    // Check if there are more results
    const hasMore = users.length > limit;
    users = users.slice(0, limit);

    // Get next cursor
    const nextCursor = hasMore && users.length > 0
      ? users[users.length - 1].clerkCreatedAt
      : null;

    // Fetch stats for each user
    const usersWithStats: UserWithStats[] = await Promise.all(
      users.map(async (user) => {
        // Get invoice count
        const invoices = await ctx.db
          .query("invoices")
          .withIndex("by_user_id", (q) => q.eq("userId", user._id))
          .collect();
        const activeInvoices = invoices.filter((i) => !i.deletedAt);

        // Get folder count
        const folders = await ctx.db
          .query("invoiceFolders")
          .withIndex("by_user_id", (q) => q.eq("userId", user._id))
          .collect();
        const activeFolders = folders.filter((f) => !f.deletedAt);

        // Get template count
        const templates = await ctx.db
          .query("templates")
          .withIndex("by_user_id", (q) => q.eq("userId", user._id))
          .collect();
        const activeTemplates = templates.filter((t) => !t.deletedAt);

        // Get PDF export count and last activity
        const activities = await ctx.db
          .query("activityLogs")
          .withIndex("by_user_and_timestamp", (q) => q.eq("userId", user._id))
          .order("desc")
          .collect();

        const pdfExportCount = activities.filter(
          (a) => a.eventType === "PDF_EXPORT"
        ).length;

        const lastActivity = activities.length > 0 ? activities[0].timestamp : null;

        return {
          ...user,
          stats: {
            invoiceCount: activeInvoices.length,
            folderCount: activeFolders.length,
            templateCount: activeTemplates.length,
            pdfExportCount,
            lastActivity,
          },
        };
      })
    );

    return { users: usersWithStats, nextCursor };
  },
});

/**
 * Get detailed analytics for a single user (admin only).
 */
export const getUserAnalytics = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check admin access
    await requireAdmin(ctx);

    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user || user.deletedAt) {
      return null;
    }

    // Get invoice count and total revenue
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    const activeInvoices = invoices.filter((i) => !i.deletedAt);

    // Calculate revenue from paid invoices
    const paidInvoices = activeInvoices.filter((i) => i.status === "PAID");
    const totalRevenue = paidInvoices.reduce((sum, inv) => {
      // Group by currency for accurate totals
      return sum + inv.totalAmount;
    }, 0);

    // Revenue by currency
    const revenueByCurrency: Record<string, number> = {};
    for (const inv of paidInvoices) {
      revenueByCurrency[inv.currency] =
        (revenueByCurrency[inv.currency] || 0) + inv.totalAmount;
    }

    // Invoice counts by status
    const invoicesByStatus: Record<string, number> = {};
    for (const inv of activeInvoices) {
      invoicesByStatus[inv.status] = (invoicesByStatus[inv.status] || 0) + 1;
    }

    // Get folder count
    const folders = await ctx.db
      .query("invoiceFolders")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    const activeFolders = folders.filter((f) => !f.deletedAt);

    // Get template count
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    const activeTemplates = templates.filter((t) => !t.deletedAt);

    // Get client count
    const clients = await ctx.db
      .query("clientProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    const activeClients = clients.filter((c) => !c.deletedAt);

    // Get activity counts
    const activities = await ctx.db
      .query("activityLogs")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", args.userId))
      .collect();

    const activityCounts: Record<string, number> = {};
    for (const activity of activities) {
      activityCounts[activity.eventType] =
        (activityCounts[activity.eventType] || 0) + 1;
    }

    const pdfExportCount = activityCounts["PDF_EXPORT"] ?? 0;
    const lastActivity = activities.length > 0
      ? Math.max(...activities.map((a) => a.timestamp))
      : null;

    // Get user profile if exists
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    return {
      user,
      userProfile,
      stats: {
        invoiceCount: activeInvoices.length,
        folderCount: activeFolders.length,
        templateCount: activeTemplates.length,
        clientCount: activeClients.length,
        pdfExportCount,
        lastActivity,
        totalRevenue,
        revenueByCurrency,
        invoicesByStatus,
      },
      activityCounts,
    };
  },
});

/**
 * Get a user by ID (admin only).
 */
export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check admin access
    await requireAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user || user.deletedAt) {
      return null;
    }

    return user;
  },
});
