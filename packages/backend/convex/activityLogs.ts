import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isAdmin, getOrCreateUserFromIdentity } from "./users";

// Activity event types
export type ActivityEventType =
  | "PDF_EXPORT"
  | "INVOICE_CREATE"
  | "INVOICE_UPDATE"
  | "INVOICE_DELETE"
  | "INVOICE_STATUS_CHANGE"
  | "INVOICE_ARCHIVE"
  | "INVOICE_UNARCHIVE"
  | "INVOICE_DUPLICATE"
  | "INVOICE_MOVE"
  | "FOLDER_CREATE"
  | "FOLDER_UPDATE"
  | "FOLDER_DELETE"
  | "FOLDER_MOVE"
  | "TEMPLATE_CREATE"
  | "TEMPLATE_UPDATE"
  | "TEMPLATE_DELETE"
  | "TEMPLATE_DUPLICATE"
  | "CLIENT_CREATE"
  | "CLIENT_UPDATE"
  | "CLIENT_DELETE"
  | "USER_PROFILE_UPDATE";

// Target types for activity logs
export type ActivityTargetType =
  | "invoice"
  | "folder"
  | "template"
  | "client"
  | "user_profile";

// Event type validator
const eventTypeValidator = v.union(
  v.literal("PDF_EXPORT"),
  v.literal("INVOICE_CREATE"),
  v.literal("INVOICE_UPDATE"),
  v.literal("INVOICE_DELETE"),
  v.literal("INVOICE_STATUS_CHANGE"),
  v.literal("INVOICE_ARCHIVE"),
  v.literal("INVOICE_UNARCHIVE"),
  v.literal("INVOICE_DUPLICATE"),
  v.literal("INVOICE_MOVE"),
  v.literal("FOLDER_CREATE"),
  v.literal("FOLDER_UPDATE"),
  v.literal("FOLDER_DELETE"),
  v.literal("FOLDER_MOVE"),
  v.literal("TEMPLATE_CREATE"),
  v.literal("TEMPLATE_UPDATE"),
  v.literal("TEMPLATE_DELETE"),
  v.literal("TEMPLATE_DUPLICATE"),
  v.literal("CLIENT_CREATE"),
  v.literal("CLIENT_UPDATE"),
  v.literal("CLIENT_DELETE"),
  v.literal("USER_PROFILE_UPDATE")
);

// Target type validator
const targetTypeValidator = v.union(
  v.literal("invoice"),
  v.literal("folder"),
  v.literal("template"),
  v.literal("client"),
  v.literal("user_profile")
);

/**
 * Internal mutation to log an activity
 * This is used by other mutations to record user actions
 */
export const logActivity = internalMutation({
  args: {
    userId: v.id("users"),
    eventType: eventTypeValidator,
    targetType: targetTypeValidator,
    targetId: v.optional(v.string()),
    targetName: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("activityLogs", {
      userId: args.userId,
      eventType: args.eventType,
      targetType: args.targetType,
      targetId: args.targetId,
      targetName: args.targetName,
      metadata: args.metadata,
      timestamp: Date.now(),
    });

    return logId;
  },
});

/**
 * Public mutation to log a PDF export activity
 * Called from the frontend after a successful PDF export
 */
export const logPdfExport = mutation({
  args: {
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    templateName: v.optional(v.string()),
    templateId: v.optional(v.string()),
    theme: v.optional(v.string()),
    pageSize: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify the invoice belongs to the user
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== user._id) {
      throw new Error("Invoice not found");
    }

    const logId = await ctx.db.insert("activityLogs", {
      userId: user._id,
      eventType: "PDF_EXPORT",
      targetType: "invoice",
      targetId: args.invoiceId,
      targetName: args.invoiceNumber,
      metadata: {
        invoiceNumber: args.invoiceNumber,
        templateName: args.templateName,
        templateId: args.templateId,
        theme: args.theme,
        pageSize: args.pageSize,
        clientName: invoice.to.name,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
      },
      timestamp: Date.now(),
    });

    return logId;
  },
});

/**
 * Query to list all activities for admin users
 * Supports pagination and filtering by event type
 */
export const listAllActivities = query({
  args: {
    eventType: v.optional(eventTypeValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // timestamp for pagination
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const adminCheck = await isAdmin(ctx);
    if (!adminCheck) {
      return { activities: [], nextCursor: null };
    }

    const limit = args.limit ?? 50;

    let activitiesQuery;
    if (args.eventType) {
      activitiesQuery = ctx.db
        .query("activityLogs")
        .withIndex("by_event_type", (q) => q.eq("eventType", args.eventType!));
    } else {
      activitiesQuery = ctx.db
        .query("activityLogs")
        .withIndex("by_timestamp");
    }

    let activities = await activitiesQuery.order("desc").collect();

    // Apply cursor-based pagination
    if (args.cursor) {
      activities = activities.filter((a) => a.timestamp < args.cursor!);
    }

    // Limit results
    const hasMore = activities.length > limit;
    activities = activities.slice(0, limit);

    // Get next cursor
    const nextCursor = hasMore && activities.length > 0
      ? activities[activities.length - 1].timestamp
      : null;

    return { activities, nextCursor };
  },
});

/**
 * Query to list activities for a specific user (admin only)
 */
export const listUserActivities = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const adminCheck = await isAdmin(ctx);
    if (!adminCheck) {
      return { activities: [], nextCursor: null };
    }

    const limit = args.limit ?? 50;

    let activities = await ctx.db
      .query("activityLogs")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Apply cursor-based pagination
    if (args.cursor) {
      activities = activities.filter((a) => a.timestamp < args.cursor!);
    }

    // Limit results
    const hasMore = activities.length > limit;
    activities = activities.slice(0, limit);

    // Get next cursor
    const nextCursor = hasMore && activities.length > 0
      ? activities[activities.length - 1].timestamp
      : null;

    return { activities, nextCursor };
  },
});

/**
 * Query to get activity counts by event type (admin only)
 * Useful for dashboard analytics
 */
export const getActivityCounts = query({
  args: {
    userId: v.optional(v.id("users")), // Filter by user if provided
    since: v.optional(v.number()), // Unix timestamp to filter from
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const adminCheck = await isAdmin(ctx);
    if (!adminCheck) {
      return {};
    }

    let activities;
    if (args.userId) {
      activities = await ctx.db
        .query("activityLogs")
        .withIndex("by_user_and_timestamp", (q) => q.eq("userId", args.userId!))
        .collect();
    } else {
      activities = await ctx.db
        .query("activityLogs")
        .withIndex("by_timestamp")
        .collect();
    }

    // Filter by timestamp if provided
    if (args.since) {
      activities = activities.filter((a) => a.timestamp >= args.since!);
    }

    // Count by event type
    const counts: Record<string, number> = {};
    for (const activity of activities) {
      counts[activity.eventType] = (counts[activity.eventType] || 0) + 1;
    }

    return counts;
  },
});

// Helper function type for logging activity from other modules
export type LogActivityParams = {
  userId: Id<"users">;
  eventType: ActivityEventType;
  targetType: ActivityTargetType;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
};
