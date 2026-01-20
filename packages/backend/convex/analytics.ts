import { v } from "convex/values";
import { query } from "./_generated/server";
import { getUserFromIdentityOrE2E } from "./users";
import type { Id, Doc } from "./_generated/dataModel";

type Invoice = Doc<"invoices">;
type InvoiceFolder = Doc<"invoiceFolders">;

// Analytics for a single folder
export const getFolderAnalytics = query({
  args: { folderId: v.id("invoiceFolders") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id || folder.deletedAt) {
      return null;
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_folder_id", (q) => q.eq("folderId", args.folderId))
      .collect();

    const activeInvoices = invoices.filter(
      (i) => i.userId === user._id && !i.deletedAt && !i.isArchived
    );

    return calculateAnalytics(activeInvoices, folder);
  },
});

// Analytics for all folders grouped
export const getAllFoldersAnalytics = query({
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

    const analytics = await Promise.all(
      activeFolders.map(async (folder) => {
        const invoices = await ctx.db
          .query("invoices")
          .withIndex("by_folder_id", (q) => q.eq("folderId", folder._id))
          .collect();

        const activeInvoices = invoices.filter(
          (i) => i.userId === user._id && !i.deletedAt && !i.isArchived
        );

        return calculateAnalytics(activeInvoices, folder);
      })
    );

    return analytics;
  },
});

// Global analytics (all invoices)
export const getGlobalAnalytics = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const activeInvoices = args.includeArchived
      ? invoices.filter((i) => !i.deletedAt)
      : invoices.filter((i) => !i.deletedAt && !i.isArchived);

    return calculateAnalytics(activeInvoices, null);
  },
});

// Analytics for unfiled invoices
export const getUnfiledAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_folder_id", (q) => q.eq("folderId", undefined))
      .collect();

    const activeInvoices = invoices.filter(
      (i) => i.userId === user._id && !i.deletedAt && !i.isArchived
    );

    return calculateAnalytics(activeInvoices, null);
  },
});

// Analytics by status
export const getAnalyticsByStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return {};
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const activeInvoices = invoices.filter((i) => !i.deletedAt && !i.isArchived);

    const statusGroups: Record<string, Invoice[]> = {};
    for (const invoice of activeInvoices) {
      if (!statusGroups[invoice.status]) {
        statusGroups[invoice.status] = [];
      }
      statusGroups[invoice.status].push(invoice);
    }

    const analytics: Record<
      string,
      {
        count: number;
        totalAmount: number;
        totalHours: number;
        averageAmount: number;
      }
    > = {};

    for (const [status, statusInvoices] of Object.entries(statusGroups)) {
      const totalAmount = statusInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const totalHours = statusInvoices.reduce((sum, i) => sum + i.totalHours, 0);

      analytics[status] = {
        count: statusInvoices.length,
        totalAmount,
        totalHours,
        averageAmount: statusInvoices.length > 0 ? totalAmount / statusInvoices.length : 0,
      };
    }

    return analytics;
  },
});

// Analytics by client (to.name)
export const getAnalyticsByClient = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const activeInvoices = invoices.filter((i) => !i.deletedAt && !i.isArchived);

    const clientGroups: Record<string, Invoice[]> = {};
    for (const invoice of activeInvoices) {
      const clientName = invoice.to.name || "Unknown";
      if (!clientGroups[clientName]) {
        clientGroups[clientName] = [];
      }
      clientGroups[clientName].push(invoice);
    }

    const analytics = Object.entries(clientGroups)
      .map(([clientName, clientInvoices]) => {
        const totalAmount = clientInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalHours = clientInvoices.reduce((sum, i) => sum + i.totalHours, 0);
        const paidAmount = clientInvoices
          .filter((i) => i.status === "PAID")
          .reduce((sum, i) => sum + i.totalAmount, 0);
        const pendingAmount = clientInvoices
          .filter((i) => !["PAID", "CANCELLED", "REFUNDED"].includes(i.status))
          .reduce((sum, i) => sum + i.totalAmount, 0);

        return {
          clientName,
          invoiceCount: clientInvoices.length,
          totalAmount,
          totalHours,
          paidAmount,
          pendingAmount,
          averageAmount: clientInvoices.length > 0 ? totalAmount / clientInvoices.length : 0,
          lastInvoiceDate: clientInvoices.reduce(
            (latest, i) => (i.issueDate > latest ? i.issueDate : latest),
            ""
          ),
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return analytics;
  },
});

