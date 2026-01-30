import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { isAdmin, requireAdmin } from "./users";
import type { Id, Doc } from "./_generated/dataModel";

// Reusable validators (same as schema)
const pageSizeValidator = v.union(
  v.literal("A4"),
  v.literal("LETTER"),
  v.literal("LEGAL"),
  v.literal("LONG"),
  v.literal("SHORT"),
  v.literal("A5"),
  v.literal("B5")
);

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

const borderStyleValidator = v.object({
  width: v.optional(v.number()),
  color: v.optional(v.string()),
  style: v.optional(v.union(v.literal("solid"), v.literal("dashed"), v.literal("dotted"))),
  radius: v.optional(v.number()),
});

const tableColumnValidator = v.object({
  id: v.string(),
  header: v.string(),
  field: v.string(),
  width: v.number(),
  align: v.optional(v.union(v.literal("left"), v.literal("center"), v.literal("right"))),
});

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

const positionValidator = v.object({
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
});

// Position mode for elements
const positionModeValidator = v.union(v.literal("absolute"), v.literal("relative"));

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

// Layout direction
const layoutDirectionValidator = v.union(v.literal("column"), v.literal("row"));

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

// Layout container configuration
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

const templateThemeValidator = v.object({
  primary: v.optional(v.string()),
  secondary: v.optional(v.string()),
  accent: v.optional(v.string()),
  text: v.optional(v.string()),
  textLight: v.optional(v.string()),
  background: v.optional(v.string()),
});

const marginValidator = v.object({
  top: v.number(),
  right: v.number(),
  bottom: v.number(),
  left: v.number(),
});

// ============================================================================
// FOLDER QUERIES
// ============================================================================

/**
 * List all system template folders (for regular users - exclude hidden)
 */
export const listFolders = query({
  args: {},
  handler: async (ctx) => {
    const folders = await ctx.db
      .query("systemTemplateFolders")
      .withIndex("by_sort_order")
      .collect();

    // Filter out soft-deleted and hidden folders for regular users
    return folders.filter((f) => !f.deletedAt && !f.isHidden);
  },
});

/**
 * List all system template folders for admin (including hidden)
 */
export const listFoldersAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userIsAdmin = await isAdmin(ctx);
    if (!userIsAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    const folders = await ctx.db
      .query("systemTemplateFolders")
      .withIndex("by_sort_order")
      .collect();

    // Filter out only soft-deleted, admins see hidden folders
    return folders.filter((f) => !f.deletedAt);
  },
});

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

/**
 * List all system templates for regular users (exclude hidden)
 */
export const listSystemTemplates = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db
      .query("systemTemplates")
      .withIndex("by_sort_order")
      .collect();

    // Filter out soft-deleted and hidden templates
    return templates.filter((t) => !t.deletedAt && !t.isHidden);
  },
});

/**
 * List all system templates for admin (including hidden)
 */
export const listSystemTemplatesAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userIsAdmin = await isAdmin(ctx);
    if (!userIsAdmin) {
      throw new Error("Forbidden: Admin access required");
    }

    const templates = await ctx.db
      .query("systemTemplates")
      .withIndex("by_sort_order")
      .collect();

    // Filter out only soft-deleted, admins see hidden templates
    return templates.filter((t) => !t.deletedAt);
  },
});

/**
 * Get a single system template by ID
 */
export const getSystemTemplate = query({
  args: {
    templateId: v.id("systemTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template || template.deletedAt) {
      return null;
    }

    // Non-admins cannot access hidden templates
    if (template.isHidden) {
      const userIsAdmin = await isAdmin(ctx);
      if (!userIsAdmin) {
        return null;
      }
    }

    return template;
  },
});

/**
 * Get the default system template
 */
export const getDefaultSystemTemplate = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db
      .query("systemTemplates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .collect();

    // Filter out soft-deleted templates and return the first one
    const defaultTemplate = templates.find((t) => !t.deletedAt && !t.isHidden);
    return defaultTemplate ?? null;
  },
});

// ============================================================================
// FOLDER MUTATIONS (Admin only)
// ============================================================================

