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
  v.literal("TO_SEND"),
  v.literal("SENT"),
  v.literal("PARTIAL_PAYMENT"),
  v.literal("PAID"),
  v.literal("OVERDUE"),
  v.literal("CANCELLED"),
  v.literal("REFUNDED")
);

const statusChangeEventValidator = v.object({
  status: statusValidator,
  changedAt: v.string(),
  notes: v.optional(v.string()),
});

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

// Helper function to check if invoice number is unique within a folder
// Invoice numbers must be unique per user within the same folder
async function isInvoiceNumberUniqueInFolder(
  ctx: { db: { query: (table: string) => { withIndex: (indexName: string, indexFn: (q: { eq: (field: string, value: unknown) => unknown }) => unknown) => { collect: () => Promise<Array<{ invoiceNumber: string; deletedAt?: number; _id: string }>> } } } },
  userId: string,
  invoiceNumber: string,
  folderId: string | undefined,
  excludeInvoiceId?: string
): Promise<boolean> {
  // Query invoices by user
  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .collect();

  // Filter to find duplicates in the same folder
  const duplicates = invoices.filter(
    (i) =>
      i.invoiceNumber === invoiceNumber &&
      !i.deletedAt &&
      i._id !== excludeInvoiceId
  );

  // If no folderId, check against unfiled invoices only
  if (folderId === undefined) {
    return !duplicates.some((i) => (i as { folderId?: string }).folderId === undefined);
  }

  // Check against invoices in the same folder
  return !duplicates.some((i) => (i as { folderId?: string }).folderId === folderId);
}