// Analytics by time period (monthly)
export const getMonthlyAnalytics = query({
  args: {
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const targetYear = args.year ?? new Date().getFullYear();

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const activeInvoices = invoices.filter((i) => !i.deletedAt && !i.isArchived);

    const monthlyData: Record<
      string,
      {
        invoiced: number;
        paid: number;
        hours: number;
        count: number;
      }
    > = {};

    // Initialize all months
    for (let month = 1; month <= 12; month++) {
      const key = `${targetYear}-${month.toString().padStart(2, "0")}`;
      monthlyData[key] = { invoiced: 0, paid: 0, hours: 0, count: 0 };
    }

    for (const invoice of activeInvoices) {
      const issueDate = new Date(invoice.issueDate);
      if (issueDate.getFullYear() === targetYear) {
        const monthKey = `${targetYear}-${(issueDate.getMonth() + 1).toString().padStart(2, "0")}`;
        monthlyData[monthKey].invoiced += invoice.totalAmount;
        monthlyData[monthKey].hours += invoice.totalHours;
        monthlyData[monthKey].count += 1;
        if (invoice.status === "PAID") {
          monthlyData[monthKey].paid += invoice.totalAmount;
        }
      }
    }

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  },
});

// Helper function to calculate analytics
function calculateAnalytics(
  invoices: Invoice[],
  folder: InvoiceFolder | null
): {
  folderId: Id<"invoiceFolders"> | null;
  folderName: string | null;
  invoiceCount: number;
  totalAmount: number;
  totalHours: number;
  totalDays: number;
  averageAmount: number;
  averageHoursPerInvoice: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  draftCount: number;
  sentCount: number;
  paidCount: number;
  overdueCount: number;
  currencyBreakdown: Record<string, { count: number; total: number }>;
  clientBreakdown: Record<string, { count: number; total: number }>;
  oldestInvoiceDate: string | null;
  newestInvoiceDate: string | null;
} {
  const totalAmount = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalHours = invoices.reduce((sum, i) => sum + i.totalHours, 0);
  const totalDays = invoices.reduce((sum, i) => sum + i.totalDays, 0);

  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const pendingInvoices = invoices.filter((i) =>
    ["TO_SEND", "SENT", "VIEWED", "PAYMENT_PENDING", "PARTIAL_PAYMENT"].includes(i.status)
  );
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");
  const draftInvoices = invoices.filter((i) => i.status === "DRAFT");
  const sentInvoices = invoices.filter((i) =>
    ["SENT", "VIEWED", "PAYMENT_PENDING"].includes(i.status)
  );

  // Currency breakdown
  const currencyBreakdown: Record<string, { count: number; total: number }> = {};
  for (const invoice of invoices) {
    if (!currencyBreakdown[invoice.currency]) {
      currencyBreakdown[invoice.currency] = { count: 0, total: 0 };
    }
    currencyBreakdown[invoice.currency].count += 1;
    currencyBreakdown[invoice.currency].total += invoice.totalAmount;
  }

  // Client breakdown
  const clientBreakdown: Record<string, { count: number; total: number }> = {};
  for (const invoice of invoices) {
    const clientName = invoice.to.name || "Unknown";
    if (!clientBreakdown[clientName]) {
      clientBreakdown[clientName] = { count: 0, total: 0 };
    }
    clientBreakdown[clientName].count += 1;
    clientBreakdown[clientName].total += invoice.totalAmount;
  }

  // Date range
  const dates = invoices.map((i) => i.issueDate).sort();

  return {
    folderId: folder?._id ?? null,
    folderName: folder?.name ?? null,
    invoiceCount: invoices.length,
    totalAmount,
    totalHours,
    totalDays,
    averageAmount: invoices.length > 0 ? totalAmount / invoices.length : 0,
    averageHoursPerInvoice: invoices.length > 0 ? totalHours / invoices.length : 0,
    paidAmount: paidInvoices.reduce((sum, i) => sum + i.totalAmount, 0),
    pendingAmount: pendingInvoices.reduce((sum, i) => sum + i.totalAmount, 0),
    overdueAmount: overdueInvoices.reduce((sum, i) => sum + i.totalAmount, 0),
    draftCount: draftInvoices.length,
    sentCount: sentInvoices.length,
    paidCount: paidInvoices.length,
    overdueCount: overdueInvoices.length,
    currencyBreakdown,
    clientBreakdown,
    oldestInvoiceDate: dates[0] ?? null,
    newestInvoiceDate: dates[dates.length - 1] ?? null,
  };
}
