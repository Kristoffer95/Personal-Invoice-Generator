import { internalMutation, mutation } from "../_generated/server";

/**
 * Migration: Backfill roleId for all users who don't have one.
 *
 * This migration:
 * 1. Finds all users without a roleId
 * 2. Assigns them the default 'user' role
 *
 * NOTE: Admin users should be promoted using promoteToAdminByEmail
 * after this migration runs.
 *
 * The migration is idempotent - safe to run multiple times.
 */
export const migrateUsersToRoleId = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all role documents for lookup
    const roles = await ctx.db.query("roles").collect();
    const roleByName = new Map(roles.map((r) => [r.name, r._id]));

    if (roles.length === 0) {
      return {
        success: false,
        message: "No roles found in database. Run seedAllRoles first.",
        migratedCount: 0,
        skippedCount: 0,
        errorCount: 0,
      };
    }

    // Get all users
    const users = await ctx.db.query("users").collect();

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      // Skip deleted users
      if (user.deletedAt) {
        skippedCount++;
        continue;
      }

      // Skip users who already have a roleId
      if (user.roleId) {
        skippedCount++;
        continue;
      }

      // Users without roleId get the default 'user' role
      // Admin users should be promoted separately using promoteToAdminByEmail
      const roleName = "user";
      const roleId = roleByName.get(roleName);

      if (!roleId) {
        errors.push(`Role '${roleName}' not found for user ${user.email}`);
        errorCount++;
        continue;
      }

      // Update user with roleId
      await ctx.db.patch(user._id, { roleId });
      migratedCount++;
    }

    return {
      success: errorCount === 0,
      message:
        errorCount === 0
          ? `Migration complete. Migrated ${migratedCount} users, skipped ${skippedCount}.`
          : `Migration complete with errors. Migrated ${migratedCount}, skipped ${skippedCount}, errors: ${errorCount}`,
      migratedCount,
      skippedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * Public mutation to run the migration (requires admin permission).
 * This allows admins to run the migration from the frontend or dashboard.
 */
export const runMigrateUsersToRoleId = mutation({
  args: {},
  handler: async (ctx) => {
    // Import here to avoid circular dependencies
    const { requireAdmin } = await import("../users");
    await requireAdmin(ctx);

    // Get all role documents for lookup
    const roles = await ctx.db.query("roles").collect();
    const roleByName = new Map(roles.map((r) => [r.name, r._id]));

    if (roles.length === 0) {
      return {
        success: false,
        message: "No roles found in database. Run seedAllRoles first.",
        migratedCount: 0,
        skippedCount: 0,
        errorCount: 0,
      };
    }

    // Get all users
    const users = await ctx.db.query("users").collect();

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      // Skip deleted users
      if (user.deletedAt) {
        skippedCount++;
        continue;
      }

      // Skip users who already have a roleId
      if (user.roleId) {
        skippedCount++;
        continue;
      }

      // Users without roleId get the default 'user' role
      const roleName = "user";
      const roleId = roleByName.get(roleName);

      if (!roleId) {
        errors.push(`Role '${roleName}' not found for user ${user.email}`);
        errorCount++;
        continue;
      }

      // Update user with roleId
      await ctx.db.patch(user._id, { roleId });
      migratedCount++;
    }

    return {
      success: errorCount === 0,
      message:
        errorCount === 0
          ? `Migration complete. Migrated ${migratedCount} users, skipped ${skippedCount}.`
          : `Migration complete with errors. Migrated ${migratedCount}, skipped ${skippedCount}, errors: ${errorCount}`,
      migratedCount,
      skippedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * Dry run to see what would be migrated without making changes.
 */
export const dryRunMigrateUsersToRoleId = mutation({
  args: {},
  handler: async (ctx) => {
    // Import here to avoid circular dependencies
    const { requireAdmin } = await import("../users");
    await requireAdmin(ctx);

    // Get all role documents for lookup
    const roles = await ctx.db.query("roles").collect();
    const roleByName = new Map(roles.map((r) => [r.name, r._id]));

    if (roles.length === 0) {
      return {
        success: false,
        message: "No roles found in database. Run seedAllRoles first.",
        wouldMigrate: [],
        wouldSkip: 0,
        wouldError: [],
      };
    }

    // Get all users
    const users = await ctx.db.query("users").collect();

    const wouldMigrate: Array<{
      email: string;
      targetRoleId: string;
    }> = [];
    let wouldSkip = 0;
    const wouldError: Array<{ email: string; reason: string }> = [];

    for (const user of users) {
      // Skip deleted users
      if (user.deletedAt) {
        wouldSkip++;
        continue;
      }

      // Skip users who already have a roleId
      if (user.roleId) {
        wouldSkip++;
        continue;
      }

      // Users without roleId get the default 'user' role
      const roleName = "user";
      const roleId = roleByName.get(roleName);

      if (!roleId) {
        wouldError.push({
          email: user.email,
          reason: `Role '${roleName}' not found`,
        });
        continue;
      }

      wouldMigrate.push({
        email: user.email,
        targetRoleId: roleId,
      });
    }

    return {
      success: true,
      message: `Dry run complete. Would migrate ${wouldMigrate.length} users, skip ${wouldSkip}, ${wouldError.length} errors.`,
      wouldMigrate,
      wouldSkip,
      wouldError,
    };
  },
});