// List all invoices for the current user with advanced filtering
export const listInvoices = query({
  args: {
    folderId: v.optional(v.id("invoiceFolders")),
    status: v.optional(statusValidator),
    statuses: v.optional(v.array(statusValidator)),
    isArchived: v.optional(v.boolean()),
    tags: v.optional(v.array(v.id("tags"))),
    clientName: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    amountMin: v.optional(v.number()),
    amountMax: v.optional(v.number()),
    searchQuery: v.optional(v.string()),
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

    // Apply filters
    let filteredInvoices = invoices.filter((i) => !i.deletedAt);

    // Filter by archived status (default: show non-archived)
    if (args.isArchived !== undefined) {
      filteredInvoices = filteredInvoices.filter(
        (i) => (i.isArchived ?? false) === args.isArchived
      );
    } else {
      // By default, don't show archived
      filteredInvoices = filteredInvoices.filter((i) => !i.isArchived);
    }

    // Filter by multiple statuses
    if (args.statuses && args.statuses.length > 0) {
      filteredInvoices = filteredInvoices.filter((i) =>
        args.statuses!.includes(i.status)
      );
    }

    // Filter by tags (invoice must have ALL specified tags)
    if (args.tags && args.tags.length > 0) {
      filteredInvoices = filteredInvoices.filter((i) =>
        args.tags!.every((tagId) => i.tags?.includes(tagId))
      );
    }

    // Filter by client name (partial match, case-insensitive)
    if (args.clientName) {
      const searchName = args.clientName.toLowerCase();
      filteredInvoices = filteredInvoices.filter((i) =>
        i.to.name.toLowerCase().includes(searchName)
      );
    }

    // Filter by date range
    if (args.dateFrom) {
      filteredInvoices = filteredInvoices.filter(
        (i) => i.issueDate >= args.dateFrom!
      );
    }
    if (args.dateTo) {
      filteredInvoices = filteredInvoices.filter(
        (i) => i.issueDate <= args.dateTo!
      );
    }

    // Filter by amount range
    if (args.amountMin !== undefined) {
      filteredInvoices = filteredInvoices.filter(
        (i) => i.totalAmount >= args.amountMin!
      );
    }
    if (args.amountMax !== undefined) {
      filteredInvoices = filteredInvoices.filter(
        (i) => i.totalAmount <= args.amountMax!
      );
    }

    // Search query (matches invoice number, client name, or job title)
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      filteredInvoices = filteredInvoices.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(query) ||
          i.to.name.toLowerCase().includes(query) ||
          (i.jobTitle && i.jobTitle.toLowerCase().includes(query))
      );
    }

    // Sort by created date descending
    const sortedInvoices = filteredInvoices.sort(
      (a, b) => b.createdAt - a.createdAt
    );

    if (args.limit) {
      return sortedInvoices.slice(0, args.limit);
    }

    return sortedInvoices;
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

// Check if an invoice number is available in a specific folder
// Used for real-time validation in the UI before creating/updating invoices
export const checkInvoiceNumberAvailable = query({
  args: {
    invoiceNumber: v.string(),
    folderId: v.optional(v.id("invoiceFolders")),
    excludeInvoiceId: v.optional(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return { available: false, error: "Unauthorized" };
    }

    const isUnique = await isInvoiceNumberUniqueInFolder(
      ctx as Parameters<typeof isInvoiceNumberUniqueInFolder>[0],
      user._id,
      args.invoiceNumber,
      args.folderId,
      args.excludeInvoiceId
    );

    return {
      available: isUnique,
      error: isUnique ? null : "Invoice number already exists in this folder",
    };
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
    tags: v.optional(v.array(v.id("tags"))),
    showDetailedHours: v.boolean(),
    pdfTheme: pdfThemeValidator,
    backgroundDesignId: v.optional(v.string()),
    pageSize: pageSizeValidator,
    // Option to auto-transition from DRAFT
    removeDraftOnSave: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== user._id) {
        throw new Error("Folder not found");
      }
    }

    // Validate tags if provided
    if (args.tags && args.tags.length > 0) {
      for (const tagId of args.tags) {
        const tag = await ctx.db.get(tagId);
        if (!tag || tag.userId !== user._id || tag.deletedAt) {
          throw new Error("Invalid tag");
        }
        if (tag.type === "folder") {
          throw new Error("Cannot use folder-only tag on invoice");
        }
      }
    }

    // Validate invoice number uniqueness within the folder
    const isUnique = await isInvoiceNumberUniqueInFolder(
      ctx as Parameters<typeof isInvoiceNumberUniqueInFolder>[0],
      user._id,
      args.invoiceNumber,
      args.folderId
    );
    if (!isUnique) {
      throw new Error(
        args.folderId
          ? "Invoice number already exists in this folder"
          : "Invoice number already exists in unfiled invoices"
      );
    }

    const now = Date.now();
    const nowStr = new Date().toISOString();

    // Determine final status - remove DRAFT if requested and status is DRAFT
    let finalStatus = args.status;
    if (args.removeDraftOnSave && args.status === "DRAFT") {
      finalStatus = "TO_SEND";
    }

    // Create initial status history
    const statusHistory = [
      {
        status: finalStatus,
        changedAt: nowStr,
        notes: "Invoice created",
      },
    ];

    const { removeDraftOnSave, ...invoiceData } = args;

    const invoiceId = await ctx.db.insert("invoices", {
      userId: user._id,
      ...invoiceData,
      status: finalStatus,
      statusHistory,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial status log entry
    let folderName: string | undefined;
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      folderName = folder?.name;
    }

    await ctx.db.insert("statusLogs", {
      userId: user._id,
      invoiceId,
      invoiceNumber: args.invoiceNumber,
      folderId: args.folderId,
      folderName,
      previousStatus: undefined,
      newStatus: finalStatus,
      notes: "Invoice created",
      changedAt: now,
      changedAtStr: nowStr,
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
    tags: v.optional(v.array(v.id("tags"))),
    showDetailedHours: v.optional(v.boolean()),
    pdfTheme: v.optional(pdfThemeValidator),
    backgroundDesignId: v.optional(v.string()),
    pageSize: v.optional(pageSizeValidator),
    // Option to auto-transition from DRAFT
    removeDraftOnSave: v.optional(v.boolean()),
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

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== user._id) {
        throw new Error("Folder not found");
      }
    }

    // Validate tags if provided
    if (args.tags && args.tags.length > 0) {
      for (const tagId of args.tags) {
        const tag = await ctx.db.get(tagId);
        if (!tag || tag.userId !== user._id || tag.deletedAt) {
          throw new Error("Invalid tag");
        }
        if (tag.type === "folder") {
          throw new Error("Cannot use folder-only tag on invoice");
        }
      }
    }

    // Validate invoice number uniqueness when changing invoice number or folder
    const newInvoiceNumber = args.invoiceNumber ?? invoice.invoiceNumber;
    const newFolderId = args.folderId !== undefined ? args.folderId : invoice.folderId;
    const invoiceNumberChanged = args.invoiceNumber && args.invoiceNumber !== invoice.invoiceNumber;
    const folderChanged = args.folderId !== undefined && args.folderId !== invoice.folderId;

    if (invoiceNumberChanged || folderChanged) {
      const isUnique = await isInvoiceNumberUniqueInFolder(
        ctx as Parameters<typeof isInvoiceNumberUniqueInFolder>[0],
        user._id,
        newInvoiceNumber,
        newFolderId,
        args.invoiceId
      );
      if (!isUnique) {
        throw new Error(
          newFolderId
            ? "Invoice number already exists in this folder"
            : "Invoice number already exists in unfiled invoices"
        );
      }
    }

    const { invoiceId, removeDraftOnSave, ...updates } = args;
    const patchData: Record<string, unknown> = { ...updates, updatedAt: Date.now() };

    // Handle removeDraftOnSave - transition from DRAFT to TO_SEND
    let newStatus = updates.status;
    if (removeDraftOnSave && invoice.status === "DRAFT" && !updates.status) {
      newStatus = "TO_SEND";
      patchData.status = newStatus;
    }

    // If status is changing, update the history and date fields
    const finalStatus = newStatus || updates.status;
    if (finalStatus && finalStatus !== invoice.status) {
      const nowStr = new Date().toISOString();
      const currentHistory = invoice.statusHistory || [];
      patchData.statusHistory = [
        ...currentHistory,
        {
          status: finalStatus,
          changedAt: nowStr,
        },
      ];

      // Set specific date fields based on status
      if (finalStatus === "SENT" && !invoice.sentAt) {
        patchData.sentAt = nowStr;
      } else if (finalStatus === "PAID" && !invoice.paidAt) {
        patchData.paidAt = nowStr;
      }
    }

    await ctx.db.patch(invoiceId, patchData);

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
    copyWorkHours: v.optional(v.boolean()), // Option to copy work hours
    copyTags: v.optional(v.boolean()), // Option to copy tags
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const sourceInvoice = await ctx.db.get(args.sourceInvoiceId);
    if (!sourceInvoice || sourceInvoice.userId !== user._id) {
      throw new Error("Source invoice not found");
    }

    // Determine target folder (explicit arg or inherit from source)
    const targetFolderId = args.folderId ?? sourceInvoice.folderId;

    // Validate invoice number uniqueness in target folder
    const isUnique = await isInvoiceNumberUniqueInFolder(
      ctx as Parameters<typeof isInvoiceNumberUniqueInFolder>[0],
      user._id,
      args.newInvoiceNumber,
      targetFolderId
    );
    if (!isUnique) {
      throw new Error(
        targetFolderId
          ? "Invoice number already exists in this folder"
          : "Invoice number already exists in unfiled invoices"
      );
    }

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const nowStr = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      _id,
      _creationTime,
      createdAt,
      updatedAt,
      deletedAt,
      statusHistory,
      sentAt,
      paidAt,
      viewedAt,
      isArchived,
      archivedAt,
      ...invoiceData
    } = sourceInvoice;

    // Handle work hours based on copyWorkHours option
    const workHoursData = args.copyWorkHours
      ? {
          dailyWorkHours: sourceInvoice.dailyWorkHours,
          totalDays: sourceInvoice.totalDays,
          totalHours: sourceInvoice.totalHours,
          subtotal: sourceInvoice.subtotal,
          discountAmount: sourceInvoice.discountAmount,
          taxAmount: sourceInvoice.taxAmount,
          totalAmount: sourceInvoice.totalAmount,
        }
      : {
          dailyWorkHours: [],
          totalDays: 0,
          totalHours: 0,
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
        };

    // Handle tags based on copyTags option
    const tagsData = args.copyTags ? { tags: sourceInvoice.tags } : { tags: [] };

    const newInvoiceId = await ctx.db.insert("invoices", {
      ...invoiceData,
      ...workHoursData,
      ...tagsData,
      invoiceNumber: args.newInvoiceNumber,
      folderId: args.folderId ?? sourceInvoice.folderId,
      status: "DRAFT",
      issueDate: today,
      dueDate: undefined, // Clear due date
      periodStart: undefined, // Clear period for fresh entry
      periodEnd: undefined,
      statusHistory: [
        {
          status: "DRAFT",
          changedAt: nowStr,
          notes: `Duplicated from invoice ${sourceInvoice.invoiceNumber}`,
        },
      ],
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

    // Check if invoice is move locked
    if (invoice.isMoveLocked) {
      throw new Error("Invoice is locked and cannot be moved");
    }

    // Check if source folder has move lock enabled
    if (invoice.folderId) {
      const sourceFolder = await ctx.db.get(invoice.folderId);
      if (sourceFolder && sourceFolder.isMoveLocked) {
        throw new Error("Invoices in this folder are locked and cannot be moved");
      }
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== user._id) {
        throw new Error("Folder not found");
      }
    }

    // Skip validation if not actually changing folders
    if (args.folderId !== invoice.folderId) {
      // Validate invoice number uniqueness in destination folder
      const isUnique = await isInvoiceNumberUniqueInFolder(
        ctx as Parameters<typeof isInvoiceNumberUniqueInFolder>[0],
        user._id,
        invoice.invoiceNumber,
        args.folderId,
        args.invoiceId
      );
      if (!isUnique) {
        throw new Error(
          args.folderId
            ? "Invoice number already exists in the destination folder"
            : "Invoice number already exists in unfiled invoices"
        );
      }
    }

    await ctx.db.patch(args.invoiceId, {
      folderId: args.folderId,
      updatedAt: Date.now(),
    });

    return args.invoiceId;
  },
});

