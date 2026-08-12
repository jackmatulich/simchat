// force redeploy
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const attachmentValidator = v.object({
  id: v.string(),
  name: v.string(),
  mimeType: v.string(),
  kind: v.union(
    v.literal("scenario_json"),
    v.literal("text"),
    v.literal("pdf_document"),
  ),
  sizeBytes: v.number(),
  storageId: v.optional(v.id("_storage")),
});

const messageValidator = v.object({
  id: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  displayText: v.optional(v.string()),
  attachments: v.optional(v.array(attachmentValidator)),
  model: v.optional(v.string()),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  costUsd: v.optional(v.number()),
  costAud: v.optional(v.number()),
  exchangeRateAudPerUsd: v.optional(v.number()),
});

// Get all conversations
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("conversations")
      .order("desc")
      .collect();
  },
});

// Get a specific conversation
export const get = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new conversation
export const create = mutation({
  args: {
    title: v.string(),
    messages: v.optional(v.array(messageValidator)),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      title: args.title,
      messages: args.messages || [],
      createdAt: Date.now(),
    });
  },
});

// Update conversation title
export const updateTitle = mutation({
  args: {
    id: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { title: args.title });
  },
});

// Add a message to a conversation (original, for frontend compatibility)
export const addMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    message: messageValidator,
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const updatedMessages = [...conversation.messages, args.message];
    return await ctx.db.patch(args.conversationId, {
      messages: updatedMessages,
    });
  },
});

// Add a message to a conversation
export const addMessage2 = mutation({
  args: {
    conversationId: v.id("conversations"),
    message: messageValidator,
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const updatedMessages = [...conversation.messages, args.message];
    return await ctx.db.patch(args.conversationId, {
      messages: updatedMessages,
    });
  },
});

// Delete a conversation
export const remove = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Create conversation from WhatsApp
export const createFromWhatsApp = mutation({
  args: {
    title: v.string(),
    userId: v.id("users"),
    message: messageValidator,
    isGroupChat: v.optional(v.boolean()),
    whatsappGroupId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      title: args.title,
      messages: [args.message],
      createdAt: Date.now(),
      source: "whatsapp",
      userId: args.userId,
      isGroupChat: args.isGroupChat || false,
      whatsappGroupId: args.whatsappGroupId,
    });
  },
});

// Get conversations by user
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get conversations by source
export const getBySource = query({
  args: { source: v.union(v.literal("web"), v.literal("whatsapp")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .order("desc")
      .collect();
  },
});
