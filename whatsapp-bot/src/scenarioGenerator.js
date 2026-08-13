import { Anthropic } from '@anthropic-ai/sdk';
import { getSession } from './convexClient.js';
import promptModule from './defaultSystemPrompt.cjs';

const DEFAULT_SYSTEM_PROMPT = promptModule.DEFAULT_SYSTEM_PROMPT;

let anthropicClient = null;

function getAnthropicClient() {
  if (anthropicClient) return anthropicClient;
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY');
  }
  
  anthropicClient = new Anthropic({ apiKey, timeout: 900000 });
  return anthropicClient;
}

export async function generateScenario(phoneNumber, userMessage) {
  const session = await getSession(phoneNumber);
  
  const messages = [];
  if (session && session.conversationContext.length > 0) {
    for (const msg of session.conversationContext) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }
  
  messages.push({
    role: 'user',
    content: userMessage,
  });
  
  const anthropic = getAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  const maxTokens = parseInt(process.env.ANTHROPIC_MAX_OUTPUT_TOKENS || '32000', 10);
  
  console.log(`Calling Anthropic API with model: ${model}`);
  
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: DEFAULT_SYSTEM_PROMPT,
      messages,
    });
    
    const content = response.content[0]?.text || '';
    
    const usage = {
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    };
    
    const costs = computeCosts(model, response.usage);
    
    console.log(`API call complete. Input: ${usage.inputTokens}, Output: ${usage.outputTokens}`);
    
    return {
      content,
      model,
      usage,
      costs,
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    throw error;
  }
}

export function extractScenarioJson(content) {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                     content.match(/```\s*([\s\S]*?)\s*```/) ||
                     content.match(/(\{[\s\S]*\})/);
  
  if (!jsonMatch) {
    return null;
  }
  
  try {
    const jsonString = jsonMatch[1].trim();
    const parsed = JSON.parse(jsonString);
    
    if (parsed.scenarioId && parsed.scenarioName) {
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing JSON from response:', error);
    return null;
  }
}

export function isScenarioRequest(message) {
  const lowerMsg = message.toLowerCase();
  
  const scenarioKeywords = [
    'scenario', 'simulation', 'create', 'generate', 
    'patient', 'case', 'clinical', 'emergency',
    'make', 'build', 'design'
  ];
  
  const actionKeywords = ['create', 'generate', 'make', 'build', 'design', 'give me', 'i need', 'can you'];
  
  const hasScenarioKeyword = scenarioKeywords.some(kw => lowerMsg.includes(kw));
  const hasActionKeyword = actionKeywords.some(kw => lowerMsg.includes(kw));
  
  return hasScenarioKeyword && hasActionKeyword;
}

const MODEL_PRICING_USD_PER_MILLION = {
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
};

function computeCosts(model, usage) {
  if (!usage) return {};
  
  const inputTokens = (usage.input_tokens || 0) + 
                      (usage.cache_creation_input_tokens || 0) + 
                      (usage.cache_read_input_tokens || 0);
  const outputTokens = usage.output_tokens || 0;
  
  const pricing = MODEL_PRICING_USD_PER_MILLION[model];
  if (!pricing) {
    return { inputTokens, outputTokens };
  }
  
  const costUsd = (inputTokens / 1_000_000) * pricing.input + 
                  (outputTokens / 1_000_000) * pricing.output;
  
  const audPerUsd = parseFloat(process.env.USD_TO_AUD_RATE || '1.55');
  const costAud = costUsd * audPerUsd;
  
  return {
    inputTokens,
    outputTokens,
    costUsd,
    costAud,
    exchangeRateAudPerUsd: audPerUsd,
  };
}
