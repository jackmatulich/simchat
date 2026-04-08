import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  conversations: defineTable({
    title: v.string(),
    messages: v.array(
      v.object({
        id: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        model: v.optional(v.string()),
        inputTokens: v.optional(v.number()),
        outputTokens: v.optional(v.number()),
        costUsd: v.optional(v.number()),
        costAud: v.optional(v.number()),
        exchangeRateAudPerUsd: v.optional(v.number()),
      })
    ),
    createdAt: v.number(),
  }),
});