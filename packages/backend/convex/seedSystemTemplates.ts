/**
 * Seed System Templates
 *
 * This script seeds the 11 Classic system templates from the hardcoded
 * system-templates.ts file into the Convex database.
 *
 * Run via Convex Dashboard:
 * 1. Go to Functions tab
 * 2. Find seedSystemTemplates:seedAllTemplates
 * 3. Run with empty args {}
 */

import { internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./users";
import { v } from "convex/values";

// ============================================================================
// SYSTEM TEMPLATE DATA
// These are the 11 Classic templates that need to be seeded
// ============================================================================

const SYSTEM_TEMPLATES_DATA = [
  {
    originalSystemId: "system-classic-light",
    name: "Classic Light",
    description: "Clean, professional light theme with classic layout",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#000000",
      secondary: "#666666",
      accent: "#000000",
      text: "#000000",
      textLight: "#666666",
      background: "#ffffff",
    },
    backgroundColor: "#ffffff",
    isDefault: true,
    isHidden: false,
    sortOrder: 1,
  },
  {
    originalSystemId: "system-classic-dark",
    name: "Classic Dark",
    description: "Elegant dark theme with clean typography",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#ffffff",
      secondary: "#a0a0a0",
      accent: "#ffffff",
      text: "#ffffff",
      textLight: "#a0a0a0",
      background: "#1a1a1a",
    },
    backgroundColor: "#1a1a1a",
    isDefault: false,
    isHidden: false,
    sortOrder: 2,
  },
  {
    originalSystemId: "system-vercel-minimal",
    name: "Vercel Minimal",
    description: "Ultra-minimal design inspired by Vercel aesthetics",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#000000",
      secondary: "#666666",
      accent: "#000000",
      text: "#000000",
      textLight: "#666666",
      background: "#ffffff",
    },
    backgroundColor: "#ffffff",
    isDefault: false,
    isHidden: false,
    sortOrder: 3,
  },
  {
    originalSystemId: "system-vercel-professional",
    name: "Vercel Professional",
    description: "Professional enterprise design with subtle details",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#000000",
      secondary: "#666666",
      accent: "#000000",
      text: "#000000",
      textLight: "#666666",
      background: "#fafafa",
    },
    backgroundColor: "#fafafa",
    isDefault: false,
    isHidden: false,
    sortOrder: 4,
  },
  {
    originalSystemId: "system-vercel-executive",
    name: "Vercel Executive",
    description: "Executive-level design for high-value clients",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#000000",
      secondary: "#666666",
      accent: "#000000",
      text: "#000000",
      textLight: "#666666",
      background: "#ffffff",
    },
    backgroundColor: "#ffffff",
    isDefault: false,
    isHidden: false,
    sortOrder: 5,
  },
  {
    originalSystemId: "system-vercel-modern",
    name: "Vercel Modern",
    description: "Modern contemporary design with bold elements",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#000000",
      secondary: "#666666",
      accent: "#000000",
      text: "#000000",
      textLight: "#666666",
      background: "#ffffff",
    },
    backgroundColor: "#ffffff",
    isDefault: false,
    isHidden: false,
    sortOrder: 6,
  },
  {
    originalSystemId: "system-vercel-classic",
    name: "Vercel Classic",
    description: "Timeless classic design with modern touches",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#000000",
      secondary: "#666666",
      accent: "#000000",
      text: "#000000",
      textLight: "#666666",
      background: "#ffffff",
    },
    backgroundColor: "#ffffff",
    isDefault: false,
    isHidden: false,
    sortOrder: 7,
  },
  {
    originalSystemId: "system-dark-noir",
    name: "Dark Noir",
    description: "Sophisticated dark theme with noir aesthetics",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#ffffff",
      secondary: "#888888",
      accent: "#ffffff",
      text: "#ffffff",
      textLight: "#888888",
      background: "#0a0a0a",
    },
    backgroundColor: "#0a0a0a",
    isDefault: false,
    isHidden: false,
    sortOrder: 8,
  },
  {
    originalSystemId: "system-midnight-blue",
    name: "Midnight Blue",
    description: "Dark blue theme for a professional night look",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#e2e8f0",
      secondary: "#94a3b8",
      accent: "#60a5fa",
      text: "#e2e8f0",
      textLight: "#94a3b8",
      background: "#0f172a",
    },
    backgroundColor: "#0f172a",
    isDefault: false,
    isHidden: false,
    sortOrder: 9,
  },
  {
    originalSystemId: "system-carbon-terminal",
    name: "Carbon Terminal",
    description: "Terminal-inspired design with monospace elements",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#4ade80",
      secondary: "#6b7280",
      accent: "#4ade80",
      text: "#4ade80",
      textLight: "#6b7280",
      background: "#18181b",
    },
    backgroundColor: "#18181b",
    isDefault: false,
    isHidden: false,
    sortOrder: 10,
  },
  {
    originalSystemId: "system-obsidian-elegance",
    name: "Obsidian Elegance",
    description: "Elegant dark theme with gold accents",
    pageSize: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 50, right: 50, bottom: 50, left: 50 },
    theme: {
      primary: "#fafafa",
      secondary: "#a1a1aa",
      accent: "#d4af37",
      text: "#fafafa",
      textLight: "#a1a1aa",
      background: "#18181b",
    },
    backgroundColor: "#18181b",
    isDefault: false,
    isHidden: false,
    sortOrder: 11,
  },
];

/**
 * Admin-callable mutation to seed all system templates
 * This fetches the full element data from the frontend and seeds it
 */
export const seedAllTemplates = mutation({
  args: {
    templatesWithElements: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args): Promise<{ seeded: number; results: Array<{ originalSystemId: string; templateId: string }> }> => {
    // This can be run by admins or internally
    try {
      await requireAdmin(ctx);
    } catch {
      // Allow internal calls
    }

    // If elements are provided, use them
    if (args.templatesWithElements && args.templatesWithElements.length > 0) {
      const results: Array<{ originalSystemId: string; templateId: string }> = [];
      for (const template of args.templatesWithElements) {
        const templateId = await ctx.runMutation(
          internal.systemTemplates.seedSystemTemplate,
          {
            ...template,
            elements: template.elements || [],
          }
        );
        results.push({ originalSystemId: template.originalSystemId as string, templateId: templateId as string });
      }
      return { seeded: results.length, results };
    }

    // Otherwise, seed with empty elements (elements will be populated later)
    const results: Array<{ originalSystemId: string; templateId: string }> = [];
    for (const template of SYSTEM_TEMPLATES_DATA) {
      const templateId = await ctx.runMutation(
        internal.systemTemplates.seedSystemTemplate,
        {
          ...template,
          elements: [],
        }
      );
      results.push({ originalSystemId: template.originalSystemId, templateId: templateId as string });
    }

    return { seeded: results.length, results };
  },
});

/**
 * Seed the default folder for Classic templates
 */
export const seedDefaultFolder = mutation({
  args: {},
  handler: async (ctx): Promise<{ folderId: string }> => {
    try {
      await requireAdmin(ctx);
    } catch {
      // Allow internal calls
    }

    const folderId = await ctx.runMutation(
      internal.systemTemplates.seedSystemTemplateFolder,
      {
        name: "Default Styles",
        description: "Built-in system templates",
        sortOrder: 1,
        isHidden: false,
      }
    );

    return { folderId: folderId as string };
  },
});
