import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateUserFromIdentity, getUserFromIdentityOrE2E } from "./users";

// Shared validators
const partyInfoValidator = v.object({
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
});

const bankDetailsValidator = v.object({
  bankName: v.optional(v.string()),
  accountName: v.optional(v.string()),
  accountNumber: v.optional(v.string()),
  routingNumber: v.optional(v.string()),
  swiftCode: v.optional(v.string()),
  iban: v.optional(v.string()),
});

const dailyWorkHoursValidator = v.object({
  date: v.string(),
  hours: v.number(),
  isWorkday: v.boolean(),
  notes: v.optional(v.string()),
});

const lineItemValidator = v.object({
  id: v.string(),
  description: v.string(),
  quantity: v.number(),
  unitPrice: v.number(),
  amount: v.number(),
});

const statusValidator = v.union(
  v.literal("DRAFT"),
  v.literal("SENT"),
  v.literal("PAID"),
  v.literal("OVERDUE"),
  v.literal("CANCELLED")
);

const currencyValidator = v.union(
  v.literal("USD"),
  v.literal("EUR"),
  v.literal("GBP"),
  v.literal("PHP"),
  v.literal("JPY"),
  v.literal("AUD"),
  v.literal("CAD"),
  v.literal("SGD")
);

const paymentTermsValidator = v.union(
  v.literal("DUE_ON_RECEIPT"),
  v.literal("NET_7"),
  v.literal("NET_15"),
  v.literal("NET_30"),
  v.literal("NET_45"),
  v.literal("NET_60"),
  v.literal("CUSTOM")
);

const pageSizeValidator = v.union(
  v.literal("A4"),
  v.literal("LETTER"),
  v.literal("LEGAL"),
  v.literal("LONG"),
  v.literal("SHORT"),
  v.literal("A5"),
  v.literal("B5")
);

const pdfThemeValidator = v.union(v.literal("light"), v.literal("dark"));

// List all invoices for the current user
export const listInvoices = query({
  args: {
    folderId: v.optional(v.id("invoiceFolders")),
    status: v.optional(statusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    let invoices;

    if (args.folderId !== undefined) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_folder_id", (q) => q.eq("folderId", args.folderId))
        .collect();
      // Filter by user
      invoices = invoices.filter((i) => i.userId === user._id);
    } else if (args.status) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", user._id).eq("status", args.status!)
        )
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_user_id", (q) => q.eq("userId", user._id))
        .collect();
    }

    // Filter out soft-deleted invoices and sort by created date
    const activeInvoices = invoices
      .filter((i) => !i.deletedAt)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      return activeInvoices.slice(0, args.limit);
    }

    return activeInvoices;
  },
});

// Get recent invoices
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_and_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 10);

    return invoices.filter((i) => !i.deletedAt);
  },
});

// Get a single invoice by ID
export const getInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    const invoice = await ctx.db.get(args.invoiceId);

    // Security: Ensure invoice belongs to user
    if (!invoice || invoice.userId !== user._id || invoice.deletedAt) {
      return null;
    }

    return invoice;
  },
});

// Create a new invoice
export const createInvoice = mutation({
  args: {
    folderId: v.optional(v.id("invoiceFolders")),
    invoiceNumber: v.string(),
    status: statusValidator,
    issueDate: v.string(),
    dueDate: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    from: partyInfoValidator,
    to: partyInfoValidator,
    hourlyRate: v.number(),
    defaultHoursPerDay: v.number(),
    dailyWorkHours: v.array(dailyWorkHoursValidator),
    totalDays: v.number(),
    totalHours: v.number(),
    subtotal: v.number(),
    lineItems: v.array(lineItemValidator),
    discountPercent: v.number(),
    discountAmount: v.number(),
    taxPercent: v.number(),
    taxAmount: v.number(),
    totalAmount: v.number(),
    currency: currencyValidator,
    paymentTerms: paymentTermsValidator,
    customPaymentTerms: v.optional(v.string()),
    bankDetails: v.optional(bankDetailsValidator),
    notes: v.optional(v.string()),
    terms: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    showDetailedHours: v.boolean(),
    pdfTheme: pdfThemeValidator,
    backgroundDesignId: v.optional(v.string()),
    pageSize: pageSizeValidator,
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify folder belongs to user if provided
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== user._id) {
        throw new Error("Folder not found");
      }
    }

    const now = Date.now();
    const invoiceId = await ctx.db.insert("invoices", {
      userId: user._id,
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return invoiceId;
  },
});

