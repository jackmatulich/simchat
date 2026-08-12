import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const contextMessageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  timestamp: v.number(),
});

// Get session for a phone number
export const getSession = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
  },
});

// Create or get session
export const getOrCreateSession = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (existing) {
      return existing;
    }
    
    const sessionId = await ctx.db.insert("whatsappSessions", {
      phoneNumber: args.phoneNumber,
      conversationContext: [],
      lastMessageAt: Date.now(),
      isActive: true,
    });
    
    return await ctx.db.get(sessionId);
  },
});

// Add message to session context
export const addMessageToContext = mutation({
  args: {
    phoneNumber: v.string(),
    message: contextMessageValidator,
    maxContextLength: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    const maxLength = args.maxContextLength || 20;
    
    if (!session) {
      // Create new session with this message
      return await ctx.db.insert("whatsappSessions", {
        phoneNumber: args.phoneNumber,
        conversationContext: [args.message],
        lastMessageAt: Date.now(),
        isActive: true,
      });
    }
    
    // Append message and keep only last N messages
    const updatedContext = [...session.conversationContext, args.message]
      .slice(-maxLength);
    
    await ctx.db.patch(session._id, {
      conversationContext: updatedContext,
      lastMessageAt: Date.now(),
    });
    
    return session._id;
  },
});

// Clear session context (start fresh conversation)
export const clearSession = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, {
        conversationContext: [],
        lastMessageAt: Date.now(),
      });
    }
  },
});

// Mark session as inactive
export const deactivateSession = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, {
        isActive: false,
      });
    }
  },
});

// Reactivate session
export const reactivateSession = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, {
        isActive: true,
        lastMessageAt: Date.now(),
      });
    }
  },
});