// Toggle move lock for an invoice
export const toggleMoveLock = mutation({
  args: {
    invoiceId: v.id("invoices"),
    isMoveLocked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== user._id || invoice.deletedAt) {
      throw new Error("Invoice not found");
    }

    await ctx.db.patch(args.invoiceId, {
      isMoveLocked: args.isMoveLocked,
      updatedAt: Date.now(),
    });

    return args.invoiceId;
  },
});

// Bulk move invoices to folder
export const bulkMoveToFolder = mutation({
  args: {
    invoiceIds: v.array(v.id("invoices")),
    folderId: v.optional(v.id("invoiceFolders")),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Limit bulk operations to prevent abuse
    if (args.invoiceIds.length > 100) {
      throw new Error("Cannot move more than 100 invoices at once");
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== user._id) {
        throw new Error("Folder not found");
      }
    }

    const now = Date.now();
    const results = { moved: 0, locked: 0, duplicateNumber: 0 };

    // Cache folder lock status to avoid repeated lookups
    const folderLockCache = new Map<string, boolean>();

    // Pre-fetch existing invoice numbers in the destination folder for uniqueness check
    // This is more efficient than checking one by one
    const destinationInvoices = args.folderId
      ? await ctx.db
          .query("invoices")
          .withIndex("by_folder_id", (q) => q.eq("folderId", args.folderId))
          .collect()
      : await ctx.db
          .query("invoices")
          .withIndex("by_user_id", (q) => q.eq("userId", user._id))
          .collect();

    const destinationInvoiceNumbers = new Set(
      destinationInvoices
        .filter((i) => !i.deletedAt && (args.folderId ? i.folderId === args.folderId : !i.folderId))
        .map((i) => i.invoiceNumber)
    );

    for (const invoiceId of args.invoiceIds) {
      const invoice = await ctx.db.get(invoiceId);
      if (invoice && invoice.userId === user._id && !invoice.deletedAt) {
        // Check if invoice is move locked
        if (invoice.isMoveLocked) {
          results.locked++;
          continue;
        }

        // Check if source folder has move lock enabled (with caching)
        if (invoice.folderId) {
          const cachedLock = folderLockCache.get(invoice.folderId);
          if (cachedLock !== undefined) {
            if (cachedLock) {
              results.locked++;
              continue;
            }
          } else {
            const sourceFolder = await ctx.db.get(invoice.folderId);
            const isLocked = sourceFolder?.isMoveLocked ?? false;
            folderLockCache.set(invoice.folderId, isLocked);
            if (isLocked) {
              results.locked++;
              continue;
            }
          }
        }

        // Skip if staying in same folder
        if (invoice.folderId === args.folderId) {
          continue;
        }

        // Check for invoice number uniqueness in destination folder
        // (exclude the invoice being moved from the check)
        const isNumberInUse = destinationInvoiceNumbers.has(invoice.invoiceNumber) &&
          !args.invoiceIds.includes(invoiceId as typeof args.invoiceIds[number]);
        if (isNumberInUse) {
          results.duplicateNumber++;
          continue;
        }

        await ctx.db.patch(invoiceId, {
          folderId: args.folderId,
          updatedAt: now,
        });
        results.moved++;

        // Add this invoice number to destination set (for subsequent checks in this batch)
        destinationInvoiceNumbers.add(invoice.invoiceNumber);
      }
    }

    return results;
  },
});

