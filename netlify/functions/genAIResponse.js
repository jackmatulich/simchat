const { Anthropic } = require('@anthropic-ai/sdk');

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

exports.handler = async (event) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Parse the request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { messages, systemPrompt } = body;

    // Add debug logging
    console.log('Received request body:', JSON.stringify(body, null, 2));
    console.log('Messages type:', typeof messages);
    console.log('Messages value:', messages);
    console.log('Is array?', Array.isArray(messages));

    // Check for API key in environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Missing API key: Please set ANTHROPIC_API_KEY in your environment variables.',
        }),
      };
    }

    // Validate messages parameter
    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid request: messages parameter is required and must be an array',
          received: typeof messages,
        }),
      };
    }

    // Create Anthropic client with extended timeout
    const anthropic = new Anthropic({
      apiKey,
      timeout: 120000, // 2 minutes timeout
    });

    // Filter out error messages and empty messages
    const formattedMessages = messages
      .filter(
        (msg) =>
          msg.content && msg.content.trim() !== '' &&
          !msg.content.startsWith('Sorry, I encountered an error'),
      )
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
      }));

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

    // For background functions, we'll use non-streaming to avoid timeout issues
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 30000,
      system: finalSystemPrompt,
      messages: formattedMessages,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: response.content[0]?.text || '',
        type: 'content_block',
      }),
    };
  } catch (error) {
    console.error('Error in genAIResponse:', error);
    console.error('Error stack:', error.stack);
    
    let errorMessage = 'Failed to get AI response';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (error.message.includes('Connection error') || error.name === 'APIConnectionError') {
        errorMessage = 'Connection to Anthropic API failed. Please check your internet connection and API key.';
        statusCode = 503;
      } else if (error.message.includes('authentication')) {
        errorMessage = 'Authentication failed. Please check your Anthropic API key.';
        statusCode = 401;
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.name : undefined,
        stack: error.stack
      }),
    };
  }
}; 