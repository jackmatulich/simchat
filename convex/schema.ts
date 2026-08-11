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
  }),
});
