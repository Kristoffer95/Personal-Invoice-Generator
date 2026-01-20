import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateUserFromIdentity, getUserFromIdentityOrE2E } from "./users";

// Status validator (must match schema)
const statusValidator = v.union(
  v.literal("DRAFT"),
  v.literal("TO_SEND"),
  v.literal("SENT"),
  v.literal("PARTIAL_PAYMENT"),
  v.literal("PAID"),
  v.literal("OVERDUE"),
  v.literal("CANCELLED"),
  v.literal("REFUNDED")
);

// Create a status log entry (internal use - called from invoice mutations)
export const createStatusLog = mutation({
  args: {
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    folderId: v.optional(v.id("invoiceFolders")),
    folderName: v.optional(v.string()),
    previousStatus: v.optional(statusValidator),
    newStatus: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const nowStr = new Date().toISOString();

    const logId = await ctx.db.insert("statusLogs", {
      userId: user._id,
      invoiceId: args.invoiceId,
      invoiceNumber: args.invoiceNumber,
      folderId: args.folderId,
      folderName: args.folderName,
      previousStatus: args.previousStatus,
      newStatus: args.newStatus,
      notes: args.notes,
      changedAt: now,
      changedAtStr: nowStr,
    });

    return logId;
  },
});

// List status logs with filtering
export const listStatusLogs = query({
  args: {
    // Filtering options
    invoiceId: v.optional(v.id("invoices")),
    folderId: v.optional(v.id("invoiceFolders")),
    status: v.optional(statusValidator),
    searchQuery: v.optional(v.string()), // Search by invoice number or folder name
    dateFrom: v.optional(v.number()), // Unix timestamp
    dateTo: v.optional(v.number()), // Unix timestamp
    // Pagination
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // changedAt timestamp for pagination
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return { logs: [], nextCursor: null };
    }

    let logs;

    // Query based on filters - use most selective index
    if (args.invoiceId) {
      logs = await ctx.db
        .query("statusLogs")
        .withIndex("by_invoice_id", (q) => q.eq("invoiceId", args.invoiceId!))
        .collect();
      // Filter to ensure user owns the logs
      logs = logs.filter((log) => log.userId === user._id);
    } else if (args.folderId) {
      logs = await ctx.db
        .query("statusLogs")
        .withIndex("by_folder_id", (q) =>
          q.eq("userId", user._id).eq("folderId", args.folderId!)
        )
        .collect();
    } else {
      logs = await ctx.db
        .query("statusLogs")
        .withIndex("by_user_and_changed", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect();
    }

    // Apply additional filters
    let filteredLogs = logs;

    // Filter by status
    if (args.status) {
      filteredLogs = filteredLogs.filter((log) => log.newStatus === args.status);
    }

    // Filter by date range
    if (args.dateFrom !== undefined) {
      filteredLogs = filteredLogs.filter((log) => log.changedAt >= args.dateFrom!);
    }
    if (args.dateTo !== undefined) {
      filteredLogs = filteredLogs.filter((log) => log.changedAt <= args.dateTo!);
    }

    // Search by invoice number or folder name
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.invoiceNumber.toLowerCase().includes(query) ||
          (log.folderName && log.folderName.toLowerCase().includes(query))
      );
    }

    // Apply cursor-based pagination
    if (args.cursor !== undefined) {
      filteredLogs = filteredLogs.filter((log) => log.changedAt < args.cursor!);
    }

    // Sort by changedAt descending (most recent first)
    const sortedLogs = filteredLogs.sort((a, b) => b.changedAt - a.changedAt);

    // Apply limit
    const limit = args.limit ?? 50;
    const paginatedLogs = sortedLogs.slice(0, limit + 1);

    // Determine if there are more results
    const hasMore = paginatedLogs.length > limit;
    const resultLogs = hasMore ? paginatedLogs.slice(0, limit) : paginatedLogs;
    const nextCursor = hasMore && resultLogs.length > 0
      ? resultLogs[resultLogs.length - 1].changedAt
      : null;

    return {
      logs: resultLogs,
      nextCursor,
    };
  },
});

// Get status logs for a specific invoice
export const getInvoiceStatusLogs = query({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const logs = await ctx.db
      .query("statusLogs")
      .withIndex("by_invoice_id", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    // Security: Ensure logs belong to user
    const userLogs = logs.filter((log) => log.userId === user._id);

    // Sort by changedAt descending (most recent first)
    return userLogs.sort((a, b) => b.changedAt - a.changedAt);
  },
});

// Get status log statistics
export const getStatusLogStats = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return {
        totalChanges: 0,
        byStatus: {},
        recentActivity: [],
      };
    }

    let logs = await ctx.db
      .query("statusLogs")
      .withIndex("by_user_and_changed", (q) => q.eq("userId", user._id))
      .collect();

    // Apply date filters
    if (args.dateFrom !== undefined) {
      logs = logs.filter((log) => log.changedAt >= args.dateFrom!);
    }
    if (args.dateTo !== undefined) {
      logs = logs.filter((log) => log.changedAt <= args.dateTo!);
    }

    // Calculate statistics
    const byStatus: Record<string, number> = {};
    for (const log of logs) {
      byStatus[log.newStatus] = (byStatus[log.newStatus] || 0) + 1;
    }

    // Get recent activity (last 10 changes)
    const recentActivity = logs
      .sort((a, b) => b.changedAt - a.changedAt)
      .slice(0, 10);

    return {
      totalChanges: logs.length,
      byStatus,
      recentActivity,
    };
  },
});

// Delete status logs for an invoice (cleanup when invoice is deleted)
export const deleteLogsForInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const logs = await ctx.db
      .query("statusLogs")
      .withIndex("by_invoice_id", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    // Security: Only delete logs owned by the user
    const userLogs = logs.filter((log) => log.userId === user._id);

    for (const log of userLogs) {
      await ctx.db.delete(log._id);
    }

    return userLogs.length;
  },
});