// Update invoice status with date tracking and logging
export const updateStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: statusValidator,
    notes: v.optional(v.string()),
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

    const now = Date.now();
    const nowStr = new Date().toISOString();
    const currentHistory = invoice.statusHistory || [];
    const previousStatus = invoice.status;

    const patchData: Record<string, unknown> = {
      status: args.status,
      statusHistory: [
        ...currentHistory,
        {
          status: args.status,
          changedAt: nowStr,
          notes: args.notes,
        },
      ],
      updatedAt: now,
    };

    // Set specific date fields based on status transition
    if (args.status === "SENT" && !invoice.sentAt) {
      patchData.sentAt = nowStr;
    } else if (args.status === "PAID" && !invoice.paidAt) {
      patchData.paidAt = nowStr;
    }

    await ctx.db.patch(args.invoiceId, patchData);

    // Create status log entry
    let folderName: string | undefined;
    if (invoice.folderId) {
      const folder = await ctx.db.get(invoice.folderId);
      folderName = folder?.name;
    }

    await ctx.db.insert("statusLogs", {
      userId: user._id,
      invoiceId: args.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      folderId: invoice.folderId,
      folderName,
      previousStatus,
      newStatus: args.status,
      notes: args.notes,
      changedAt: now,
      changedAtStr: nowStr,
    });

    return args.invoiceId;
  },
});

