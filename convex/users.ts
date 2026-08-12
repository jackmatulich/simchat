import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get user by phone number
export const getByPhone = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
  },
});

// Check if user is authenticated
export const isAuthenticated = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    return user?.isAuthenticated || false;
  },
});

// Create or update user
export const upsertUser = mutation({
  args: {
    phoneNumber: v.string(),
    passwordHash: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        passwordHash: args.passwordHash,
        isAuthenticated: true,
        lastActiveAt: Date.now(),
        ...(args.displayName && { displayName: args.displayName }),
      });
      return existing._id;
    }
    
    // Create new user
    return await ctx.db.insert("users", {
      phoneNumber: args.phoneNumber,
      passwordHash: args.passwordHash,
      isAuthenticated: true,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      displayName: args.displayName,
    });
  },
});

// Update last active timestamp
export const updateLastActive = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (user) {
      await ctx.db.patch(user._id, {
        lastActiveAt: Date.now(),
      });
    }
  },
});

// Revoke authentication (for security/reset)
export const revokeAuth = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (user) {
      await ctx.db.patch(user._id, {
        isAuthenticated: false,
      });
    }
  },
});
