import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { getUserFromIdentityOrE2E } from "./users";

/**
 * All available permissions in the system.
 * Follows action:resource naming convention.
 */
export const PERMISSIONS = {
  // Invoice permissions
  READ_INVOICES: "read:invoices",
  WRITE_INVOICES: "write:invoices",
  DELETE_INVOICES: "delete:invoices",

  // Template permissions
  READ_TEMPLATES: "read:templates",
  WRITE_TEMPLATES: "write:templates",

  // Client permissions
  READ_CLIENTS: "read:clients",
  WRITE_CLIENTS: "write:clients",

  // Profile permissions
  READ_PROFILE: "read:profile",
  WRITE_PROFILE: "write:profile",

  // Admin permissions
  ADMIN_USERS: "admin:users",
  ADMIN_ROLES: "admin:roles",
  ADMIN_TEMPLATES: "admin:templates",
  ADMIN_SYSTEM: "admin:system",
} as const;

/**
 * Type for a valid permission string
 */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Check if a string is a valid permission
 */
export function isValidPermission(value: string): value is Permission {
  return Object.values(PERMISSIONS).includes(value as Permission);
}

/**
 * Get a user's role document from the database.
 * Returns null if user has no roleId or role doesn't exist.
 */
export async function getUserRoleDoc(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<Doc<"roles"> | null> {
  const user = await ctx.db.get(userId);
  if (!user || !user.roleId) {
    return null;
  }

  return await ctx.db.get(user.roleId);
}

/**
 * Check if a user has a specific permission.
 * Returns false if user has no role or permission is not found.
 *
 * IMPORTANT: This function checks BOTH roleId-based permissions AND legacy role field.
 * If user has role='admin' in legacy field, they get admin permissions regardless
 * of roleId state. This prevents catch-22 situations where admins with broken
 * roleId permissions cannot fix their own permissions.
 */
export async function hasPermission(
  ctx: QueryCtx,
  userId: Id<"users">,
  permission: Permission
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;

  // PRIORITY 1: Check legacy role='admin' field first
  // This ensures admins with broken roleId permissions can still access admin features
  if (user.role === "admin") {
    return true;
  }

  // PRIORITY 2: Check roleId-based permissions
  const role = await getUserRoleDoc(ctx, userId);
  if (role) {
    return role.permissions.includes(permission);
  }

  // PRIORITY 3: Fallback for users with legacy role='user' or no role
  // Grant basic user permissions
  if (user.role === "user" || !user.role) {
    const userPermissions: Permission[] = [
      PERMISSIONS.READ_INVOICES,
      PERMISSIONS.WRITE_INVOICES,
      PERMISSIONS.DELETE_INVOICES,
      PERMISSIONS.READ_TEMPLATES,
      PERMISSIONS.WRITE_TEMPLATES,
      PERMISSIONS.READ_CLIENTS,
      PERMISSIONS.WRITE_CLIENTS,
      PERMISSIONS.READ_PROFILE,
      PERMISSIONS.WRITE_PROFILE,
    ];
    return userPermissions.includes(permission);
  }

  return false;
}

/**
 * Check if the current authenticated user has a specific permission.
 */
export async function currentUserHasPermission(
  ctx: QueryCtx,
  permission: Permission
): Promise<boolean> {
  const userRef = await getUserFromIdentityOrE2E(ctx);
  if (!userRef) return false;

  return hasPermission(ctx, userRef._id, permission);
}

/**
 * Require that the current user has a specific permission.
 * Throws an error if permission is not granted.
 */
export async function requirePermission(
  ctx: QueryCtx,
  permission: Permission
): Promise<Doc<"users">> {
  const userRef = await getUserFromIdentityOrE2E(ctx);
  if (!userRef) {
    throw new Error("Unauthorized: Not authenticated");
  }

  const user = await ctx.db.get(userRef._id);
  if (!user) {
    throw new Error("Unauthorized: User not found");
  }

  const has = await hasPermission(ctx, userRef._id, permission);
  if (!has) {
    throw new Error(`Forbidden: Missing permission ${permission}`);
  }

  return user;
}

/**
 * Check if the current user is an admin.
 * Returns true if user has admin:system permission.
 */
export async function isAdminByPermission(ctx: QueryCtx): Promise<boolean> {
  return currentUserHasPermission(ctx, PERMISSIONS.ADMIN_SYSTEM);
}

/**
 * Require admin access (admin:system permission).
 * Throws an error if user is not an admin.
 */
export async function requireAdminByPermission(
  ctx: QueryCtx
): Promise<Doc<"users">> {
  return requirePermission(ctx, PERMISSIONS.ADMIN_SYSTEM);
}

// ============================================================================
// Queries
// ============================================================================

/**
 * List all roles. Admin only.
 */
export const listRoles = query({
  args: {},
  handler: async (ctx) => {
    // Check admin permission
    await requireAdminByPermission(ctx);

    const roles = await ctx.db
      .query("roles")
      .withIndex("by_sort_order")
      .collect();

    return roles;
  },
});

/**
 * Get the default role (for new users).
 */
export const getDefaultRole = query({
  args: {},
  handler: async (ctx) => {
    const role = await ctx.db
      .query("roles")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    return role;
  },
});

/**
 * Get a role by its name slug.
 */
export const getRoleByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const role = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    return role;
  },
});

/**
 * Get a user's role with permissions for the frontend.
 * Returns the role document with full permissions array.
 */
export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const userRef = await getUserFromIdentityOrE2E(ctx);
    if (!userRef) return null;

    const user = await ctx.db.get(userRef._id);
    if (!user) return null;

    // Get role from roleId if available
    let role: Doc<"roles"> | null = null;
    if (user.roleId) {
      role = await ctx.db.get(user.roleId);
    }

    // If no role from roleId, build a virtual role from legacy role field
    if (!role) {
      const isAdmin = user.role === "admin";
      const permissions: string[] = isAdmin
        ? Object.values(PERMISSIONS)
        : [
            PERMISSIONS.READ_INVOICES,
            PERMISSIONS.WRITE_INVOICES,
            PERMISSIONS.DELETE_INVOICES,
            PERMISSIONS.READ_TEMPLATES,
            PERMISSIONS.WRITE_TEMPLATES,
            PERMISSIONS.READ_CLIENTS,
            PERMISSIONS.WRITE_CLIENTS,
            PERMISSIONS.READ_PROFILE,
            PERMISSIONS.WRITE_PROFILE,
          ];

      return {
        user,
        role: {
          name: isAdmin ? "admin" : "user",
          displayName: isAdmin ? "Administrator" : "User",
          description: isAdmin
            ? "Full administrative access"
            : "Standard user access",
          permissions,
          isSystemRole: true,
          isDefault: !isAdmin,
          sortOrder: isAdmin ? 1 : 0,
        },
        permissions,
        isAdmin,
      };
    }

    return {
      user,
      role,
      permissions: role.permissions,
      isAdmin: role.permissions.includes(PERMISSIONS.ADMIN_SYSTEM),
    };
  },
});
