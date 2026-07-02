const { Anthropic } = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');
const { ConvexHttpClient } = require("convex/browser");

const { DEFAULT_SYSTEM_PROMPT } = require('../../src/shared/defaultSystemPrompt.cjs');

// Helper to add a message to Convex using the backend client
async function addMessageToConvex(conversationId, message) {
  const convexUrl = process.env.CONVEX_URL;
  const convexAdminKey = process.env.CONVEX_ADMIN_KEY;
  if (!convexUrl || !convexAdminKey) {
    throw new Error('Missing Convex URL or admin key in environment variables.');
  }
  // Use only .convex.cloud for backend client
  if (!convexUrl.endsWith('.convex.cloud')) {
    throw new Error('CONVEX_URL must end with .convex.cloud for backend client calls.');
  }
  const convex = new ConvexHttpClient(convexUrl, { adminKey: convexAdminKey });
  return await convex.mutation("conversations:addMessage", {
    conversationId,
    message,
  });
}

const MODEL_PRICING_USD_PER_MILLION = {
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  // Approximate; update when Anthropic publishes exact API rates for this snapshot
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
};

function extractTokenUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return { inputTokens: 0, outputTokens: 0 };
  }
  const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  const inputTokens =
    num(usage.input_tokens) +
    num(usage.cache_creation_input_tokens) +
    num(usage.cache_read_input_tokens);
  const outputTokens = num(usage.output_tokens);
  return { inputTokens, outputTokens };
}

function computeCosts(model, usage) {
  const { inputTokens, outputTokens } = extractTokenUsage(usage);
  const pricing = MODEL_PRICING_USD_PER_MILLION[model];
  if (!pricing) {
    return { inputTokens, outputTokens, costUsd: undefined, costAud: undefined };
  }
  const costUsd =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output;
  const audPerUsd = Number(process.env.USD_TO_AUD_RATE || '1.55');
  const safeAudRate = Number.isFinite(audPerUsd) && audPerUsd > 0 ? audPerUsd : 1.55;
  const costAud = costUsd * safeAudRate;
  return {
    inputTokens,
    outputTokens,
    costUsd,
    costAud,
    exchangeRateAudPerUsd: safeAudRate,
  };
}

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { messages, systemPrompt, conversationId, model } = body;
    console.log('Received request body:', JSON.stringify(body, null, 2));
    console.log('Messages type:', typeof messages);
    console.log('Messages value:', messages);
    console.log('Is array?', Array.isArray(messages));

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing API key: Please set ANTHROPIC_API_KEY in your environment variables.' }),
      };
    }
    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request: messages parameter is required and must be an array', received: typeof messages }),
      };
    }
    if (!conversationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing conversationId in request body.' }),
      };
    }

    const anthropic = new Anthropic({ apiKey, timeout: 900000 });
    const formattedMessages = messages
      .filter((msg) => msg.content && msg.content.trim() !== '' && !msg.content.startsWith('Sorry, I encountered an error'))
      .map((msg) => ({ role: msg.role, content: msg.content.trim() }));
    if (formattedMessages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid messages to send' }),
      };
    }
    const finalSystemPrompt = systemPrompt?.enabled
      ? `${DEFAULT_SYSTEM_PROMPT}\n\n${systemPrompt.value}`
      : DEFAULT_SYSTEM_PROMPT;

    // Generate AI response (body.model wins, then env, then Haiku default from upstream)
    const resolvedModel =
      (typeof model === 'string' && model.trim()) ||
      process.env.ANTHROPIC_MODEL ||
      'claude-haiku-4-5-20251001';
    // Default 32k: matches Opus 4 snapshot max output (see Anthropic models overview).
    // Sonnet 4 / Haiku 4.5 allow up to 64k — set ANTHROPIC_MAX_OUTPUT_TOKENS=64000 on Netlify if you only use those.
    const maxOutputTokens = (() => {
      const raw = process.env.ANTHROPIC_MAX_OUTPUT_TOKENS;
      if (raw === undefined || raw === '') return 32000;
      const n = Number.parseInt(String(raw), 10);
      return Number.isFinite(n) && n > 0 ? n : 32000;
    })();
    const response = await anthropic.messages.create({
      model: resolvedModel,
      max_tokens: maxOutputTokens,
      system: finalSystemPrompt,
      messages: formattedMessages,
    });
    const aiContent = response.content[0]?.text || '';
    const costInfo = computeCosts(resolvedModel, response.usage);
    const aiMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: aiContent,
      model: resolvedModel,
      inputTokens: costInfo.inputTokens,
      outputTokens: costInfo.outputTokens,
      costUsd: costInfo.costUsd,
      costAud: costInfo.costAud,
      exchangeRateAudPerUsd: costInfo.exchangeRateAudPerUsd,
    };
    // Store the AI response in Convex
    await addMessageToConvex(conversationId, aiMessage);
    // Return 202 Accepted for background function
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({ status: 'AI response queued and will appear in chat when ready.' }),
    };
  } catch (error) {
    console.error('Error in genAIResponse-background:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
}; 