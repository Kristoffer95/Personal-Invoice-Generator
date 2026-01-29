import { mutation } from "./_generated/server";
import { PERMISSIONS, requireAdminByPermission } from "./roles";

/**
 * System roles with their permissions.
 * These are seeded on first run and can be updated via seedAllRoles.
 */
export const SYSTEM_ROLES = [
  {
    name: "user",
    displayName: "User",
    description: "Standard user with access to their own invoices, templates, and clients",
    permissions: [
      PERMISSIONS.READ_INVOICES,
      PERMISSIONS.WRITE_INVOICES,
      PERMISSIONS.DELETE_INVOICES,
      PERMISSIONS.READ_TEMPLATES,
      PERMISSIONS.WRITE_TEMPLATES,
      PERMISSIONS.READ_CLIENTS,
      PERMISSIONS.WRITE_CLIENTS,
      PERMISSIONS.READ_PROFILE,
      PERMISSIONS.WRITE_PROFILE,
    ],
    isSystemRole: true,
    isDefault: true,
    sortOrder: 0,
  },
  {
    name: "admin",
    displayName: "Administrator",
    description: "Full administrative access including user and system management",
    permissions: [
      // All user permissions
      PERMISSIONS.READ_INVOICES,
      PERMISSIONS.WRITE_INVOICES,
      PERMISSIONS.DELETE_INVOICES,
      PERMISSIONS.READ_TEMPLATES,
      PERMISSIONS.WRITE_TEMPLATES,
      PERMISSIONS.READ_CLIENTS,
      PERMISSIONS.WRITE_CLIENTS,
      PERMISSIONS.READ_PROFILE,
      PERMISSIONS.WRITE_PROFILE,
      // Admin permissions
      PERMISSIONS.ADMIN_USERS,
      PERMISSIONS.ADMIN_ROLES,
      PERMISSIONS.ADMIN_TEMPLATES,
      PERMISSIONS.ADMIN_SYSTEM,
    ],
    isSystemRole: true,
    isDefault: false,
    sortOrder: 1,
  },
] as const;

/**
 * Seed all system roles.
 * This mutation is idempotent - it can be run multiple times safely.
 * Existing roles are updated, new roles are created.
 *
 * Run this mutation from the Convex dashboard or via a script.
 */
export const seedAllRoles = mutation({
  args: {},
  handler: async (ctx) => {
    // This is a special case - if no roles exist yet, allow seeding without admin check
    // This enables initial setup before any admin users exist
    const existingRoles = await ctx.db.query("roles").collect();

    // If roles already exist, require admin permission to update them
    if (existingRoles.length > 0) {
      await requireAdminByPermission(ctx);
    }

    const now = Date.now();
    const results: { name: string; action: "created" | "updated" }[] = [];

    for (const roleData of SYSTEM_ROLES) {
      // Check if role already exists by name
      const existing = await ctx.db
        .query("roles")
        .withIndex("by_name", (q) => q.eq("name", roleData.name))
        .first();

      if (existing) {
        // Update existing role
        await ctx.db.patch(existing._id, {
          displayName: roleData.displayName,
          description: roleData.description,
          permissions: [...roleData.permissions],
          isSystemRole: roleData.isSystemRole,
          isDefault: roleData.isDefault,
          sortOrder: roleData.sortOrder,
          updatedAt: now,
        });
        results.push({ name: roleData.name, action: "updated" });
      } else {
        // Create new role
        await ctx.db.insert("roles", {
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
          permissions: [...roleData.permissions],
          isSystemRole: roleData.isSystemRole,
          isDefault: roleData.isDefault,
          sortOrder: roleData.sortOrder,
          createdAt: now,
          updatedAt: now,
        });
        results.push({ name: roleData.name, action: "created" });
      }
    }

    return {
      success: true,
      roles: results,
      message: `Seeded ${results.length} roles`,
    };
  },
});

/**
 * Get the default role ID.
 * Returns null if no default role exists (roles not seeded yet).
 */
export async function getDefaultRoleId(ctx: { db: { query: (table: "roles") => { withIndex: (index: "by_default", fn: (q: { eq: (field: "isDefault", value: boolean) => unknown }) => unknown) => { first: () => Promise<{ _id: string } | null> } } } }): Promise<string | null> {
  const role = await ctx.db
    .query("roles")
    .withIndex("by_default", (q) => q.eq("isDefault", true))
    .first();

  return role?._id ?? null;
}

/**
 * Get the admin role ID.
 * Returns null if admin role doesn't exist (roles not seeded yet).
 */
export async function getAdminRoleId(ctx: { db: { query: (table: "roles") => { withIndex: (index: "by_name", fn: (q: { eq: (field: "name", value: string) => unknown }) => unknown) => { first: () => Promise<{ _id: string } | null> } } } }): Promise<string | null> {
  const role = await ctx.db
    .query("roles")
    .withIndex("by_name", (q) => q.eq("name", "admin"))
    .first();

  return role?._id ?? null;
}
