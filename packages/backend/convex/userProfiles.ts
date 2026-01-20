import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOrCreateUserFromIdentity, getUserFromIdentityOrE2E } from "./users";

// Get the current user's profile
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userRef = await getUserFromIdentityOrE2E(ctx);
    if (!userRef) {
      return null;
    }

    const user = await ctx.db.get(userRef._id);
    if (!user) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    // Return combined user and profile data
    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      },
      profile: profile ?? null,
    };
  },
});

// Create or update user profile
export const upsert = mutation({
  args: {
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
    bankDetails: v.optional(
      v.object({
        bankName: v.optional(v.string()),
        accountName: v.optional(v.string()),
        accountNumber: v.optional(v.string()),
        routingNumber: v.optional(v.string()),
        swiftCode: v.optional(v.string()),
        iban: v.optional(v.string()),
      })
    ),
    invoicePrefix: v.optional(v.string()),
    nextInvoiceNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        ...args,
        updatedAt: now,
      });
      return existingProfile._id;
    } else {
      // Create new profile
      const profileId = await ctx.db.insert("userProfiles", {
        userId: user._id,
        displayName: args.displayName,
        businessName: args.businessName,
        address: args.address,
        city: args.city,
        state: args.state,
        postalCode: args.postalCode,
        country: args.country,
        email: args.email,
        phone: args.phone,
        taxId: args.taxId,
        logo: args.logo,
        bankDetails: args.bankDetails,
        invoicePrefix: args.invoicePrefix,
        nextInvoiceNumber: args.nextInvoiceNumber ?? 1,
        createdAt: now,
        updatedAt: now,
      });
      return profileId;
    }
  },
});

// Update invoice numbering settings
export const updateInvoiceNumbering = mutation({
  args: {
    invoicePrefix: v.optional(v.string()),
    nextInvoiceNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      // Create profile with just numbering settings
      return await ctx.db.insert("userProfiles", {
        userId: user._id,
        invoicePrefix: args.invoicePrefix,
        nextInvoiceNumber: args.nextInvoiceNumber,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(profile._id, {
      invoicePrefix: args.invoicePrefix,
      nextInvoiceNumber: args.nextInvoiceNumber,
      updatedAt: Date.now(),
    });

    return profile._id;
  },
});

// Get next invoice number and optionally increment
export const getNextInvoiceNumber = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromIdentityOrE2E(ctx);
    if (!user) {
      return { prefix: "", number: 1, formatted: "001" };
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    const prefix = profile?.invoicePrefix ?? "";
    const number = profile?.nextInvoiceNumber ?? 1;
    const paddedNumber = number.toString().padStart(3, "0");
    const formatted = prefix ? `${prefix}-${paddedNumber}` : paddedNumber;

    return { prefix, number, formatted };
  },
});

// Increment invoice number counter after creating an invoice
export const incrementInvoiceNumber = mutation({
  args: {},
  handler: async (ctx) => {
    // Auto-provision user if needed
    const user = await getOrCreateUserFromIdentity(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (!profile) {
      // Create profile with incremented number
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        nextInvoiceNumber: 2,
        createdAt: now,
        updatedAt: now,
      });
      return 2;
    }

    const newNumber = (profile.nextInvoiceNumber ?? 1) + 1;
    await ctx.db.patch(profile._id, {
      nextInvoiceNumber: newNumber,
      updatedAt: now,
    });

    return newNumber;
  },
});