/**
 * Create a new system template folder (admin only)
 */
export const createFolder = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();

    // Get highest sortOrder if not provided
    let sortOrder = args.sortOrder;
    if (sortOrder === undefined) {
      const folders = await ctx.db.query("systemTemplateFolders").collect();
      const maxSortOrder = folders.reduce((max, f) => Math.max(max, f.sortOrder), 0);
      sortOrder = maxSortOrder + 1;
    }

    const folderId = await ctx.db.insert("systemTemplateFolders", {
      name: args.name,
      description: args.description,
      sortOrder,
      isHidden: args.isHidden ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return folderId;
  },
});

/**
 * Update a system template folder (admin only)
 */
export const updateFolder = mutation({
  args: {
    folderId: v.id("systemTemplateFolders"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.deletedAt) {
      throw new Error("Folder not found");
    }

    const { folderId, ...updates } = args;

    await ctx.db.patch(folderId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return folderId;
  },
});

/**
 * Toggle folder visibility (admin only)
 */
export const toggleFolderVisibility = mutation({
  args: {
    folderId: v.id("systemTemplateFolders"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.deletedAt) {
      throw new Error("Folder not found");
    }

    await ctx.db.patch(args.folderId, {
      isHidden: !folder.isHidden,
      updatedAt: Date.now(),
    });

    return args.folderId;
  },
});

/**
 * Soft delete a folder (admin only)
 */
export const deleteFolder = mutation({
  args: {
    folderId: v.id("systemTemplateFolders"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const folder = await ctx.db.get(args.folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    await ctx.db.patch(args.folderId, {
      deletedAt: Date.now(),
    });

    // Optionally: move templates in this folder to null folderId
    const templates = await ctx.db
      .query("systemTemplates")
      .withIndex("by_folder_id", (q) => q.eq("folderId", args.folderId))
      .collect();

    for (const template of templates) {
      if (!template.deletedAt) {
        await ctx.db.patch(template._id, {
          folderId: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    return args.folderId;
  },
});

// ============================================================================
// TEMPLATE MUTATIONS (Admin only)
// ============================================================================

/**
 * Create a new system template (admin only)
 */
export const createSystemTemplate = mutation({
  args: {
    folderId: v.optional(v.id("systemTemplateFolders")),
    name: v.string(),
    description: v.optional(v.string()),
    pageSize: pageSizeValidator,
    orientation: v.union(v.literal("portrait"), v.literal("landscape")),
    margins: marginValidator,
    theme: v.optional(templateThemeValidator),
    backgroundColor: v.string(),
    elements: v.array(templateElementValidator),
    isHidden: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    originalSystemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();

    // Get highest sortOrder if not provided
    let sortOrder = args.sortOrder;
    if (sortOrder === undefined) {
      const templates = await ctx.db.query("systemTemplates").collect();
      const maxSortOrder = templates.reduce((max, t) => Math.max(max, t.sortOrder), 0);
      sortOrder = maxSortOrder + 1;
    }

    // If setting as default, clear other defaults
    if (args.isDefault) {
      await clearDefaultSystemTemplates(ctx);
    }

    const templateId = await ctx.db.insert("systemTemplates", {
      folderId: args.folderId,
      sortOrder,
      name: args.name,
      description: args.description,
      pageSize: args.pageSize,
      orientation: args.orientation,
      margins: args.margins,
      theme: args.theme,
      backgroundColor: args.backgroundColor,
      elements: args.elements,
      isHidden: args.isHidden ?? false,
      isDefault: args.isDefault ?? false,
      originalSystemId: args.originalSystemId,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

/**
 * Update a system template (admin only)
 */
export const updateSystemTemplate = mutation({
  args: {
    templateId: v.id("systemTemplates"),
    folderId: v.optional(v.id("systemTemplateFolders")),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    pageSize: v.optional(pageSizeValidator),
    orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
    margins: v.optional(marginValidator),
    theme: v.optional(templateThemeValidator),
    backgroundColor: v.optional(v.string()),
    elements: v.optional(v.array(templateElementValidator)),
    isHidden: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.deletedAt) {
      throw new Error("Template not found");
    }

    const { templateId, ...updates } = args;

    // If setting as default, clear other defaults first
    if (updates.isDefault === true && !template.isDefault) {
      await clearDefaultSystemTemplates(ctx);
    }

    await ctx.db.patch(templateId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

/**
 * Toggle system template visibility (admin only)
 */
export const toggleSystemTemplateVisibility = mutation({
  args: {
    templateId: v.id("systemTemplates"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.deletedAt) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      isHidden: !template.isHidden,
      updatedAt: Date.now(),
    });

    return args.templateId;
  },
});

/**
 * Soft delete a system template (admin only)
 */
export const deleteSystemTemplate = mutation({
  args: {
    templateId: v.id("systemTemplates"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      deletedAt: Date.now(),
      isDefault: false, // Clear default status on delete
    });

    return args.templateId;
  },
});

/**
 * Set a system template as the default (admin only)
 */
export const setDefaultSystemTemplate = mutation({
  args: {
    templateId: v.id("systemTemplates"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.deletedAt) {
      throw new Error("Template not found");
    }

    // Clear other defaults
    await clearDefaultSystemTemplates(ctx);

    // Set this template as default
    await ctx.db.patch(args.templateId, {
      isDefault: true,
      updatedAt: Date.now(),
    });

    return args.templateId;
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for seeding)
// ============================================================================

/**
 * Seed a system template (internal mutation for migration script)
 */
export const seedSystemTemplate = internalMutation({
  args: {
    folderId: v.optional(v.id("systemTemplateFolders")),
    name: v.string(),
    description: v.optional(v.string()),
    pageSize: pageSizeValidator,
    orientation: v.union(v.literal("portrait"), v.literal("landscape")),
    margins: marginValidator,
    theme: v.optional(templateThemeValidator),
    backgroundColor: v.string(),
    elements: v.array(templateElementValidator),
    isHidden: v.boolean(),
    isDefault: v.boolean(),
    sortOrder: v.number(),
    originalSystemId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if template with this originalSystemId already exists
    const existing = await ctx.db
      .query("systemTemplates")
      .filter((q) => q.eq(q.field("originalSystemId"), args.originalSystemId))
      .first();

    if (existing) {
      // Update existing template
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
        deletedAt: undefined, // Un-delete if previously deleted
      });
      return existing._id;
    }

    // Create new template
    const templateId = await ctx.db.insert("systemTemplates", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

/**
 * Seed a system template folder (internal mutation for migration script)
 */
export const seedSystemTemplateFolder = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isHidden: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if folder with this name already exists
    const existing = await ctx.db
      .query("systemTemplateFolders")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      // Update existing folder
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
        deletedAt: undefined, // Un-delete if previously deleted
      });
      return existing._id;
    }

    // Create new folder
    const folderId = await ctx.db.insert("systemTemplateFolders", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return folderId;
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Clear isDefault flag on all system templates
 */
async function clearDefaultSystemTemplates(
  ctx: { db: { query: (table: "systemTemplates") => any; patch: (id: Id<"systemTemplates">, updates: any) => Promise<void> } }
) {
  const templates = await ctx.db
    .query("systemTemplates")
    .withIndex("by_default", (q: any) => q.eq("isDefault", true))
    .collect();

  for (const template of templates) {
    if (!template.deletedAt) {
      await ctx.db.patch(template._id, {
        isDefault: false,
        updatedAt: Date.now(),
      });
    }
  }
}

// ============================================================================
// BULK MUTATIONS (Admin only)
// ============================================================================

/**
 * Result type for bulk operations
 */
export type BulkOperationResult = {
  successCount: number;
  failedCount: number;
  successIds: Id<"systemTemplates">[];
  failedIds: Id<"systemTemplates">[];
};

/**
 * Bulk delete system templates (soft delete)
 */
export const bulkDeleteSystemTemplates = mutation({
  args: {
    templateIds: v.array(v.id("systemTemplates")),
  },
  handler: async (ctx, args): Promise<BulkOperationResult> => {
    await requireAdmin(ctx);

    const result: BulkOperationResult = {
      successCount: 0,
      failedCount: 0,
      successIds: [],
      failedIds: [],
    };

    if (args.templateIds.length === 0) {
      return result;
    }

    const now = Date.now();

    for (const templateId of args.templateIds) {
      try {
        const template = await ctx.db.get(templateId);
        if (!template || template.deletedAt) {
          // Template doesn't exist or already deleted
          result.failedCount++;
          result.failedIds.push(templateId);
          continue;
        }

        await ctx.db.patch(templateId, {
          deletedAt: now,
          isDefault: false, // Clear default status on delete
        });

        result.successCount++;
        result.successIds.push(templateId);
      } catch {
        result.failedCount++;
        result.failedIds.push(templateId);
      }
    }

    return result;
  },
});

/**
 * Bulk move system templates to a folder
 */
export const bulkMoveTemplates = mutation({
  args: {
    templateIds: v.array(v.id("systemTemplates")),
    folderId: v.optional(v.id("systemTemplateFolders")),
  },
  handler: async (ctx, args): Promise<BulkOperationResult> => {
    await requireAdmin(ctx);

    const result: BulkOperationResult = {
      successCount: 0,
      failedCount: 0,
      successIds: [],
      failedIds: [],
    };

    if (args.templateIds.length === 0) {
      return result;
    }

    // Verify target folder exists if specified
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.deletedAt) {
        throw new Error("Target folder not found");
      }
    }

    const now = Date.now();

    for (const templateId of args.templateIds) {
      try {
        const template = await ctx.db.get(templateId);
        if (!template || template.deletedAt) {
          result.failedCount++;
          result.failedIds.push(templateId);
          continue;
        }

        await ctx.db.patch(templateId, {
          folderId: args.folderId,
          updatedAt: now,
        });

        result.successCount++;
        result.successIds.push(templateId);
      } catch {
        result.failedCount++;
        result.failedIds.push(templateId);
      }
    }

    return result;
  },
});

/**
 * Bulk update system template visibility
 */
export const bulkUpdateVisibility = mutation({
  args: {
    templateIds: v.array(v.id("systemTemplates")),
    isHidden: v.boolean(),
  },
  handler: async (ctx, args): Promise<BulkOperationResult> => {
    await requireAdmin(ctx);

    const result: BulkOperationResult = {
      successCount: 0,
      failedCount: 0,
      successIds: [],
      failedIds: [],
    };

    if (args.templateIds.length === 0) {
      return result;
    }

    const now = Date.now();

    for (const templateId of args.templateIds) {
      try {
        const template = await ctx.db.get(templateId);
        if (!template || template.deletedAt) {
          result.failedCount++;
          result.failedIds.push(templateId);
          continue;
        }

        await ctx.db.patch(templateId, {
          isHidden: args.isHidden,
          updatedAt: now,
        });

        result.successCount++;
        result.successIds.push(templateId);
      } catch {
        result.failedCount++;
        result.failedIds.push(templateId);
      }
    }

    return result;
  },
});

/**
 * Bulk update system template page size
 */
export const bulkUpdatePageSize = mutation({
  args: {
    templateIds: v.array(v.id("systemTemplates")),
    pageSize: pageSizeValidator,
  },
  handler: async (ctx, args): Promise<BulkOperationResult> => {
    await requireAdmin(ctx);

    const result: BulkOperationResult = {
      successCount: 0,
      failedCount: 0,
      successIds: [],
      failedIds: [],
    };

    if (args.templateIds.length === 0) {
      return result;
    }

    const now = Date.now();

    for (const templateId of args.templateIds) {
      try {
        const template = await ctx.db.get(templateId);
        if (!template || template.deletedAt) {
          result.failedCount++;
          result.failedIds.push(templateId);
          continue;
        }

        await ctx.db.patch(templateId, {
          pageSize: args.pageSize,
          updatedAt: now,
        });

        result.successCount++;
        result.successIds.push(templateId);
      } catch {
        result.failedCount++;
        result.failedIds.push(templateId);
      }
    }

    return result;
  },
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SystemTemplate = Doc<"systemTemplates">;
export type SystemTemplateFolder = Doc<"systemTemplateFolders">;