// Archive an invoice
export const archiveInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
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

    await ctx.db.patch(args.invoiceId, {
      isArchived: true,
      archivedAt: new Date().toISOString(),
      updatedAt: Date.now(),
    });

    return args.invoiceId;
  },
});

// Unarchive an invoice
export const unarchiveInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
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

    await ctx.db.patch(args.invoiceId, {
      isArchived: false,
      archivedAt: undefined,
      updatedAt: Date.now(),
    });

    return args.invoiceId;
  },
});

// Get archived invoices
export const getArchivedInvoices = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_and_archived", (q) =>
        q.eq("userId", user._id).eq("isArchived", true)
      )
      .collect();

    const sortedInvoices = invoices
      .filter((i) => !i.deletedAt)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      return sortedInvoices.slice(0, args.limit);
    }

    return sortedInvoices;
  },
});

// Bulk archive invoices
export const bulkArchiveInvoices = mutation({
  args: {
    invoiceIds: v.array(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const nowStr = new Date().toISOString();
    const now = Date.now();

    for (const invoiceId of args.invoiceIds) {
      const invoice = await ctx.db.get(invoiceId);
      if (invoice && invoice.userId === user._id && !invoice.deletedAt) {
        await ctx.db.patch(invoiceId, {
          isArchived: true,
          archivedAt: nowStr,
          updatedAt: now,
        });
      }
    }

    return args.invoiceIds.length;
  },
});

// Bulk delete invoices (soft delete)
export const bulkDeleteInvoices = mutation({
  args: {
    invoiceIds: v.array(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    let deletedCount = 0;

    for (const invoiceId of args.invoiceIds) {
      const invoice = await ctx.db.get(invoiceId);
      if (invoice && invoice.userId === user._id && !invoice.deletedAt) {
        await ctx.db.patch(invoiceId, { deletedAt: now });
        deletedCount++;
      }
    }

    return deletedCount;
  },
});

// Bulk update status with logging
export const bulkUpdateStatus = mutation({
  args: {
    invoiceIds: v.array(v.id("invoices")),
    status: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const nowStr = new Date().toISOString();
    const now = Date.now();

    // Cache folder names to avoid repeated lookups
    const folderNameCache = new Map<string, string>();

    for (const invoiceId of args.invoiceIds) {
      const invoice = await ctx.db.get(invoiceId);
      if (invoice && invoice.userId === user._id && !invoice.deletedAt) {
        const currentHistory = invoice.statusHistory || [];
        const previousStatus = invoice.status;
        const patchData: Record<string, unknown> = {
          status: args.status,
          statusHistory: [
            ...currentHistory,
            {
              status: args.status,
              changedAt: nowStr,
              notes: args.notes,
            },
          ],
          updatedAt: now,
        };

        if (args.status === "SENT" && !invoice.sentAt) {
          patchData.sentAt = nowStr;
        } else if (args.status === "PAID" && !invoice.paidAt) {
          patchData.paidAt = nowStr;
        }

        await ctx.db.patch(invoiceId, patchData);

        // Create status log entry
        let folderName: string | undefined;
        if (invoice.folderId) {
          const cached = folderNameCache.get(invoice.folderId);
          if (cached !== undefined) {
            folderName = cached;
          } else {
            const folder = await ctx.db.get(invoice.folderId);
            folderName = folder?.name;
            if (folderName) {
              folderNameCache.set(invoice.folderId, folderName);
            }
          }
        }

        await ctx.db.insert("statusLogs", {
          userId: user._id,
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          folderId: invoice.folderId,
          folderName,
          previousStatus,
          newStatus: args.status,
          notes: args.notes,
          changedAt: now,
          changedAtStr: nowStr,
        });
      }
    }

    return args.invoiceIds.length;
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

// Get the next billing period for a folder based on existing invoices
// Analyzes all invoices in the folder and determines what the next period should be
export const getNextBillingPeriod = query({
  args: { folderId: v.id("invoiceFolders") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    // Get the folder to verify access
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id || folder.deletedAt) {
      return null;
    }

    // Get all non-deleted invoices in the folder
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_folder_id", (q) => q.eq("folderId", args.folderId))
      .collect();

    const activeInvoices = invoices.filter((i) => !i.deletedAt && i.periodEnd);

    if (activeInvoices.length === 0) {
      // No invoices yet - start with current month 1st batch
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      return {
        periodStart: `${year}-${String(month + 1).padStart(2, "0")}-01`,
        periodEnd: `${year}-${String(month + 1).padStart(2, "0")}-15`,
        batchType: "1st_batch" as const,
        monthLabel: new Date(year, month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      };
    }

    // Find the latest period end date
    const sortedInvoices = activeInvoices
      .filter((i) => i.periodEnd)
      .sort((a, b) => {
        const dateA = new Date(a.periodEnd!);
        const dateB = new Date(b.periodEnd!);
        return dateB.getTime() - dateA.getTime();
      });

    const latestInvoice = sortedInvoices[0];
    const latestEndDate = new Date(latestInvoice.periodEnd!);
    const latestEndDay = latestEndDate.getDate();

    // Determine next period based on the latest invoice
    // If latest ends on 15th (1st batch) -> next is 2nd batch of same month
    // If latest ends on month end (2nd batch) -> next is 1st batch of next month
    let nextYear = latestEndDate.getFullYear();
    let nextMonth = latestEndDate.getMonth();
    let batchType: "1st_batch" | "2nd_batch";

    if (latestEndDay <= 15) {
      // Latest was 1st batch, next is 2nd batch of same month
      batchType = "2nd_batch";
    } else {
      // Latest was 2nd batch, next is 1st batch of next month
      batchType = "1st_batch";
      nextMonth += 1;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
    }

    // Calculate period dates
    let periodStart: string;
    let periodEnd: string;

    if (batchType === "1st_batch") {
      periodStart = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;
      periodEnd = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-15`;
    } else {
      // 2nd batch: 16th to end of month
      const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
      periodStart = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-16`;
      periodEnd = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }

    return {
      periodStart,
      periodEnd,
      batchType,
      monthLabel: new Date(nextYear, nextMonth).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };
  },
});

// Quick create invoice with minimal input - auto-fills from folder defaults and client profile
export const quickCreateInvoice = mutation({
  args: {
    folderId: v.id("invoiceFolders"),
    clientProfileId: v.id("clientProfiles"),
    invoiceNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get the folder with defaults
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id || folder.deletedAt) {
      throw new Error("Folder not found");
    }

    // Get the client profile
    const client = await ctx.db.get(args.clientProfileId);
    if (!client || client.userId !== user._id || client.deletedAt) {
      throw new Error("Client not found");
    }

    // Validate invoice number uniqueness in the folder
    const isUnique = await isInvoiceNumberUniqueInFolder(
      ctx as Parameters<typeof isInvoiceNumberUniqueInFolder>[0],
      user._id,
      args.invoiceNumber,
      args.folderId
    );
    if (!isUnique) {
      throw new Error("Invoice number already exists in this folder");
    }

    // Get user profile for "from" info
    const userProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();
    const userProfile = userProfiles[0];

    // Get all non-deleted invoices in the folder to determine next period
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_folder_id", (q) => q.eq("folderId", args.folderId))
      .collect();

    const activeInvoices = invoices.filter((i) => !i.deletedAt && i.periodEnd);

    // Calculate next period
    let nextYear: number;
    let nextMonth: number;
    let batchType: "1st_batch" | "2nd_batch";

    if (activeInvoices.length === 0) {
      // No invoices yet - start with current month 1st batch
      const now = new Date();
      nextYear = now.getFullYear();
      nextMonth = now.getMonth();
      batchType = "1st_batch";
    } else {
      // Find latest period and calculate next
      const sortedInvoices = activeInvoices
        .sort((a, b) => new Date(b.periodEnd!).getTime() - new Date(a.periodEnd!).getTime());

      const latestEndDate = new Date(sortedInvoices[0].periodEnd!);
      const latestEndDay = latestEndDate.getDate();
      nextYear = latestEndDate.getFullYear();
      nextMonth = latestEndDate.getMonth();

      if (latestEndDay <= 15) {
        batchType = "2nd_batch";
      } else {
        batchType = "1st_batch";
        nextMonth += 1;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear += 1;
        }
      }
    }

    // Calculate period dates
    let periodStart: string;
    let periodEnd: string;

    if (batchType === "1st_batch") {
      periodStart = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;
      periodEnd = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-15`;
    } else {
      const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
      periodStart = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-16`;
      periodEnd = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }

    // Generate daily work hours for the period
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    const dailyWorkHours: Array<{ date: string; hours: number; isWorkday: boolean }> = [];
    const defaultHoursPerDay = 8;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      dailyWorkHours.push({
        date: d.toISOString().split("T")[0],
        hours: defaultHoursPerDay,
        isWorkday: !isWeekend,
      });
    }

    // Calculate totals
    const workingDays = dailyWorkHours.filter((d) => d.isWorkday);
    const totalDays = workingDays.length;
    const totalHours = workingDays.reduce((sum, d) => sum + d.hours, 0);
    const hourlyRate = folder.defaultHourlyRate || 0;
    const subtotal = totalHours * hourlyRate;

    // Build from info from user profile
    const from = {
      name: userProfile?.displayName || userProfile?.businessName || "",
      address: userProfile?.address || "",
      city: userProfile?.city || "",
      state: userProfile?.state || "",
      postalCode: userProfile?.postalCode || "",
      country: userProfile?.country || "",
      email: userProfile?.email || "",
      phone: userProfile?.phone || "",
      taxId: userProfile?.taxId || "",
    };

    // Build to info from client profile
    const to = {
      name: client.companyName || client.name,
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      postalCode: client.postalCode || "",
      country: client.country || "",
      email: client.email || "",
      phone: client.phone || "",
      taxId: client.taxId || "",
    };

    const now = Date.now();
    const nowStr = new Date().toISOString();
    const today = new Date().toISOString().split("T")[0];

    // Calculate due date based on payment terms
    const paymentTerms = folder.defaultPaymentTerms || "NET_30";
    let dueDate: string;
    const dueDateObj = new Date();
    switch (paymentTerms) {
      case "DUE_ON_RECEIPT":
        dueDate = today;
        break;
      case "NET_7":
        dueDateObj.setDate(dueDateObj.getDate() + 7);
        dueDate = dueDateObj.toISOString().split("T")[0];
        break;
      case "NET_15":
        dueDateObj.setDate(dueDateObj.getDate() + 15);
        dueDate = dueDateObj.toISOString().split("T")[0];
        break;
      case "NET_30":
        dueDateObj.setDate(dueDateObj.getDate() + 30);
        dueDate = dueDateObj.toISOString().split("T")[0];
        break;
      case "NET_45":
        dueDateObj.setDate(dueDateObj.getDate() + 45);
        dueDate = dueDateObj.toISOString().split("T")[0];
        break;
      case "NET_60":
        dueDateObj.setDate(dueDateObj.getDate() + 60);
        dueDate = dueDateObj.toISOString().split("T")[0];
        break;
      default:
        dueDateObj.setDate(dueDateObj.getDate() + 30);
        dueDate = dueDateObj.toISOString().split("T")[0];
    }

    const invoiceId = await ctx.db.insert("invoices", {
      userId: user._id,
      folderId: args.folderId,
      invoiceNumber: args.invoiceNumber,
      status: "DRAFT",
      statusHistory: [
        {
          status: "DRAFT",
          changedAt: nowStr,
          notes: "Invoice created via quick create",
        },
      ],
      issueDate: today,
      dueDate,
      periodStart,
      periodEnd,
      from,
      to,
      hourlyRate,
      defaultHoursPerDay,
      dailyWorkHours,
      totalDays,
      totalHours,
      subtotal,
      lineItems: [],
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      totalAmount: subtotal,
      currency: folder.defaultCurrency || "USD",
      paymentTerms,
      bankDetails: userProfile?.bankDetails,
      jobTitle: folder.defaultJobTitle,
      showDetailedHours: true,
      pdfTheme: "light",
      pageSize: "A4",
      createdAt: now,
      updatedAt: now,
    });

    // Create status log entry
    await ctx.db.insert("statusLogs", {
      userId: user._id,
      invoiceId,
      invoiceNumber: args.invoiceNumber,
      folderId: args.folderId,
      folderName: folder.name,
      previousStatus: undefined,
      newStatus: "DRAFT",
      notes: "Invoice created via quick create",
      changedAt: now,
      changedAtStr: nowStr,
    });

    return {
      invoiceId,
      periodStart,
      periodEnd,
      batchType,
    };
  },
});

// Get the next invoice number based on the latest invoice in a folder
// This is the preferred method for generating invoice numbers as it's folder-scoped
export const getNextInvoiceNumberForFolder = query({
  args: {
    folderId: v.optional(v.id("invoiceFolders")),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return { number: 1, formatted: "001" };
    }

    // Get user profile for prefix
    const userProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();
    const userProfile = userProfiles[0];
    const prefix = userProfile?.invoicePrefix ?? "";

    // Get all invoices for the user (in the specific folder or unfiled)
    let invoices;
    if (args.folderId) {
      // SECURITY: Verify folder belongs to the current user
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== user._id || folder.deletedAt) {
        // Return default for unauthorized folder access
        const formatted = prefix ? `${prefix}-001` : "001";
        return { number: 1, formatted };
      }

      // Get invoices from specific folder (ownership already verified via folder)
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_folder_id", (q) => q.eq("folderId", args.folderId))
        .collect();
      // Filter to only non-deleted invoices (user ownership verified via folder)
      invoices = invoices.filter((i) => !i.deletedAt);
    } else {
      // Get unfiled invoices
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_folder_id", (q) => q.eq("folderId", undefined))
        .collect();
      invoices = invoices.filter((i) => i.userId === user._id && !i.deletedAt);
    }

    if (invoices.length === 0) {
      // No invoices in this folder - start at 001
      const formatted = prefix ? `${prefix}-001` : "001";
      return { number: 1, formatted };
    }

    // Extract numeric part from invoice numbers and find the highest
    // Supports formats like: "001", "INV-001", "INV-2024-001", etc.
    let maxNumber = 0;
    for (const invoice of invoices) {
      // Extract all numbers from the invoice number and take the last one
      const matches = invoice.invoiceNumber.match(/(\d+)/g);
      if (matches && matches.length > 0) {
        // Take the last number group (e.g., "001" from "INV-2024-001")
        const lastNumber = parseInt(matches[matches.length - 1], 10);
        if (!isNaN(lastNumber) && lastNumber > maxNumber) {
          maxNumber = lastNumber;
        }
      }
    }

    const nextNumber = maxNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(3, "0");
    const formatted = prefix ? `${prefix}-${paddedNumber}` : paddedNumber;

    return { number: nextNumber, formatted };
  },
});
