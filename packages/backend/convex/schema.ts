import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Shared validators for reuse
const partyInfoValidator = v.object({
  name: v.string(),
  companyName: v.optional(v.string()),
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

// Extended status options
const invoiceStatusValidator = v.union(
  v.literal("DRAFT"),
  v.literal("TO_SEND"),
  v.literal("SENT"),
  v.literal("PARTIAL_PAYMENT"),
  v.literal("PAID"),
  v.literal("OVERDUE"),
  v.literal("CANCELLED"),
  v.literal("REFUNDED")
);

// Status change event for history tracking
const statusChangeEventValidator = v.object({
  status: invoiceStatusValidator,
  changedAt: v.string(), // ISO date string
  notes: v.optional(v.string()),
});

// Page sizes for templates
const pageSizeValidator = v.union(
  v.literal("A4"),
  v.literal("LETTER"),
  v.literal("LEGAL"),
  v.literal("LONG"),
  v.literal("SHORT"),
  v.literal("A5"),
  v.literal("B5")
);

// Template element types
const templateElementTypeValidator = v.union(
  v.literal("text"),
  v.literal("table_work_hours"),
  v.literal("table_line_items"),
  v.literal("table_summary"),
  v.literal("divider"),
  v.literal("rectangle"),
  v.literal("logo"),
  v.literal("layout_container")
);

// Position mode for elements
const positionModeValidator = v.union(
  v.literal("absolute"),
  v.literal("relative")
);

// Layout direction for containers
const layoutDirectionValidator = v.union(
  v.literal("column"),
  v.literal("row")
);

// Alignment options
const alignmentValidator = v.union(
  v.literal("start"),
  v.literal("center"),
  v.literal("end"),
  v.literal("stretch")
);

// Justify options
const justifyValidator = v.union(
  v.literal("start"),
  v.literal("center"),
  v.literal("end"),
  v.literal("space-between"),
  v.literal("space-around"),
  v.literal("space-evenly")
);

// Height mode for layout containers (fixed, auto, percentage, fill, canvas)
const heightModeValidator = v.union(
  v.literal("fixed"),
  v.literal("auto"),
  v.literal("percentage"),
  v.literal("fill"),
  v.literal("canvas")
);

// Sizing mode for general elements (width and height)
const sizingModeValidator = v.union(
  v.literal("fixed"),
  v.literal("auto"),
  v.literal("percentage"),
  v.literal("fill"),
  v.literal("canvas")
);

// Min height mode for all elements
const minHeightModeValidator = v.union(
  v.literal("none"),
  v.literal("fixed"),
  v.literal("auto"),
  v.literal("percentage")
);

// Display mode for layout containers (flexbox or grid)
const displayModeValidator = v.union(v.literal("flex"), v.literal("grid"));

// Grid configuration for CSS Grid layout
const gridConfigValidator = v.object({
  templateColumns: v.optional(v.string()),
  templateRows: v.optional(v.string()),
  columnGap: v.optional(v.number()),
  rowGap: v.optional(v.number()),
});

// Layout config for containers
const layoutConfigValidator = v.object({
  direction: v.optional(layoutDirectionValidator),
  gap: v.optional(v.number()),
  align: v.optional(alignmentValidator),
  justify: v.optional(justifyValidator),
  wrap: v.optional(v.boolean()),
  displayMode: v.optional(displayModeValidator),
  grid: v.optional(gridConfigValidator),
});

// Spacing for relative elements
const spacingValidator = v.object({
  top: v.optional(v.number()),
  right: v.optional(v.number()),
  bottom: v.optional(v.number()),
  left: v.optional(v.number()),
});

// Font style for template elements
const fontStyleValidator = v.object({
  fontFamily: v.optional(
    v.union(
      v.literal("Helvetica"),
      v.literal("Helvetica-Bold"),
      v.literal("Helvetica-Oblique"),
      v.literal("Helvetica-BoldOblique"),
      v.literal("Times-Roman"),
      v.literal("Times-Bold"),
      v.literal("Times-Italic"),
      v.literal("Times-BoldItalic"),
      v.literal("Courier"),
      v.literal("Courier-Bold"),
      v.literal("Courier-Oblique"),
      v.literal("Courier-BoldOblique"),
      v.literal("Geist"),
      v.literal("Geist Mono")
    )
  ),
  fontSize: v.optional(v.number()),
  fontWeight: v.optional(v.union(v.literal("normal"), v.literal("bold"))),
  fontStyle: v.optional(v.union(v.literal("normal"), v.literal("italic"))),
  textAlign: v.optional(
    v.union(v.literal("left"), v.literal("center"), v.literal("right"), v.literal("justify"))
  ),
  textDecoration: v.optional(
    v.union(v.literal("none"), v.literal("underline"), v.literal("line-through"))
  ),
  textTransform: v.optional(
    v.union(v.literal("none"), v.literal("uppercase"), v.literal("lowercase"), v.literal("capitalize"))
  ),
  letterSpacing: v.optional(v.number()),
  lineHeight: v.optional(v.number()),
  color: v.optional(v.string()),
});

// Border style for template elements
const borderStyleValidator = v.object({
  width: v.optional(v.number()),
  color: v.optional(v.string()),
  style: v.optional(v.union(v.literal("solid"), v.literal("dashed"), v.literal("dotted"))),
  radius: v.optional(v.number()),
});

// Table column definition
const tableColumnValidator = v.object({
  id: v.string(),
  header: v.string(),
  field: v.string(),
  width: v.number(),
  align: v.optional(v.union(v.literal("left"), v.literal("center"), v.literal("right"))),
});

// Table style for table elements
const tableStyleValidator = v.object({
  headerBackgroundColor: v.optional(v.string()),
  headerTextColor: v.optional(v.string()),
  rowBackgroundColor: v.optional(v.string()),
  alternateRowBackgroundColor: v.optional(v.string()),
  borderColor: v.optional(v.string()),
  showHeaderBorder: v.optional(v.boolean()),
  showRowBorders: v.optional(v.boolean()),
  columns: v.optional(v.array(tableColumnValidator)),
});

// Position for template elements
const positionValidator = v.object({
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
});

// Template element
const templateElementValidator = v.object({
  id: v.string(),
  type: templateElementTypeValidator,
  name: v.optional(v.string()),
  position: positionValidator,
  content: v.optional(v.string()),
  fontStyle: v.optional(fontStyleValidator),
  border: v.optional(borderStyleValidator),
  backgroundColor: v.optional(v.string()),
  padding: v.optional(v.number()),
  opacity: v.optional(v.number()),
  zIndex: v.optional(v.number()),
  locked: v.optional(v.boolean()),
  visible: v.optional(v.boolean()),
  tableStyle: v.optional(tableStyleValidator),
  logoUrl: v.optional(v.string()),
  objectFit: v.optional(v.union(v.literal("contain"), v.literal("cover"), v.literal("fill"))),
  // Relative positioning fields
  positionMode: v.optional(positionModeValidator),
  parentId: v.optional(v.string()),
  order: v.optional(v.number()),
  spacing: v.optional(spacingValidator),
  flexGrow: v.optional(v.number()),
  flexShrink: v.optional(v.number()),
  flexBasis: v.optional(v.union(v.literal("auto"), v.number())),
  alignSelf: v.optional(alignmentValidator),
  // Grid item properties (only used when parent is in grid mode)
  gridColumn: v.optional(v.string()),
  gridRow: v.optional(v.string()),
  // Layout container configuration
  layoutConfig: v.optional(layoutConfigValidator),
  // Height mode for layout containers (fixed, auto, percentage)
  heightMode: v.optional(heightModeValidator),
  // Height as percentage (0-100) when heightMode is 'percentage'
  heightPercent: v.optional(v.number()),
  // Width sizing mode for non-container elements (fixed, auto, percentage, fill)
  widthMode: v.optional(sizingModeValidator),
  // Width as percentage (0-100) when widthMode is 'percentage'
  widthPercent: v.optional(v.number()),
  // Height sizing mode for non-container elements (fixed, auto, percentage, fill)
  heightSizingMode: v.optional(sizingModeValidator),
  // Height as percentage (0-100) when heightSizingMode is 'percentage'
  heightSizingPercent: v.optional(v.number()),
  // Text-specific: when false (default), text elements with all-empty tokens are hidden in PDF
  showWhenEmpty: v.optional(v.boolean()),
  // Min height mode for all elements (none, fixed, auto, percentage)
  minHeightMode: v.optional(minHeightModeValidator),
  // Min height value in points when minHeightMode is 'fixed'
  minHeightValue: v.optional(v.number()),
  // Min height as percentage (0-100) when minHeightMode is 'percentage'
  minHeightPercent: v.optional(v.number()),
});

// Template theme colors
const templateThemeValidator = v.object({
  primary: v.optional(v.string()),
  secondary: v.optional(v.string()),
  accent: v.optional(v.string()),
  text: v.optional(v.string()),
  textLight: v.optional(v.string()),
  background: v.optional(v.string()),
});

// Margin definition for templates
const marginValidator = v.object({
  top: v.number(),
  right: v.number(),
  bottom: v.number(),
  left: v.number(),
});

// Editor settings for user profiles
const editorSettingsValidator = v.object({
  showRulers: v.boolean(),
  showGrid: v.boolean(),
  snapToGrid: v.boolean(),
  gridSize: v.number(),
  zoomLevel: v.number(),
});

// User role validator
const userRoleValidator = v.union(v.literal("user"), v.literal("admin"));

export default defineSchema({
  users: defineTable({
    // Core identity (synced from Clerk)
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    imageUrl: v.optional(v.string()),

    // User role (defaults to 'user')
    role: v.optional(userRoleValidator),

    // Timestamps
    clerkCreatedAt: v.number(),
    clerkUpdatedAt: v.number(),
    lastSignInAt: v.optional(v.number()),
    syncedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

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

    // Editor settings (for style editor preferences)
    editorSettings: v.optional(editorSettingsValidator),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  // User-created invoice templates
  templates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    pageSize: pageSizeValidator,
    orientation: v.union(v.literal("portrait"), v.literal("landscape")),
    margins: marginValidator,
    theme: v.optional(templateThemeValidator),
    backgroundColor: v.string(),
    elements: v.array(templateElementValidator),
    isDefault: v.boolean(),

    // Source system template ID (for templates duplicated from system templates)
    sourceSystemTemplateId: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()), // Soft delete
  })
    .index("by_user_id", ["userId"])
    .index("by_user_and_default", ["userId", "isDefault"]),

  // Tags for organizing invoices and folders
  tags: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.optional(v.string()), // Hex color code
    type: v.union(v.literal("invoice"), v.literal("folder"), v.literal("both")), // What this tag applies to

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_type", ["userId", "type"])
    .index("by_name", ["userId", "name"]),

  // Invoice folders for organization
  invoiceFolders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()), // For UI display

    // Parent folder for nested structure (null = root)
    parentId: v.optional(v.id("invoiceFolders")),

    // Tags for folder organization
    tags: v.optional(v.array(v.id("tags"))),

    // Movement locking - prevents all invoices in this folder from being moved
    isMoveLocked: v.optional(v.boolean()),

    // Client profiles linked to this folder (for auto-filling new invoices)
    // Multiple clients can be associated with a folder
    clientProfileIds: v.optional(v.array(v.id("clientProfiles"))),

    // Default invoice settings for this folder
    defaultHourlyRate: v.optional(v.number()),
    defaultCurrency: v.optional(
      v.union(
        v.literal("USD"),
        v.literal("EUR"),
        v.literal("GBP"),
        v.literal("PHP"),
        v.literal("JPY"),
        v.literal("AUD"),
        v.literal("CAD"),
        v.literal("SGD")
      )
    ),
    defaultPaymentTerms: v.optional(
      v.union(
        v.literal("DUE_ON_RECEIPT"),
        v.literal("NET_7"),
        v.literal("NET_15"),
        v.literal("NET_30"),
        v.literal("NET_45"),
        v.literal("NET_60"),
        v.literal("CUSTOM")
      )
    ),
    defaultJobTitle: v.optional(v.string()),
    defaultShowDetailedHours: v.optional(v.boolean()),

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
    status: invoiceStatusValidator,

    // Status tracking with history
    statusHistory: v.optional(v.array(statusChangeEventValidator)),

    // Dates
    issueDate: v.string(),
    dueDate: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),

    // Status-specific dates for easy tracking/querying
    sentAt: v.optional(v.string()),
    paidAt: v.optional(v.string()),
    viewedAt: v.optional(v.string()),

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

    // Tags for organization
    tags: v.optional(v.array(v.id("tags"))),

    // Archiving
    isArchived: v.optional(v.boolean()),
    archivedAt: v.optional(v.string()),

    // Movement locking - prevents this invoice from being moved
    isMoveLocked: v.optional(v.boolean()),

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
    .index("by_invoice_number", ["userId", "invoiceNumber"])
    .index("by_user_and_archived", ["userId", "isArchived"]),

  // Saved client profiles for quick selection
  clientProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(), // Contact name or primary name
    companyName: v.optional(v.string()), // Company/business name
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    taxId: v.optional(v.string()),
    logo: v.optional(v.string()),
    notes: v.optional(v.string()), // Internal notes about the client

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_name", ["userId", "name"]),

  // Status logs for tracking invoice status changes (centralized for filtering)
  statusLogs: defineTable({
    userId: v.id("users"),
    invoiceId: v.id("invoices"),

    // Invoice info at time of log (for display without joins)
    invoiceNumber: v.string(),

    // Folder info at time of log (for filtering)
    folderId: v.optional(v.id("invoiceFolders")),
    folderName: v.optional(v.string()),

    // Status change details
    previousStatus: v.optional(invoiceStatusValidator),
    newStatus: invoiceStatusValidator,
    notes: v.optional(v.string()),

    // Timestamps
    changedAt: v.number(), // Unix timestamp for efficient querying
    changedAtStr: v.string(), // ISO string for display
  })
    .index("by_user_id", ["userId"])
    .index("by_user_and_changed", ["userId", "changedAt"])
    .index("by_invoice_id", ["invoiceId"])
    .index("by_folder_id", ["userId", "folderId"]),
});
