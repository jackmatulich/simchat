import { defineSchema, defineTable } from "convex/server";
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

export default defineSchema({
  conversations: defineTable({
    title: v.string(),
    messages: v.array(messageValidator),
    // Legacy rows may omit this; new conversations always set it in `create`.
    createdAt: v.optional(v.number()),
    // WhatsApp integration fields
    source: v.optional(v.union(v.literal("web"), v.literal("whatsapp"))),
    userId: v.optional(v.id("users")),
    isGroupChat: v.optional(v.boolean()),
    whatsappGroupId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_source", ["source"]),

  users: defineTable({
    phoneNumber: v.string(),
    passwordHash: v.string(),
    isAuthenticated: v.boolean(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    displayName: v.optional(v.string()),
  }).index("by_phone", ["phoneNumber"]),

  whatsappSessions: defineTable({
    phoneNumber: v.string(),
    conversationContext: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    lastMessageAt: v.number(),
    isActive: v.boolean(),
  }).index("by_phone", ["phoneNumber"]),
});