// Update an invoice
export const updateInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
    folderId: v.optional(v.id("invoiceFolders")),
    invoiceNumber: v.optional(v.string()),
    status: v.optional(statusValidator),
    issueDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    from: v.optional(partyInfoValidator),
    to: v.optional(partyInfoValidator),
    hourlyRate: v.optional(v.number()),
    defaultHoursPerDay: v.optional(v.number()),
    dailyWorkHours: v.optional(v.array(dailyWorkHoursValidator)),
    totalDays: v.optional(v.number()),
    totalHours: v.optional(v.number()),
    subtotal: v.optional(v.number()),
    lineItems: v.optional(v.array(lineItemValidator)),
    discountPercent: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    taxPercent: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    totalAmount: v.optional(v.number()),
    currency: v.optional(currencyValidator),
    paymentTerms: v.optional(paymentTermsValidator),
    customPaymentTerms: v.optional(v.string()),
    bankDetails: v.optional(bankDetailsValidator),
    notes: v.optional(v.string()),
    terms: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    showDetailedHours: v.optional(v.boolean()),
    pdfTheme: v.optional(pdfThemeValidator),
    backgroundDesignId: v.optional(v.string()),
    pageSize: v.optional(pageSizeValidator),
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== user._id) {
      throw new Error("Invoice not found");
    }

    // Verify new folder if provided
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== user._id) {
        throw new Error("Folder not found");
      }
    }

    const { invoiceId, ...updates } = args;
    await ctx.db.patch(invoiceId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return invoiceId;
  },
});

// Soft delete an invoice
export const removeInvoice = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== user._id) {
      throw new Error("Invoice not found");
    }

    await ctx.db.patch(args.invoiceId, { deletedAt: Date.now() });

    return args.invoiceId;
  },
});

// Duplicate an invoice (for quick creation based on existing)
export const duplicateInvoice = mutation({
  args: {
    sourceInvoiceId: v.id("invoices"),
    newInvoiceNumber: v.string(),
    folderId: v.optional(v.id("invoiceFolders")),
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const sourceInvoice = await ctx.db.get(args.sourceInvoiceId);
    if (!sourceInvoice || sourceInvoice.userId !== user._id) {
      throw new Error("Source invoice not found");
    }

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, _creationTime, createdAt, updatedAt, deletedAt, ...invoiceData } =
      sourceInvoice;

    const newInvoiceId = await ctx.db.insert("invoices", {
      ...invoiceData,
      invoiceNumber: args.newInvoiceNumber,
      folderId: args.folderId ?? sourceInvoice.folderId,
      status: "DRAFT",
      issueDate: today,
      // Clear work hours for fresh entry
      dailyWorkHours: [],
      totalDays: 0,
      totalHours: 0,
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return newInvoiceId;
  },
});

// Move invoice to folder
export const moveToFolder = mutation({
  args: {
    invoiceId: v.id("invoices"),
    folderId: v.optional(v.id("invoiceFolders")), // undefined = unfiled
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== user._id) {
      throw new Error("Invoice not found");
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== user._id) {
        throw new Error("Folder not found");
      }
    }

    await ctx.db.patch(args.invoiceId, {
      folderId: args.folderId,
      updatedAt: Date.now(),
    });

    return args.invoiceId;
  },
});

// Update invoice status
export const updateStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== user._id) {
      throw new Error("Invoice not found");
    }

    await ctx.db.patch(args.invoiceId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.invoiceId;
  },
});

// Get invoices by client name (for folder grouping)
export const getByClient = query({
  args: { clientName: v.string() },
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
      .filter(
        (i) =>
          !i.deletedAt &&
          i.to.name.toLowerCase().includes(args.clientName.toLowerCase())
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get unfiled invoices
export const getUnfiled = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_folder_id", (q) => q.eq("folderId", undefined))
      .collect();

    return invoices
      .filter((i) => i.userId === user._id && !i.deletedAt)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});
