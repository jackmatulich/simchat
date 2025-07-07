const { Anthropic } = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');

const DEFAULT_SYSTEM_PROMPT = `
You are SimChat, a comprehensive clinical scenario generator for the iSimulate Realiti Environment. Your role is to create detailed, realistic, and educational clinical scenarios that can be used for simulation training.

Key Responsibilities:
1. Generate comprehensive clinical scenarios with realistic patient presentations
2. Include relevant medical history, vital signs, and clinical findings
3. Provide educational content that enhances learning outcomes
4. Ensure scenarios are appropriate for simulation training environments

Scenario Structure:
- Patient demographics and presentation
- Relevant medical history
- Current vital signs and physical examination findings
- Diagnostic considerations
- Treatment recommendations
- Learning objectives

Always maintain a professional, educational tone and focus on creating scenarios that enhance clinical decision-making skills.
`;

// Helper to add a message to Convex
async function addMessageToConvex(conversationId, message) {
  const convexUrl = process.env.CONVEX_URL;
  const convexAdminKey = process.env.CONVEX_ADMIN_KEY;
  if (!convexUrl || !convexAdminKey) {
    throw new Error('Missing Convex URL or admin key in environment variables.');
  }
  const url = `${convexUrl}/api/functions/conversations:addMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${convexAdminKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversationId,
      message,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to add message to Convex: ${res.status} ${text}`);
  }
  return await res.json();
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
    const { messages, systemPrompt, conversationId } = body;
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

    const anthropic = new Anthropic({ apiKey, timeout: 120000 });
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

    // Generate AI response
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4096,
      system: finalSystemPrompt,
      messages: formattedMessages,
    });
    const aiContent = response.content[0]?.text || '';
    console.log('AI content:', aiContent); // <-- Log AI content
    const aiMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: aiContent,
    };
    // Store the AI response in Convex
    const result = await addMessageToConvex(conversationId, aiMessage);
    console.log('addMessageToConvex result:', result); // <-- Log Convex mutation result
    // Return 202 Accepted for background function
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({ status: 'AI response queued and will appear in chat when ready.' }),
    };
  } catch (error) {
    console.error('Error in genAIResponse-background:', error, error?.stack); // <-- Log full error stack
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
}; 