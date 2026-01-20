import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Shared validators for reuse
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

export default defineSchema({
  users: defineTable({
    // Core identity (synced from Clerk)
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    imageUrl: v.optional(v.string()),

    // Timestamps
    clerkCreatedAt: v.number(),
    clerkUpdatedAt: v.number(),
    lastSignInAt: v.optional(v.number()),
    syncedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // User profile with editable business details
  userProfiles: defineTable({
    userId: v.id("users"),

    // Business information (can override Clerk data)
    displayName: v.optional(v.string()),
    businessName: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    taxId: v.optional(v.string()),
    logo: v.optional(v.string()),

    // Default bank details
    bankDetails: v.optional(bankDetailsValidator),

    // Invoice numbering settings
    invoicePrefix: v.optional(v.string()), // e.g., "INV" for INV-001
    nextInvoiceNumber: v.number(), // Current counter for auto-increment

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  // Invoice folders for organization
  invoiceFolders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()), // For UI display

    // Parent folder for nested structure (null = root)
    parentId: v.optional(v.id("invoiceFolders")),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()), // Soft delete
  })
    .index("by_user_id", ["userId"])
    .index("by_parent_id", ["parentId"]),

  // Main invoices table
  invoices: defineTable({
    userId: v.id("users"),
    folderId: v.optional(v.id("invoiceFolders")), // null = unfiled

    // Basic info
    invoiceNumber: v.string(),
    status: v.union(
      v.literal("DRAFT"),
      v.literal("SENT"),
      v.literal("PAID"),
      v.literal("OVERDUE"),
      v.literal("CANCELLED")
    ),

    // Dates
    issueDate: v.string(),
    dueDate: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),

    // Parties
    from: partyInfoValidator,
    to: partyInfoValidator,

    // Work hours tracking
    hourlyRate: v.number(),
    defaultHoursPerDay: v.number(),
    dailyWorkHours: v.array(dailyWorkHoursValidator),

    // Calculated totals
    totalDays: v.number(),
    totalHours: v.number(),
    subtotal: v.number(),

    // Additional line items
    lineItems: v.array(lineItemValidator),

    // Discounts & taxes
    discountPercent: v.number(),
    discountAmount: v.number(),
    taxPercent: v.number(),
    taxAmount: v.number(),

    // Final amount
    totalAmount: v.number(),

    // Currency & payment
    currency: v.union(
      v.literal("USD"),
      v.literal("EUR"),
      v.literal("GBP"),
      v.literal("PHP"),
      v.literal("JPY"),
      v.literal("AUD"),
      v.literal("CAD"),
      v.literal("SGD")
    ),
    paymentTerms: v.union(
      v.literal("DUE_ON_RECEIPT"),
      v.literal("NET_7"),
      v.literal("NET_15"),
      v.literal("NET_30"),
      v.literal("NET_45"),
      v.literal("NET_60"),
      v.literal("CUSTOM")
    ),
    customPaymentTerms: v.optional(v.string()),
    bankDetails: v.optional(bankDetailsValidator),

    // Additional fields
    notes: v.optional(v.string()),
    terms: v.optional(v.string()),
    jobTitle: v.optional(v.string()),

    // Display settings
    showDetailedHours: v.boolean(),
    pdfTheme: v.union(v.literal("light"), v.literal("dark")),

    // Design settings
    backgroundDesignId: v.optional(v.string()),
    pageSize: v.union(
      v.literal("A4"),
      v.literal("LETTER"),
      v.literal("LEGAL"),
      v.literal("LONG"),
      v.literal("SHORT"),
      v.literal("A5"),
      v.literal("B5")
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()), // Soft delete
  })
    .index("by_user_id", ["userId"])
    .index("by_folder_id", ["folderId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_created", ["userId", "createdAt"])
    .index("by_invoice_number", ["userId", "invoiceNumber"]),

  // Saved client profiles for quick selection
  clientProfiles: defineTable({
    userId: v.id("users"),
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

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_name", ["userId", "name"]),
});
