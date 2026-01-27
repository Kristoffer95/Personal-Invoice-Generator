import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateUserFromIdentity, getUserFromIdentityOrE2E } from "./users";
import type { Id } from "./_generated/dataModel";

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
// QUERIES
// ============================================================================

/**
 * List all templates for the current user (exclude soft-deleted)
 */
export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return [];
    }

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    // Filter out soft-deleted templates
    return templates.filter((t) => !t.deletedAt);
  },
});

/**
 * Get a single template by ID
 */
export const getTemplate = query({
  args: {
    templateId: v.id("templates"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    const template = await ctx.db.get(args.templateId);

    // Verify ownership and not deleted
    if (!template || template.userId !== user._id || template.deletedAt) {
      return null;
    }

    return template;
  },
});

/**
 * Get the user's default template
 */
export const getDefaultTemplate = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return null;
    }

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_user_and_default", (q) =>
        q.eq("userId", user._id).eq("isDefault", true)
      )
      .collect();

    // Filter out soft-deleted templates and return the first one
    const defaultTemplate = templates.find((t) => !t.deletedAt);
    return defaultTemplate ?? null;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new template
 */
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    pageSize: pageSizeValidator,
    orientation: v.union(v.literal("portrait"), v.literal("landscape")),
    margins: marginValidator,
    theme: v.optional(templateThemeValidator),
    backgroundColor: v.string(),
    elements: v.array(templateElementValidator),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    // If this template is to be the default, clear other defaults first
    if (args.isDefault) {
      await clearOtherDefaults(ctx, user._id);
    }

    const templateId = await ctx.db.insert("templates", {
      userId: user._id,
      name: args.name,
      description: args.description,
      pageSize: args.pageSize,
      orientation: args.orientation,
      margins: args.margins,
      theme: args.theme,
      backgroundColor: args.backgroundColor,
      elements: args.elements,
      isDefault: args.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

/**
 * Update an existing template
 */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    pageSize: v.optional(pageSizeValidator),
    orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
    margins: v.optional(marginValidator),
    theme: v.optional(templateThemeValidator),
    backgroundColor: v.optional(v.string()),
    elements: v.optional(v.array(templateElementValidator)),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== user._id || template.deletedAt) {
      throw new Error("Template not found");
    }

    const { templateId, ...updates } = args;

    // If setting as default, clear other defaults first
    if (updates.isDefault === true && !template.isDefault) {
      await clearOtherDefaults(ctx, user._id);
    }

    await ctx.db.patch(templateId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

/**
 * Duplicate an existing Convex template
 */
export const duplicateTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    newName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== user._id || template.deletedAt) {
      throw new Error("Template not found");
    }

    const now = Date.now();
    const newName = args.newName ?? `${template.name} (Copy)`;

    // Generate new IDs for elements
    const newElements = template.elements.map((el) => ({
      ...el,
      id: `${now}-${Math.random().toString(36).substring(2, 9)}`,
    }));

    const newTemplateId = await ctx.db.insert("templates", {
      userId: user._id,
      name: newName,
      description: template.description,
      pageSize: template.pageSize,
      orientation: template.orientation,
      margins: template.margins,
      theme: template.theme,
      backgroundColor: template.backgroundColor,
      elements: newElements,
      isDefault: false, // Duplicates are never default
      createdAt: now,
      updatedAt: now,
    });

    return newTemplateId;
  },
});

/**
 * Create a new template from system template data
 * (System templates are defined in code, not in the database)
 */
export const duplicateFromSystemTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    pageSize: pageSizeValidator,
    orientation: v.union(v.literal("portrait"), v.literal("landscape")),
    margins: marginValidator,
    theme: v.optional(templateThemeValidator),
    backgroundColor: v.string(),
    elements: v.array(templateElementValidator),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    // Generate new IDs for elements
    const newElements = args.elements.map((el) => ({
      ...el,
      id: `${now}-${Math.random().toString(36).substring(2, 9)}`,
    }));

    const templateId = await ctx.db.insert("templates", {
      userId: user._id,
      name: args.name,
      description: args.description,
      pageSize: args.pageSize,
      orientation: args.orientation,
      margins: args.margins,
      theme: args.theme,
      backgroundColor: args.backgroundColor,
      elements: newElements,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

/**
 * Soft delete a template
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("templates"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== user._id) {
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
 * Set a template as the default
 */
export const setDefaultTemplate = mutation({
  args: {
    templateId: v.id("templates"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== user._id || template.deletedAt) {
      throw new Error("Template not found");
    }

    // Clear other defaults
    await clearOtherDefaults(ctx, user._id);

    // Set this template as default
    await ctx.db.patch(args.templateId, {
      isDefault: true,
      updatedAt: Date.now(),
    });

    return args.templateId;
  },
});

/**
 * Clear the default template (no template will be default)
 */
export const clearDefaultTemplate = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    await clearOtherDefaults(ctx, user._id);
  },
});

/**
 * Migrate templates from localStorage to Convex (one-time operation)
 */
export const migrateFromLocalStorage = mutation({
  args: {
    templates: v.array(
      v.object({
        id: v.string(), // Original localStorage ID (for reference)
        name: v.string(),
        description: v.optional(v.string()),
        pageSize: pageSizeValidator,
        orientation: v.union(v.literal("portrait"), v.literal("landscape")),
        margins: marginValidator,
        theme: v.optional(templateThemeValidator),
        backgroundColor: v.string(),
        elements: v.array(templateElementValidator),
        isDefault: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const results: { oldId: string; newId: Id<"templates"> }[] = [];

    // Find if there's already a default template
    const existingTemplates = await ctx.db
      .query("templates")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();
    const hasDefaultTemplate = existingTemplates.some((t) => t.isDefault && !t.deletedAt);

    for (const template of args.templates) {
      const templateId = await ctx.db.insert("templates", {
        userId: user._id,
        name: template.name,
        description: template.description,
        pageSize: template.pageSize,
        orientation: template.orientation,
        margins: template.margins,
        theme: template.theme,
        backgroundColor: template.backgroundColor,
        elements: template.elements,
        // Only set default if no existing default and this was marked as default
        isDefault: !hasDefaultTemplate && template.isDefault,
        createdAt: now,
        updatedAt: now,
      });

      results.push({ oldId: template.id, newId: templateId });
    }

    return results;
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Clear isDefault flag on all templates for a user
 */
async function clearOtherDefaults(
  ctx: { db: { query: (table: "templates") => any; patch: (id: Id<"templates">, updates: any) => Promise<void> } },
  userId: Id<"users">
) {
  const templates = await ctx.db
    .query("templates")
    .withIndex("by_user_and_default", (q: any) =>
      q.eq("userId", userId).eq("isDefault", true)
    )
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
